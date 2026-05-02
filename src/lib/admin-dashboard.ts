import { PIPELINE } from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AdminDurationStats,
  AdminDashboardResponse,
  AdminDashboardSummary,
  AdminDetailRow,
  AdminFeedbackContentSummary,
  AdminOverviewRow,
  AdminStatus,
  AdminStatusBreakdownCell,
} from "@/lib/types";

const STATUS_ORDER: AdminStatus[] = ["in_progress", "failed", "completed"];
const IV_VALUES = ["A", "B"];

function emptyBreakdown() {
  return IV_VALUES.flatMap((iv1) =>
    IV_VALUES.map(
      (iv2): AdminStatusBreakdownCell => ({
        iv1,
        iv2,
        count: 0,
      }),
    ),
  );
}

function buildEmptyDurationStats(): AdminDurationStats {
  return {
    count: 0,
    minSeconds: null,
    maxSeconds: null,
    averageSeconds: null,
  };
}

function buildEmptyFeedbackContentSummary(): AdminFeedbackContentSummary {
  return {
    total: 0,
    breakdown: emptyBreakdown(),
  };
}

function hasFeedbackContent(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("responses" in value)
  ) {
    return false;
  }

  const responses = value.responses;
  if (
    typeof responses !== "object" ||
    responses === null ||
    Array.isArray(responses) ||
    !("FEEDBACK_CONTENT" in responses)
  ) {
    return false;
  }

  const feedbackContent = (responses as Record<string, unknown>).FEEDBACK_CONTENT;
  return (
    typeof feedbackContent === "string" && feedbackContent.trim().length > 0
  );
}

export function buildSummary(
  rows: AdminOverviewRow[],
  prolificIdsWithFeedbackContent: Set<string> = new Set(),
): AdminDashboardSummary {
  const summary = STATUS_ORDER.reduce<AdminDashboardSummary>((acc, status) => {
    acc[status] = {
      status,
      total: 0,
      breakdown: emptyBreakdown(),
    };
    return acc;
  }, {
    completedDuration: buildEmptyDurationStats(),
    completedFeedbackContent: buildEmptyFeedbackContentSummary(),
  } as AdminDashboardSummary);

  const completedDurations: number[] = [];

  for (const row of rows) {
    const bucket = summary[row.status];
    bucket.total += 1;
    const cell = bucket.breakdown.find(
      (entry) => entry.iv1 === row.iv1 && entry.iv2 === row.iv2,
    );
    if (cell) {
      cell.count += 1;
    }

    if (row.status !== "completed") {
      continue;
    }

    if (typeof row.total_seconds === "number") {
      completedDurations.push(row.total_seconds);
    }

    if (!prolificIdsWithFeedbackContent.has(row.prolific_id)) {
      continue;
    }

    summary.completedFeedbackContent.total += 1;
    const feedbackCell = summary.completedFeedbackContent.breakdown.find(
      (entry) => entry.iv1 === row.iv1 && entry.iv2 === row.iv2,
    );
    if (feedbackCell) {
      feedbackCell.count += 1;
    }
  }

  if (completedDurations.length > 0) {
    const totalDuration = completedDurations.reduce(
      (accumulator, seconds) => accumulator + seconds,
      0,
    );
    summary.completedDuration = {
      count: completedDurations.length,
      minSeconds: Math.min(...completedDurations),
      maxSeconds: Math.max(...completedDurations),
      averageSeconds: Math.round(totalDuration / completedDurations.length),
    };
  }

  return summary;
}

export async function fetchAdminOverview(): Promise<AdminDashboardResponse> {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("admin_participant_overview")
    .select("*")
    .eq("pipeline_code", PIPELINE.code)
    .order("updated_at", { ascending: false });
  const feedbackResult = await supabase
    .from("submissions")
    .select("prolific_id, answers")
    .eq("pipeline_code", PIPELINE.code)
    .eq("stage_id", "stage_6");

  if (result.error) {
    throw result.error;
  }

  if (feedbackResult.error) {
    throw feedbackResult.error;
  }

  const rows = (result.data ?? []) as AdminOverviewRow[];
  const prolificIdsWithFeedbackContent = new Set(
    (feedbackResult.data ?? [])
      .filter((row) => hasFeedbackContent((row as Record<string, unknown>).answers))
      .map((row) => String((row as Record<string, unknown>).prolific_id)),
  );

  return {
    ok: true,
    rows,
    summary: buildSummary(rows, prolificIdsWithFeedbackContent),
  };
}

export async function fetchAdminParticipantDetail(prolificId: string) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("admin_participant_detail")
    .select("*")
    .eq("pipeline_code", PIPELINE.code)
    .eq("prolific_id", prolificId)
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as AdminDetailRow;
}
