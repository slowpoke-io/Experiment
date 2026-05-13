import type { NextApiRequest, NextApiResponse } from "next";

import {
  assignIV,
  cleanupAbandoned,
  resolveAllVariants,
} from "@/lib/assignment";
import { formatApiError, isUniqueViolation } from "@/lib/api-errors";
import {
  PIPELINE,
  PROLIFIC_COMPLETE_URL,
  PROLIFIC_FAIL_URL,
  buildStageResponse,
  participantStageAt,
  nowIso,
} from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ApiErrorResponse,
  InitRequestBody,
  ParticipantApiResponse,
  ProgressRecord,
} from "@/lib/types";

export type InitHandlerDeps = {
  cleanupAbandoned: typeof cleanupAbandoned;
  getSupabaseAdmin: typeof getSupabaseAdmin;
  assignIV: typeof assignIV;
  resolveAllVariants: typeof resolveAllVariants;
  participantStageAt: typeof participantStageAt;
  buildStageResponse: typeof buildStageResponse;
  nowIso: typeof nowIso;
  formatApiError: typeof formatApiError;
  isUniqueViolation: typeof isUniqueViolation;
  PIPELINE: typeof PIPELINE;
  PROLIFIC_COMPLETE_URL: string;
  PROLIFIC_FAIL_URL: string;
};

const defaultDeps: InitHandlerDeps = {
  cleanupAbandoned,
  getSupabaseAdmin,
  assignIV,
  resolveAllVariants,
  participantStageAt,
  buildStageResponse,
  nowIso,
  formatApiError,
  isUniqueViolation,
  PIPELINE,
  PROLIFIC_COMPLETE_URL,
  PROLIFIC_FAIL_URL,
};

export async function initHandler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
  deps: InitHandlerDeps = defaultDeps,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    await deps.cleanupAbandoned();

    const prolificId =
      typeof (req.body as InitRequestBody | undefined)?.prolificId === "string"
        ? (req.body as InitRequestBody).prolificId.trim()
        : "";

    if (!prolificId) {
      return res
        .status(400)
        .json({ ok: false, message: "prolificId required" });
    }

    const supabase = deps.getSupabaseAdmin();
    const loadProgress = async () => {
      const progressResult = await supabase
        .from("progress")
        .select("*")
        .eq("pipeline_code", deps.PIPELINE.code)
        .eq("prolific_id", prolificId)
        .maybeSingle();

      if (progressResult.error) {
        throw progressResult.error;
      }

      return progressResult.data;
    };

    const participantResult = await supabase
      .from("participants")
      .upsert({ prolific_id: prolificId });

    if (participantResult.error) {
      throw participantResult.error;
    }

    let progress = await loadProgress();

    if (!progress) {
      let iv1: string;
      let iv2: string;

      try {
        ({ iv1, iv2 } = await deps.assignIV(req.query));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid IV override";

        if (message.startsWith("Invalid iv")) {
          return res.status(400).json({ ok: false, message });
        }

        throw error;
      }

      const createdAt = deps.nowIso();

      const insertResult = await supabase.from("progress").insert({
        pipeline_code: deps.PIPELINE.code,
        prolific_id: prolificId,
        iv1,
        iv2,
        current_stage_index: 0,
        completed: false,
        failed: false,
        stage_variants: {},
        started_at: createdAt,
        updated_at: createdAt,
      });

      if (insertResult.error) {
        if (!isUniqueViolation(insertResult.error)) {
          throw insertResult.error;
        }
      }

      progress = await loadProgress();
    }

    const typedProgress = progress as ProgressRecord;

    if (typedProgress.completed) {
      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: deps.PROLIFIC_COMPLETE_URL,
      });
    }

    if (typedProgress.failed) {
      return res.json({
        ok: true,
        prolificId,
        failed: true,
        failed_stage_id: typedProgress.failed_stage_id,
        failed_reason: typedProgress.failed_reason,
        redirectUrl: deps.PROLIFIC_FAIL_URL,
      });
    }

    const stageVariants = await deps.resolveAllVariants(
      prolificId,
      typedProgress.stage_variants ?? {},
      req.query,
      typedProgress,
    );

    typedProgress.stage_variants = stageVariants;

    const stage = deps.participantStageAt(
      typedProgress,
      typedProgress.current_stage_index,
    );
    if (!stage) {
      const updateResult = await supabase
        .from("progress")
        .update({ completed: true, updated_at: deps.nowIso() })
        .eq("pipeline_code", deps.PIPELINE.code)
        .eq("prolific_id", prolificId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: deps.PROLIFIC_COMPLETE_URL,
      });
    }

    const variantId = stageVariants[stage.id];
    return res.json(deps.buildStageResponse(typedProgress, stage, variantId));
  } catch (error) {
    const message = deps.formatApiError(error);
    return res.status(500).json({ ok: false, message });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
) {
  return initHandler(req, res);
}
