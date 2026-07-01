import type { NextApiRequest, NextApiResponse } from "next";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchCodingData } from "@/lib/admin-coding";
import type { AdminCodingDataResponse } from "@/lib/admin-coding";
import type { ApiErrorResponse } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminCodingDataResponse | ApiErrorResponse>,
) {
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }

  try {
    const data = await fetchCodingData();
    res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch coding data";
    res.status(500).json({ ok: false, message });
  }
}
