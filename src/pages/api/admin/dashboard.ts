import type { NextApiRequest, NextApiResponse } from "next";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminOverview } from "@/lib/admin-dashboard";
import type { AdminDashboardResponse, ApiErrorResponse } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminDashboardResponse | ApiErrorResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    const payload = await fetchAdminOverview();
    return res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
