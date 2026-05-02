import type { NextApiRequest, NextApiResponse } from "next";

import { PROLIFIC_NOCONSENT_URL } from "@/lib/pipeline";
import type { ApiErrorResponse } from "@/lib/types";

type DeclineResponse = {
  ok: true;
  redirectUrl: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeclineResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    return res.json({
      ok: true,
      redirectUrl: PROLIFIC_NOCONSENT_URL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
