import type { NextApiRequest, NextApiResponse } from "next";

import {
  PIPELINE,
  buildStageResponse,
  participantStageAt,
} from "@/lib/pipeline";
import { getProlificSettings } from "@/lib/prolific-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ApiErrorResponse,
  ParticipantApiResponse,
  ProgressRecord,
} from "@/lib/types";

export type CurrentStageHandlerDeps = {
  getSupabaseAdmin: typeof getSupabaseAdmin;
  getProlificSettings: typeof getProlificSettings;
  participantStageAt: typeof participantStageAt;
  buildStageResponse: typeof buildStageResponse;
  PIPELINE: typeof PIPELINE;
};

const defaultDeps: CurrentStageHandlerDeps = {
  getSupabaseAdmin,
  getProlificSettings,
  participantStageAt,
  buildStageResponse,
  PIPELINE,
};

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function currentStageHandler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
  deps: CurrentStageHandlerDeps = defaultDeps,
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

    const supabase = deps.getSupabaseAdmin();
    const settings = await deps.getProlificSettings(supabase);
    const { data, error } = await supabase
      .from("progress")
      .select("*")
      .eq("pipeline_code", settings.pipelineCode)
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
        redirectUrl: settings.completeUrl,
      });
    }

    if (progress.failed) {
      return res.json({
        ok: true,
        prolificId,
        failed: true,
        failed_stage_id: progress.failed_stage_id,
        failed_reason: progress.failed_reason,
        redirectUrl: settings.failUrl,
      });
    }

    const stage = deps.participantStageAt(progress, progress.current_stage_index);
    if (!stage) {
      return res.json({
        ok: true,
        prolificId,
        completed: true,
        redirectUrl: settings.completeUrl,
      });
    }

    const variantId = progress.stage_variants?.[stage.id];
    if (!variantId) {
      return res.status(500).json({
        ok: false,
        message: "variant not initialized, call /api/init first",
      });
    }

    return res.json(deps.buildStageResponse(progress, stage, variantId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipantApiResponse | ApiErrorResponse>,
) {
  return currentStageHandler(req, res);
}
