import type { NextApiRequest, NextApiResponse } from "next";

import { assignIV, cleanupAbandoned, resolveAllVariants } from "@/lib/assignment";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    await cleanupAbandoned();

    const prolificId =
      typeof (req.body as InitRequestBody | undefined)?.prolificId === "string"
        ? (req.body as InitRequestBody).prolificId.trim()
        : "";

    if (!prolificId) {
      return res
        .status(400)
        .json({ ok: false, message: "prolificId required" });
    }

    const supabase = getSupabaseAdmin();

    const participantResult = await supabase
      .from("participants")
      .upsert({ prolific_id: prolificId });

    if (participantResult.error) {
      throw participantResult.error;
    }

    const existingProgressResult = await supabase
      .from("progress")
      .select("*")
      .eq("pipeline_code", PIPELINE.code)
      .eq("prolific_id", prolificId)
      .maybeSingle();

    if (existingProgressResult.error) {
      throw existingProgressResult.error;
    }

    let progress = existingProgressResult.data;

    if (!progress) {
      const { iv1, iv2 } = await assignIV();

      const insertResult = await supabase.from("progress").insert({
        pipeline_code: PIPELINE.code,
        prolific_id: prolificId,
        iv1,
        iv2,
        current_stage_index: 0,
        completed: false,
        failed: false,
        stage_variants: {},
        started_at: nowIso(),
        updated_at: nowIso(),
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      const refreshedResult = await supabase
        .from("progress")
        .select("*")
        .eq("pipeline_code", PIPELINE.code)
        .eq("prolific_id", prolificId)
        .single();

      if (refreshedResult.error) {
        throw refreshedResult.error;
      }

      progress = refreshedResult.data;
    }

    const typedProgress = progress as ProgressRecord;

    if (typedProgress.completed) {
      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: PROLIFIC_COMPLETE_URL,
      });
    }

    if (typedProgress.failed) {
      return res.json({
        ok: true,
        prolificId,
        failed: true,
        failed_stage_id: typedProgress.failed_stage_id,
        failed_reason: typedProgress.failed_reason,
        redirectUrl: PROLIFIC_FAIL_URL,
      });
    }

    const stageVariants = await resolveAllVariants(
      prolificId,
      typedProgress.stage_variants ?? {},
      req.query,
      typedProgress,
    );

    typedProgress.stage_variants = stageVariants;

    const stage = participantStageAt(typedProgress, typedProgress.current_stage_index);
    if (!stage) {
      const updateResult = await supabase
        .from("progress")
        .update({ completed: true, updated_at: nowIso() })
        .eq("pipeline_code", PIPELINE.code)
        .eq("prolific_id", prolificId);

      if (updateResult.error) {
        throw updateResult.error;
      }

      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: PROLIFIC_COMPLETE_URL,
      });
    }

    const variantId = stageVariants[stage.id];
    return res.json(buildStageResponse(typedProgress, stage, variantId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
