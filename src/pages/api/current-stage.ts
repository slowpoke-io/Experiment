import type { NextApiRequest, NextApiResponse } from "next";

import {
  PIPELINE,
  PROLIFIC_COMPLETE_URL,
  PROLIFIC_FAIL_URL,
  buildStageResponse,
  participantStageAt,
} from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ApiErrorResponse,
  ParticipantApiResponse,
  ProgressRecord,
} from "@/lib/types";

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const prolificId = getQueryValue(req.query.prolificId)?.trim() ?? "";

    if (!prolificId) {
      return res
        .status(400)
        .json({ ok: false, message: "prolificId required" });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("progress")
      .select("*")
      .eq("pipeline_code", PIPELINE.code)
      .eq("prolific_id", prolificId)
      .single();

    if (error) {
      return res.status(404).json({ ok: false, message: "call /api/init first" });
    }

    const progress = data as ProgressRecord;

    if (progress.completed) {
      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: PROLIFIC_COMPLETE_URL,
      });
    }

    if (progress.failed) {
      return res.json({
        ok: true,
        prolificId,
        failed: true,
        failed_stage_id: progress.failed_stage_id,
        failed_reason: progress.failed_reason,
        redirectUrl: PROLIFIC_FAIL_URL,
      });
    }

    const stage = participantStageAt(progress, progress.current_stage_index);
    if (!stage) {
      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: PROLIFIC_COMPLETE_URL,
      });
    }

    const variantId = progress.stage_variants?.[stage.id];
    if (!variantId) {
      return res.status(500).json({
        ok: false,
        message: "variant not initialized, call /api/init first",
      });
    }

    return res.json(buildStageResponse(progress, stage, variantId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
