import { PIPELINE } from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminStatus } from "@/lib/types";

export type AdminCodingParticipant = {
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
  feedback_content: string | null;
};

export type AdminCodingDataResponse = {
  ok: true;
  participants: AdminCodingParticipant[];
};

type OverviewRow = {
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
};

type SubmissionRow = {
  prolific_id: string;
  created_at: string;
  answers: unknown;
};

const FEEDBACK_CONTENT_KEYS = ["FEEDBACK_CONTENT", "feedback_content", "feedback"] as const;

function extractFeedbackContent(answers: unknown): string | null {
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  const responses = (answers as Record<string, unknown>).responses;
  if (typeof responses !== "object" || responses === null || Array.isArray(responses)) return null;
  const r = responses as Record<string, unknown>;
  for (const key of FEEDBACK_CONTENT_KEYS) {
    const v = r[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export async function fetchCodingData(): Promise<AdminCodingDataResponse> {
  const supabase = getSupabaseAdmin();

  const [overviewResult, stage6Result] = await Promise.all([
    supabase
      .from("admin_participant_overview")
      .select("prolific_id,iv1,iv2,status,completed,failed")
      .eq("pipeline_code", PIPELINE.code),
    supabase
      .from("submissions")
      .select("prolific_id,created_at,answers")
      .eq("pipeline_code", PIPELINE.code)
      .eq("stage_id", "stage_6")
      .order("created_at", { ascending: false }),
  ]);

  if (overviewResult.error) throw overviewResult.error;
  if (stage6Result.error) throw stage6Result.error;

  const overviewRows = (overviewResult.data ?? []) as OverviewRow[];
  const stage6Rows = (stage6Result.data ?? []) as SubmissionRow[];

  // Keep only the latest submission per participant
  const feedbackByProlificId = new Map<string, string | null>();
  for (const row of stage6Rows) {
    if (!feedbackByProlificId.has(row.prolific_id)) {
      feedbackByProlificId.set(row.prolific_id, extractFeedbackContent(row.answers));
    }
  }

  const participants: AdminCodingParticipant[] = overviewRows
    .filter((row) => row.completed)
    .map((row) => ({
      prolific_id: row.prolific_id,
      iv1: row.iv1,
      iv2: row.iv2,
      status: row.status,
      completed: row.completed,
      failed: row.failed,
      feedback_content: feedbackByProlificId.get(row.prolific_id) ?? null,
    }));

  // Sort: completed first, then by prolific_id
  participants.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    return a.prolific_id.localeCompare(b.prolific_id);
  });

  return { ok: true, participants };
}
