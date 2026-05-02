import type { NextApiRequest, NextApiResponse } from "next";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminParticipantDetail } from "@/lib/admin-dashboard";
import type {
  AdminParticipantDetailResponse,
  ApiErrorResponse,
} from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminParticipantDetailResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const prolificId =
      typeof req.query.prolificId === "string" ? req.query.prolificId.trim() : "";

    if (!prolificId) {
      return res.status(400).json({ ok: false, message: "prolificId required" });
    }

    const participant = await fetchAdminParticipantDetail(prolificId);
    return res.json({ ok: true, participant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
