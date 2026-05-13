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
    label: "Success",
    chipClass: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

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
  if (seconds === null) {
    return "—";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function buildIv1Counts(rows: AdminFeedbackRow[]) {
  return {
    A: rows.filter((row) => row.iv1 === "A").length,
    B: rows.filter((row) => row.iv1 === "B").length,
  };
}

function FeedbackCard({ row }: { row: AdminFeedbackRow }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">
              {row.prolific_id}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[row.status].chipClass}`}
            >
              {statusMeta[row.status].label}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              IV1 {row.iv1}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              IV2 {row.iv2}
            </span>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <span className="font-semibold text-slate-700">Feedback:</span>{" "}
              {formatDateTime(row.feedback_submitted_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Reason:</span>{" "}
              {formatDateTime(row.reason_submitted_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Total time:</span>{" "}
              {formatDuration(row.total_seconds)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Last update:</span>{" "}
              {formatDateTime(row.updated_at)}
            </div>
          </div>
          {row.failed && row.failed_stage_id ? (
            <div className="text-sm text-red-700">
              <span className="font-semibold">Failed at:</span>{" "}
              {row.failed_stage_id}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Feedback Content
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
            {row.feedback_content}
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Feedback Reason
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
            {row.feedback_reason?.trim().length ? row.feedback_reason : "-"}
          </p>
        </section>
      </div>
    </article>
  );
}

export function AdminFeedbackPage({
  initialData,
  onLogout,
}: AdminFeedbackPageProps) {
  const [feedbackData, setFeedbackData] =
    useState<AdminFeedbackResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [iv1Filter, setIv1Filter] = useState<"all" | "A" | "B">("all");
  const [iv2Filter, setIv2Filter] = useState<"all" | "A" | "B">("all");
  const [orderField, setOrderField] = useState<OrderField>(
    "feedback_submitted_at",
  );
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("desc");

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const rows = feedbackData.rows.filter((row) => {
      if (iv1Filter !== "all" && row.iv1 !== iv1Filter) {
        return false;
      }

      if (iv2Filter !== "all" && row.iv2 !== iv2Filter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        row.prolific_id.toLowerCase().includes(normalizedSearch) ||
        row.feedback_content.toLowerCase().includes(normalizedSearch) ||
        row.feedback_reason?.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...rows].sort((left, right) => {
      const leftValue = left[orderField];
      const rightValue = right[orderField];

      if (leftValue === rightValue) {
        return 0;
      }

      const leftComparable = leftValue ?? (orderDirection === "asc" ? "" : -1);
      const rightComparable =
        rightValue ?? (orderDirection === "asc" ? "" : -1);

      if (leftComparable < rightComparable) {
        return orderDirection === "asc" ? -1 : 1;
      }

      return orderDirection === "asc" ? 1 : -1;
    });
  }, [
    feedbackData.rows,
    iv1Filter,
    iv2Filter,
    orderDirection,
    orderField,
    searchText,
  ]);

  const summary = useMemo(() => {
    const all = filteredRows;
    const iv2A = filteredRows.filter((row) => row.iv2 === "A");
    const iv2B = filteredRows.filter((row) => row.iv2 === "B");

    return {
      all: {
        total: all.length,
        iv1Counts: buildIv1Counts(all),
      },
      A: {
        total: iv2A.length,
        iv1Counts: buildIv1Counts(iv2A),
      },
      B: {
        total: iv2B.length,
        iv1Counts: buildIv1Counts(iv2B),
      },
    };
  }, [filteredRows]);

  const groupedRows = useMemo(() => {
    if (iv2Filter === "A") {
      return [{ iv2: "A" as const, rows: filteredRows }];
    }

    if (iv2Filter === "B") {
      return [{ iv2: "B" as const, rows: filteredRows }];
    }

    return [
      {
        iv2: "A" as const,
        rows: filteredRows.filter((row) => row.iv2 === "A"),
      },
      {
        iv2: "B" as const,
        rows: filteredRows.filter((row) => row.iv2 === "B"),
      },
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
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
      <div className="panel space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <span className="eyebrow">Admin</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Feedback Review
            </h1>
            <p className="body-copy">
              Review all submitted AI feedback content and the later explanation
              for why each participant chose to provide it.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="secondary-button">
              Dashboard
            </Link>
            <Link href="/admin/stats" className="secondary-button">
              Statistics
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void refreshFeedback()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
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

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              key: "all" as const,
              label: "All Feedback",
              total: summary.all.total,
              iv1Counts: summary.all.iv1Counts,
            },
            {
              key: "A" as const,
              label: "IV2 A",
              total: summary.A.total,
              iv1Counts: summary.A.iv1Counts,
            },
            {
              key: "B" as const,
              label: "IV2 B",
              total: summary.B.total,
              iv1Counts: summary.B.iv1Counts,
            },
          ].map((card) => {
            const isActive =
              (card.key === "all" && iv2Filter === "all") ||
              iv2Filter === card.key;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() =>
                  setIv2Filter((previous) =>
                    previous === card.key ||
                    (card.key === "all" && previous === "all")
                      ? "all"
                      : card.key,
                  )
                }
                className={[
                  "rounded-[1.75rem] border p-5 text-left transition",
                  isActive
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-950",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`text-sm font-semibold uppercase tracking-[0.14em] ${isActive ? "text-slate-300" : "text-slate-600"}`}
                    >
                      {card.label}
                    </div>
                    <div className="mt-2 text-4xl font-semibold tracking-tight">
                      {card.total}
                    </div>
                  </div>
                  <div
                    className={`text-sm ${isActive ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {isActive ? "Active" : "Filter"}
                  </div>
                </div>
                <div
                  className={`mt-5 grid grid-cols-2 gap-3 text-sm ${isActive ? "text-slate-200" : "text-slate-600"}`}
                >
                  <div className="rounded-2xl border border-current/10 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em]">
                      IV1 A
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {card.iv1Counts.A}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-current/10 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em]">
                      IV1 B
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {card.iv1Counts.B}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,0.7fr))]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              placeholder="Search participant, feedback, or reason"
              className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">IV1</label>
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

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">IV2</label>
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

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Order
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
              <option value="total_seconds">Total seconds</option>
              <option value="prolific_id">Participant ID</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Direction
            </label>
            <select
              value={orderDirection}
              onChange={(event) =>
                setOrderDirection(event.currentTarget.value as OrderDirection)
              }
              className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          {groupedRows.map((group) => (
            <section key={group.iv2} className="space-y-4">
              <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    IV2 {group.iv2}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {group.rows.length} participant
                    {group.rows.length === 1 ? "" : "s"} with submitted feedback
                    content.
                  </p>
                </div>
              </div>

              {group.rows.length > 0 ? (
                <div className="space-y-4">
                  {group.rows.map((row) => (
                    <FeedbackCard
                      key={`${group.iv2}-${row.prolific_id}-${row.feedback_submitted_at}`}
                      row={row}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-600">
                  No feedback entries match the current filters in this IV2
                  group.
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
