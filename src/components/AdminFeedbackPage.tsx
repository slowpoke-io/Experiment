import { useMemo, useState } from "react";

import Link from "next/link";

import type {
  AdminFeedbackResponse,
  AdminFeedbackRow,
  AdminStatus,
  ApiErrorResponse,
} from "@/lib/types";

type AdminFeedbackPageProps = {
  initialData: AdminFeedbackResponse;
  onLogout: () => void;
};

type OrderField =
  | "feedback_submitted_at"
  | "reason_submitted_at"
  | "updated_at"
  | "total_seconds"
  | "prolific_id";

type OrderDirection = "asc" | "desc";

const statusMeta: Record<AdminStatus, { label: string; chipClass: string }> = {
  in_progress: {
    label: "In Progress",
    chipClass: "border-amber-300 bg-amber-100 text-amber-800",
  },
  failed: {
    label: "Failed",
    chipClass: "border-red-300 bg-red-100 text-red-800",
  },
  completed: {
    label: "Completed",
    chipClass: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function truncate(text: string | null, max = 140) {
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/* ── Summary card ── */

function SummaryCard({
  label,
  total,
  byIv1,
  active,
  onClick,
}: {
  label: string;
  total: number;
  byIv1: { A: number; B: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[1.75rem] border p-5 text-left transition",
        active
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-400",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${active ? "text-slate-400" : "text-slate-500"}`}
          >
            {label}
          </div>
          <div className="mt-1.5 text-4xl font-semibold tracking-tight">
            {total}
          </div>
        </div>
        <span
          className={`text-xs font-semibold ${active ? "text-slate-400" : "text-slate-400"}`}
        >
          {active ? "Active" : "Filter"}
        </span>
      </div>
      <div
        className={`mt-4 grid grid-cols-2 gap-2 text-sm ${active ? "text-slate-200" : "text-slate-600"}`}
      >
        {(["A", "B"] as const).map((iv1) => (
          <div
            key={iv1}
            className="rounded-xl border border-current/10 px-3 py-2.5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em]">
              IV1 {iv1}
            </div>
            <div className="mt-0.5 text-xl font-semibold">{byIv1[iv1]}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ── Compact feedback list item ── */

function FeedbackListItem({
  row,
  onView,
}: {
  row: AdminFeedbackRow;
  onView: () => void;
}) {
  const hasContent = !!row.feedback_content?.trim().length;
  const hasReason = !!row.feedback_reason?.trim().length;
  const preview = truncate(row.feedback_content);

  return (
    <div className="flex min-w-0 items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      {/* Left: participant info + preview */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-900">
            {row.prolific_id}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta[row.status].chipClass}`}
          >
            {statusMeta[row.status].label}
          </span>
          <span className="chip chip-neutral normal-case tracking-normal">
            IV1 {row.iv1}
          </span>
          <span className="chip chip-neutral normal-case tracking-normal">
            IV2 {row.iv2}
          </span>
          {hasContent ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Feedback
            </span>
          ) : null}
          {hasReason ? (
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              Reason
            </span>
          ) : null}
        </div>

        {preview ? (
          <p className="text-sm leading-relaxed text-slate-600">{preview}</p>
        ) : (
          <p className="text-sm italic text-slate-400">
            No feedback content — reason only
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {row.feedback_submitted_at ? (
            <span>
              <span className="font-semibold text-slate-600">Feedback:</span>{" "}
              {formatDateTime(row.feedback_submitted_at)}
            </span>
          ) : null}
          {row.reason_submitted_at ? (
            <span>
              <span className="font-semibold text-slate-600">Reason:</span>{" "}
              {formatDateTime(row.reason_submitted_at)}
            </span>
          ) : null}
          <span>
            <span className="font-semibold text-slate-600">Duration:</span>{" "}
            {formatDuration(row.total_seconds)}
          </span>
        </div>
      </div>

      {/* Right: view button */}
      <button
        type="button"
        className="secondary-button shrink-0 px-4 py-2 text-xs"
        onClick={onView}
      >
        View
      </button>
    </div>
  );
}

/* ── Feedback detail modal ── */

function FeedbackDetailModal({
  row,
  onClose,
}: {
  row: AdminFeedbackRow;
  onClose: () => void;
}) {
  const hasReason = !!row.feedback_reason?.trim().length;

  return (
    <div className="modal-backdrop">
      <div
        className="w-full max-w-2xl space-y-6 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.5)] sm:p-8"
        style={{ maxHeight: "min(90svh, 52rem)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <span className="eyebrow">Feedback Detail</span>
            <h3 className="break-all font-mono text-lg font-semibold tracking-tight text-slate-950">
              {row.prolific_id}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta[row.status].chipClass}`}
              >
                {statusMeta[row.status].label}
              </span>
              <span className="chip chip-neutral normal-case tracking-normal">
                IV1 {row.iv1}
              </span>
              <span className="chip chip-neutral normal-case tracking-normal">
                IV2 {row.iv2}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button shrink-0 px-4 py-2 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Feedback time", value: formatDateTime(row.feedback_submitted_at) },
            { label: "Reason time", value: formatDateTime(row.reason_submitted_at) },
            { label: "Total duration", value: formatDuration(row.total_seconds) },
            { label: "Last update", value: formatDateTime(row.updated_at) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-900">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback content */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Feedback Content
          </div>
          <div
            className={`rounded-[1.5rem] border px-5 py-4 ${row.feedback_content ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-200 bg-slate-50/50"}`}
          >
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {row.feedback_content ?? (
                <span className="italic text-slate-400">
                  No feedback content submitted.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Feedback reason */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Feedback Reason
            {!hasReason ? (
              <span className="normal-case tracking-normal text-slate-400">
                (not provided)
              </span>
            ) : null}
          </div>
          <div
            className={`rounded-[1.5rem] border px-5 py-4 ${hasReason ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-200 bg-slate-50/50"}`}
          >
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {hasReason ? row.feedback_reason : "—"}
            </p>
          </div>
        </div>

        {/* Failed info (if applicable) */}
        {row.failed && row.failed_stage_id ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600">
              Failed at stage
            </div>
            <div className="mt-1 font-mono text-sm font-semibold text-red-800">
              {row.failed_stage_id}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Main component ── */

export function AdminFeedbackPage({ initialData, onLogout }: AdminFeedbackPageProps) {
  const [feedbackData, setFeedbackData] =
    useState<AdminFeedbackResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [iv1Filter, setIv1Filter] = useState<"all" | "A" | "B">("all");
  const [iv2Filter, setIv2Filter] = useState<"all" | "A" | "B">("all");
  const [orderField, setOrderField] = useState<OrderField>("feedback_submitted_at");
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("desc");
  const [selectedFeedback, setSelectedFeedback] = useState<AdminFeedbackRow | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const rows = feedbackData.rows.filter((row) => {
      if (iv1Filter !== "all" && row.iv1 !== iv1Filter) return false;
      if (iv2Filter !== "all" && row.iv2 !== iv2Filter) return false;
      if (!normalizedSearch) return true;
      return (
        row.prolific_id.toLowerCase().includes(normalizedSearch) ||
        row.feedback_content?.toLowerCase().includes(normalizedSearch) ||
        row.feedback_reason?.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...rows].sort((left, right) => {
      const leftValue = left[orderField];
      const rightValue = right[orderField];
      if (leftValue === rightValue) return 0;
      const leftComparable = leftValue ?? (orderDirection === "asc" ? "" : -1);
      const rightComparable = rightValue ?? (orderDirection === "asc" ? "" : -1);
      if (leftComparable < rightComparable) return orderDirection === "asc" ? -1 : 1;
      return orderDirection === "asc" ? 1 : -1;
    });
  }, [feedbackData.rows, iv1Filter, iv2Filter, orderDirection, orderField, searchText]);

  const summary = useMemo(() => {
    const allRows = feedbackData.rows;
    return {
      all: {
        total: allRows.length,
        byIv1: {
          A: allRows.filter((r) => r.iv1 === "A").length,
          B: allRows.filter((r) => r.iv1 === "B").length,
        },
      },
      byIv2: {
        A: {
          total: allRows.filter((r) => r.iv2 === "A").length,
          byIv1: {
            A: allRows.filter((r) => r.iv2 === "A" && r.iv1 === "A").length,
            B: allRows.filter((r) => r.iv2 === "A" && r.iv1 === "B").length,
          },
        },
        B: {
          total: allRows.filter((r) => r.iv2 === "B").length,
          byIv1: {
            A: allRows.filter((r) => r.iv2 === "B" && r.iv1 === "A").length,
            B: allRows.filter((r) => r.iv2 === "B" && r.iv1 === "B").length,
          },
        },
      },
      hasReason: allRows.filter((r) => !!r.feedback_reason?.trim().length).length,
    };
  }, [feedbackData.rows]);

  const groupedRows = useMemo(() => {
    if (iv2Filter === "A") return [{ iv2: "A" as const, rows: filteredRows }];
    if (iv2Filter === "B") return [{ iv2: "B" as const, rows: filteredRows }];
    return [
      { iv2: "A" as const, rows: filteredRows.filter((r) => r.iv2 === "A") },
      { iv2: "B" as const, rows: filteredRows.filter((r) => r.iv2 === "B") },
    ];
  }, [filteredRows, iv2Filter]);

  async function refreshFeedback() {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/feedback");
      const payload = (await response.json()) as
        | AdminFeedbackResponse
        | ApiErrorResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload ? payload.message : "Unable to load feedback.",
        );
      }
      setFeedbackData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected refresh error.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Admin · Feedback</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Feedback Review
              </h1>
              <p className="body-copy max-w-xl">
                All{" "}
                <span className="font-semibold text-slate-950">
                  {summary.all.total}
                </span>{" "}
                participants who submitted feedback during the study, with{" "}
                <span className="font-semibold text-slate-950">
                  {summary.hasReason}
                </span>{" "}
                also providing an explanation reason.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="secondary-button">
                All Participants
              </Link>
              <Link href="/admin/stats" className="secondary-button">
                Statistics
              </Link>
              <Link href="/admin/coding" className="secondary-button">
                Coding
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshFeedback()}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Summary cards: All + IV2 A/B */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SummaryCard
              label="All Feedback"
              total={summary.all.total}
              byIv1={summary.all.byIv1}
              active={iv2Filter === "all"}
              onClick={() => setIv2Filter("all")}
            />
            <SummaryCard
              label="IV2 A"
              total={summary.byIv2.A.total}
              byIv1={summary.byIv2.A.byIv1}
              active={iv2Filter === "A"}
              onClick={() =>
                setIv2Filter((prev) => (prev === "A" ? "all" : "A"))
              }
            />
            <SummaryCard
              label="IV2 B"
              total={summary.byIv2.B.total}
              byIv1={summary.byIv2.B.byIv1}
              active={iv2Filter === "B"}
              onClick={() =>
                setIv2Filter((prev) => (prev === "B" ? "all" : "B"))
              }
            />
          </div>
        </div>

        {/* Filters + list */}
        <div className="panel space-y-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,0.7fr))]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Search
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder="Participant ID, feedback text, or reason…"
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                IV1
              </label>
              <select
                value={iv1Filter}
                onChange={(event) =>
                  setIv1Filter(event.currentTarget.value as "all" | "A" | "B")
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                IV2
              </label>
              <select
                value={iv2Filter}
                onChange={(event) =>
                  setIv2Filter(event.currentTarget.value as "all" | "A" | "B")
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Order by
              </label>
              <select
                value={orderField}
                onChange={(event) =>
                  setOrderField(event.currentTarget.value as OrderField)
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="feedback_submitted_at">Feedback time</option>
                <option value="reason_submitted_at">Reason time</option>
                <option value="updated_at">Last update</option>
                <option value="total_seconds">Duration</option>
                <option value="prolific_id">Participant ID</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Direction
              </label>
              <select
                value={orderDirection}
                onChange={(event) =>
                  setOrderDirection(event.currentTarget.value as OrderDirection)
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {/* Grouped list */}
          <div className="space-y-6">
            {groupedRows.map((group) => (
              <section key={group.iv2} className="space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                      IV2 {group.iv2}
                    </h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {group.rows.length}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Click &ldquo;View&rdquo; to read full feedback
                  </span>
                </div>

                {group.rows.length > 0 ? (
                  <div className="space-y-2.5">
                    {group.rows.map((row) => (
                      <FeedbackListItem
                        key={`${group.iv2}-${row.prolific_id}-${row.feedback_submitted_at}`}
                        row={row}
                        onView={() => setSelectedFeedback(row)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                    No feedback entries match the current filters in this IV2
                    group.
                  </div>
                )}
              </section>
            ))}

            {filteredRows.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                No feedback entries match the current filters.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Feedback detail modal */}
      {selectedFeedback ? (
        <FeedbackDetailModal
          row={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
        />
      ) : null}
    </>
  );
}
