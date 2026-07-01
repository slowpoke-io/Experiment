import type { NextApiRequest, NextApiResponse } from "next";

import { isFollowUpAuthorized } from "@/lib/follow-up-auth";
import {
  getProlificSettings,
  updateProlificSettings,
  type ProlificSettings,
} from "@/lib/prolific-settings";
import type { ApiErrorResponse } from "@/lib/types";

type FollowUpSettingsResponse = {
  ok: true;
  settings: {
    pipelineCode: string;
    completeCode: string;
    failCode: string;
    noconsentCode: string;
    studyOpen: boolean;
    completeUrl: string;
    failUrl: string;
    noconsentUrl: string;
  };
};

function toResponse(settings: ProlificSettings): FollowUpSettingsResponse {
  return {
    ok: true,
    settings: {
      pipelineCode: settings.pipelineCode,
      completeCode: settings.completeCode,
      failCode: settings.failCode,
      noconsentCode: settings.noconsentCode,
      studyOpen: settings.studyOpen,
      completeUrl: settings.completeUrl,
      failUrl: settings.failUrl,
      noconsentUrl: settings.noconsentUrl,
    },
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FollowUpSettingsResponse | ApiErrorResponse>,
) {
  try {
    if (!isFollowUpAuthorized(req)) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    if (req.method === "GET") {
      return res.json(toResponse(await getProlificSettings()));
    }

    if (req.method === "POST") {
      const completeCode =
        typeof req.body?.completeCode === "string" ? req.body.completeCode : "";
      const pipelineCode =
        typeof req.body?.pipelineCode === "string" ? req.body.pipelineCode : "";
      const failCode =
        typeof req.body?.failCode === "string" ? req.body.failCode : "";
      const noconsentCode =
        typeof req.body?.noconsentCode === "string"
          ? req.body.noconsentCode
          : "";
      const studyOpen = req.body?.studyOpen === true;

      const settings = await updateProlificSettings({
        pipelineCode,
        completeCode,
        failCode,
        noconsentCode,
        studyOpen,
      });

      return res.json(toResponse(settings));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
