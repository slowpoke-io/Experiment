import type { NextApiRequest, NextApiResponse } from "next";

import {
  PIPELINE,
  getParticipantStages,
  nowIso,
  stageIndexById,
} from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ApiErrorResponse, ProgressRecord } from "@/lib/types";

type JumpStageResponse = {
  ok: true;
  targetStageId: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JumpStageResponse | ApiErrorResponse>,
) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ ok: false, message: "Not available in production" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const prolificId =
      typeof req.body?.prolificId === "string" ? req.body.prolificId.trim() : "";
    const targetStageId =
      typeof req.body?.targetStageId === "string" ? req.body.targetStageId.trim() : "";

    if (!prolificId || !targetStageId) {
      return res.status(400).json({
        ok: false,
        message: "prolificId and targetStageId are required",
      });
    }

    const supabase = getSupabaseAdmin();
    const progressResult = await supabase
      .from("progress")
      .select("*")
      .eq("pipeline_code", PIPELINE.code)
      .eq("prolific_id", prolificId)
      .single();

    if (progressResult.error) {
      return res.status(404).json({ ok: false, message: "call /api/init first" });
    }

    const progress = progressResult.data as ProgressRecord;
    const participantStages = getParticipantStages(progress);
    const targetIndex = stageIndexById(targetStageId, progress);

    if (targetIndex < 0) {
      return res.status(400).json({
        ok: false,
        message: "target stage is not available for this participant",
      });
    }

    const resetStageIds = participantStages.slice(targetIndex).map((stage) => stage.id);

    if (resetStageIds.length > 0) {
      const deleteResult = await supabase
        .from("submissions")
        .delete()
        .eq("pipeline_code", PIPELINE.code)
        .eq("prolific_id", prolificId)
        .in("stage_id", resetStageIds);

      if (deleteResult.error) {
        throw deleteResult.error;
      }
    }

    const updateResult = await supabase
      .from("progress")
      .update({
        current_stage_index: targetIndex,
        completed: false,
        failed: false,
        failed_stage_id: null,
        failed_reason: null,
        total_seconds: null,
        started_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("pipeline_code", PIPELINE.code)
      .eq("prolific_id", prolificId);

    if (updateResult.error) {
      throw updateResult.error;
    }

    return res.json({ ok: true, targetStageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
