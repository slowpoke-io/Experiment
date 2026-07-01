import type { NextApiRequest, NextApiResponse } from "next";

import { getProlificSettings } from "@/lib/prolific-settings";
import type { ApiErrorResponse } from "@/lib/types";

type DeclineResponse = {
  ok: true;
  redirectUrl: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeclineResponse | ApiErrorResponse>,
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    const settings = await getProlificSettings();

    return res.json({
      ok: true,
      redirectUrl: settings.noconsentUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
