import type { NextApiRequest, NextApiResponse } from "next";

import { setAdminSession, validateAdminPassword } from "@/lib/admin-auth";
import type { ApiErrorResponse } from "@/lib/types";

type AdminLoginResponse = {
  ok: true;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminLoginResponse | ApiErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!validateAdminPassword(password)) {
    return res.status(401).json({ ok: false, message: "Invalid password" });
  }

  setAdminSession(res);
  return res.json({ ok: true });
}
