import type { NextApiRequest, NextApiResponse } from "next";

import {
  PIPELINE,
  PROLIFIC_COMPLETE_URL,
  PROLIFIC_FAIL_URL,
  getParticipantStages,
  nowIso,
  participantStageAt,
} from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ApiErrorResponse,
  JsonObject,
  ProgressRecord,
  SubmitRequestBody,
  SubmitResponse,
} from "@/lib/types";
import { VALIDATORS } from "@/lib/validators";

export type SubmitHandlerDeps = {
  getSupabaseAdmin: typeof getSupabaseAdmin;
  VALIDATORS: typeof VALIDATORS;
  getParticipantStages: typeof getParticipantStages;
  participantStageAt: typeof participantStageAt;
  nowIso: typeof nowIso;
  PIPELINE: typeof PIPELINE;
  PROLIFIC_COMPLETE_URL: string;
  PROLIFIC_FAIL_URL: string;
};

const defaultDeps: SubmitHandlerDeps = {
  getSupabaseAdmin,
  VALIDATORS,
  getParticipantStages,
  participantStageAt,
  nowIso,
  PIPELINE,
  PROLIFIC_COMPLETE_URL,
  PROLIFIC_FAIL_URL,
};

const ABANDON_TIMEOUT_SECONDS = 30 * 60;

function isAnswersRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function submitHandler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitResponse | ApiErrorResponse>,
  deps: SubmitHandlerDeps = defaultDeps,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as Partial<SubmitRequestBody>;
    const prolificId = typeof body.prolificId === "string" ? body.prolificId.trim() : "";
    const stageId = typeof body.stageId === "string" ? body.stageId.trim() : "";
    const answers = body.answers;
    const clientStageSeconds = Number(body.meta?.stageSeconds);

    if (!prolificId || !stageId || !isAnswersRecord(answers)) {
      return res.status(400).json({
        ok: false,
        message: "prolificId, stageId, answers required",
      });
    }

    const supabase = deps.getSupabaseAdmin();
    const progressResult = await supabase
      .from("progress")
      .select("*")
      .eq("pipeline_code", deps.PIPELINE.code)
      .eq("prolific_id", prolificId)
      .single();

    if (progressResult.error) {
      return res.status(404).json({ ok: false, message: "call /api/init first" });
    }

    const progress = progressResult.data as ProgressRecord;

    if (progress.completed) {
      return res.status(409).json({ ok: false, message: "already completed" });
    }

    if (progress.failed) {
      return res.json({
        ok: true,
        passed: false,
        completed: false,
        lockedOut: true,
        nextStageId: null,
        redirectUrl: deps.PROLIFIC_FAIL_URL,
        verdict: progress.failed_reason ?? { reason: "locked_out" },
      });
    }

    const participantStages = deps.getParticipantStages(progress);
    const stage = deps.participantStageAt(progress, progress.current_stage_index);
    if (!stage) {
      return res.status(409).json({ ok: false, message: "already completed" });
    }

    if (stage.id !== stageId) {
      return res.status(403).json({ ok: false, message: "stage locked" });
    }

    const duplicateResult = await supabase
      .from("submissions")
      .select("id")
      .eq("pipeline_code", deps.PIPELINE.code)
      .eq("stage_id", stageId)
      .eq("prolific_id", prolificId)
      .maybeSingle();

    if (duplicateResult.error) {
      throw duplicateResult.error;
    }

    if (duplicateResult.data) {
      return res
        .status(409)
        .json({ ok: false, message: "already submitted this stage" });
    }

    const variantId = progress.stage_variants?.[stage.id];
    if (!variantId) {
      return res.status(500).json({
        ok: false,
        message: "variant not initialized, call /api/init first",
      });
    }

    const validatorName = stage.validator[variantId];
    if (!validatorName) {
      throw new Error(`validator not configured for ${stage.id}/${variantId}`);
    }

    const validator = deps.VALIDATORS[validatorName];
    if (!validator) {
      throw new Error(`validator not found: ${validatorName}`);
    }

    const variantParams = stage.params?.[variantId];
    const params =
      variantParams &&
      typeof variantParams === "object" &&
      !Array.isArray(variantParams) &&
      validatorName in variantParams
        ? (variantParams[validatorName] as JsonObject)
        : undefined;
    const { passed, verdict } = validator(
      { iv1: progress.iv1, iv2: progress.iv2 },
      answers,
      params,
    );

    const startedAt = progress.started_at ? new Date(progress.started_at) : null;
    const totalSeconds = startedAt
      ? Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000))
      : null;
    const stageSeconds = Number.isFinite(clientStageSeconds)
      ? Math.max(0, Math.min(86400, Math.round(clientStageSeconds)))
      : null;
    const timedOut =
      totalSeconds !== null && totalSeconds > ABANDON_TIMEOUT_SECONDS;

    const insertResult = await supabase.from("submissions").insert({
      pipeline_code: deps.PIPELINE.code,
      stage_id: stageId,
      variant_id: variantId,
      prolific_id: prolificId,
      answers,
      passed,
      verdict,
      stage_seconds: stageSeconds,
    });

    if (insertResult.error) {
      throw insertResult.error;
    }

    if (timedOut) {
      const timeoutVerdict = {
        reason: "timeout",
        cutoff_minutes: ABANDON_TIMEOUT_SECONDS / 60,
        total_seconds: totalSeconds,
      } satisfies JsonObject;

      const updateResult = await supabase
        .from("progress")
        .update({
          failed: true,
          failed_reason: timeoutVerdict,
          ...(totalSeconds !== null ? { total_seconds: totalSeconds } : {}),
          updated_at: deps.nowIso(),
        })
        .eq("pipeline_code", deps.PIPELINE.code)
        .eq("prolific_id", prolificId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      return res.json({
        ok: true,
        passed: false,
        completed: false,
        lockedOut: true,
        nextStageId: null,
        redirectUrl: deps.PROLIFIC_FAIL_URL,
        verdict: timeoutVerdict,
      });
    }

    if (!passed) {
      const updateResult = await supabase
        .from("progress")
        .update({
          failed: true,
          failed_stage_id: stageId,
          failed_reason: verdict,
          ...(totalSeconds !== null ? { total_seconds: totalSeconds } : {}),
          updated_at: deps.nowIso(),
        })
        .eq("pipeline_code", deps.PIPELINE.code)
        .eq("prolific_id", prolificId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      return res.json({
        ok: true,
        passed: false,
        completed: false,
        lockedOut: true,
        nextStageId: null,
        redirectUrl: deps.PROLIFIC_FAIL_URL,
        verdict,
      });
    }

    const nextIndex = progress.current_stage_index + 1;
    const completed = nextIndex >= participantStages.length;
    const updatePayload = {
      current_stage_index: completed ? progress.current_stage_index : nextIndex,
      completed,
      updated_at: deps.nowIso(),
      ...(completed && totalSeconds !== null
        ? { total_seconds: totalSeconds }
        : {}),
    };

    const updateResult = await supabase
      .from("progress")
      .update(updatePayload)
      .eq("pipeline_code", deps.PIPELINE.code)
      .eq("prolific_id", prolificId);

    if (updateResult.error) {
      throw updateResult.error;
    }

    return res.json({
      ok: true,
      passed: true,
      completed,
      nextStageId: completed ? null : participantStages[nextIndex].id,
      redirectUrl: completed ? deps.PROLIFIC_COMPLETE_URL : null,
      verdict,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitResponse | ApiErrorResponse>,
) {
  return submitHandler(req, res);
}
