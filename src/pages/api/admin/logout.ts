import type { NextApiRequest, NextApiResponse } from "next";

import { clearAdminSession } from "@/lib/admin-auth";
import type { ApiErrorResponse } from "@/lib/types";

type AdminLogoutResponse = {
  ok: true;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminLogoutResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    clearAdminSession(res);
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
