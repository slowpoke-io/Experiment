import type { NextApiRequest, NextApiResponse } from "next";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminFeedback } from "@/lib/admin-feedback";
import type { AdminFeedbackResponse, ApiErrorResponse } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminFeedbackResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const payload = await fetchAdminFeedback();
    return res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
