import type { NextApiRequest, NextApiResponse } from "next";

import { isFollowUpAuthorized } from "@/lib/follow-up-auth";
import { fetchFollowUpResults } from "@/lib/follow-up-results";
import { getProlificSettings } from "@/lib/prolific-settings";
import type { AdminDashboardSummary, ApiErrorResponse, AdminStatus } from "@/lib/types";

type FollowUpResultsResponse = {
  ok: true;
  activePipelineCode: string;
  availablePipelineCodes: string[];
  selectedPipelineCodes: string[];
  summary: AdminDashboardSummary;
  rows: Array<{
    pipelineCode: string;
    prolificId: string;
    status: AdminStatus;
    iv1: string;
    iv2: string;
    lastSubmissionAt: string | null;
    totalSeconds: number | null;
    failureReasonText: string;
    hasFeedback: boolean;
    feedbackContent: string;
    feedbackReason: string;
    answerGroups: Array<{
      stageId: string;
      entries: Array<{
        label: string;
        value: string;
      }>;
    }>;
  }>;
};

function getRequestedPipelineCodes(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" ? [value] : [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FollowUpResultsResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    if (!isFollowUpAuthorized(req)) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const settings = await getProlificSettings();
    const requestedPipelineCodes = getRequestedPipelineCodes(req.query.pipeline);
    const results = await fetchFollowUpResults(
      settings.pipelineCode,
      requestedPipelineCodes,
    );

    return res.json({
      ok: true,
      activePipelineCode: results.activePipelineCode,
      availablePipelineCodes: results.availablePipelineCodes,
      selectedPipelineCodes: results.selectedPipelineCodes,
      summary: results.summary,
      rows: results.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
