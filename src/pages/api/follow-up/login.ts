import type { NextApiRequest, NextApiResponse } from "next";

import {
  setFollowUpSession,
  validateFollowUpPassword,
} from "@/lib/follow-up-auth";
import type { ApiErrorResponse } from "@/lib/types";

type FollowUpLoginResponse = {
  ok: true;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<FollowUpLoginResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!validateFollowUpPassword(password)) {
      return res.status(401).json({ ok: false, message: "Invalid password" });
    }

    setFollowUpSession(res);
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
