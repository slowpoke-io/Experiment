import type { NextApiRequest, NextApiResponse } from "next";

import { fetchAdminStatistics } from "@/lib/admin-statistics";
import { isFollowUpAuthorized } from "@/lib/follow-up-auth";
import { buildFollowUpExportCsv } from "@/lib/follow-up-results";
import { getProlificSettings } from "@/lib/prolific-settings";
import type { ApiErrorResponse } from "@/lib/types";

function getScope(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "completed" ? "completed" : "all";
}

function getRequestedPipelineCodes(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" ? [value] : [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    if (!isFollowUpAuthorized(req)) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const scope = getScope(req.query.scope);
    const settings = await getProlificSettings();
    const requestedPipelineCodes = getRequestedPipelineCodes(req.query.pipeline);
    const pipelineCodes =
      requestedPipelineCodes.length > 0 ? requestedPipelineCodes : [settings.pipelineCode];
    const stats = await fetchAdminStatistics(pipelineCodes);
    const csv = buildFollowUpExportCsv(stats, scope);
    const filename =
      pipelineCodes.length === 1
        ? `${pipelineCodes[0]}_${scope}.csv`
        : `pipelines_${scope}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
