import { PIPELINE } from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminFeedbackResponse, AdminFeedbackRow } from "@/lib/types";

type SubmissionLookupRow = {
  prolific_id: string;
  created_at: string;
  answers: unknown;
};

type FeedbackOverviewRow = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminFeedbackRow["status"];
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
};

const FEEDBACK_CONTENT_KEYS = [
  "FEEDBACK_CONTENT",
  "feedback_content",
  "feedback",
] as const;

const FEEDBACK_REASON_KEYS = [
  "FEEDBACK_REASON",
  "feedback_reason",
] as const;

function getResponses(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("responses" in value)
  ) {
    return null;
  }

  const responses = (value as Record<string, unknown>).responses;
  if (
    typeof responses !== "object" ||
    responses === null ||
    Array.isArray(responses)
  ) {
    return null;
  }

  return responses as Record<string, unknown>;
}

function getFirstNonEmptyString(
  source: Record<string, unknown> | null,
  keys: readonly string[],
) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function buildLatestSubmissionMap(rows: SubmissionLookupRow[]) {
  const byProlificId = new Map<string, SubmissionLookupRow>();

  for (const row of rows) {
    if (!byProlificId.has(row.prolific_id)) {
      byProlificId.set(row.prolific_id, row);
    }
  }

  return byProlificId;
}

export async function fetchAdminFeedback(): Promise<AdminFeedbackResponse> {
  const supabase = getSupabaseAdmin();

  const [overviewResult, stage6Result, stage7Result] = await Promise.all([
    supabase
      .from("admin_participant_overview")
      .select(
        [
          "pipeline_code",
          "prolific_id",
          "iv1",
          "iv2",
          "status",
          "completed",
          "failed",
          "failed_stage_id",
          "started_at",
          "updated_at",
          "total_seconds",
        ].join(","),
      )
      .eq("pipeline_code", PIPELINE.code),
    supabase
      .from("submissions")
      .select("prolific_id, created_at, answers")
      .eq("pipeline_code", PIPELINE.code)
      .eq("stage_id", "stage_6")
      .order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("prolific_id, created_at, answers")
      .eq("pipeline_code", PIPELINE.code)
      .eq("stage_id", "stage_7")
      .order("created_at", { ascending: false }),
  ]);

  if (overviewResult.error) {
    throw overviewResult.error;
  }

  if (stage6Result.error) {
    throw stage6Result.error;
  }

  if (stage7Result.error) {
    throw stage7Result.error;
  }

  const overviewRows = (overviewResult.data ?? []) as unknown as FeedbackOverviewRow[];
  const stage6Rows = (stage6Result.data ?? []) as SubmissionLookupRow[];
  const stage7Rows = (stage7Result.data ?? []) as SubmissionLookupRow[];

  const stage6ByProlificId = buildLatestSubmissionMap(stage6Rows);
  const stage7ByProlificId = buildLatestSubmissionMap(stage7Rows);

  const rows: AdminFeedbackRow[] = overviewRows
    .map((overviewRow) => {
      const stage6Row = stage6ByProlificId.get(overviewRow.prolific_id);
      const stage7Row = stage7ByProlificId.get(overviewRow.prolific_id);
      const feedbackContent = getFirstNonEmptyString(
        getResponses(stage6Row?.answers),
        FEEDBACK_CONTENT_KEYS,
      );

      const feedbackReason = getFirstNonEmptyString(
        getResponses(stage7Row?.answers),
        FEEDBACK_REASON_KEYS,
      );

      if (!feedbackContent && !feedbackReason) {
        return null;
      }

      return {
        ...overviewRow,
        feedback_content: feedbackContent,
        feedback_reason: feedbackReason,
        feedback_submitted_at: stage6Row?.created_at ?? null,
        reason_submitted_at: stage7Row?.created_at ?? null,
      };
    })
    .filter((row): row is AdminFeedbackRow => row !== null)
    .sort((left, right) => {
      const leftTime = left.feedback_submitted_at ?? left.reason_submitted_at ?? "";
      const rightTime = right.feedback_submitted_at ?? right.reason_submitted_at ?? "";
      return rightTime.localeCompare(leftTime);
    });

  return {
    ok: true,
    rows,
  };
}
