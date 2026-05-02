import type { NextApiRequest, NextApiResponse } from "next";

type HealthzResponse = {
  ok: true;
  status: "healthy";
};

type HealthzErrorResponse = {
  ok: false;
  message: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthzResponse | HealthzErrorResponse>,
) {
  try {
    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    return res.status(200).json({
      ok: true,
      status: "healthy",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message });
  }
}
