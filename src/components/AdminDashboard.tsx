import { useMemo, useState } from "react";

import type {
  AdminDashboardResponse,
  AdminDetailRow,
  AdminParticipantDetailResponse,
  AdminStatus,
  ApiErrorResponse,
} from "@/lib/types";

type AdminDashboardProps = {
  initialData: AdminDashboardResponse;
  onLogout: () => void;
};

type OrderField =
  | "updated_at"
  | "started_at"
  | "prolific_id"
  | "submission_count"
  | "total_seconds"
  | "last_submission_at";

type OrderDirection = "asc" | "desc";

const statusMeta: Record<
  AdminStatus,
  { label: string; cardClass: string; chipClass: string }
> = {
  in_progress: {
    label: "In Progress",
    cardClass: "border-amber-200 bg-amber-50/80",
    chipClass: "border-amber-300 bg-amber-100 text-amber-800",
  },
  failed: {
    label: "Failed",
    cardClass: "border-red-200 bg-red-50/80",
    chipClass: "border-red-300 bg-red-100 text-red-800",
  },
  completed: {
    label: "Success",
    cardClass: "border-emerald-200 bg-emerald-50/80",
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

function renderBreakdownTable(
  breakdown: { iv1: string; iv2: string; count: number }[],
  keyPrefix: string,
) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-56 text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="px-3 py-2 text-left">IV1 \ IV2</th>
            <th className="px-3 py-2 text-center">A</th>
            <th className="px-3 py-2 text-center">B</th>
          </tr>
        </thead>
        <tbody>
          {["A", "B"].map((iv1) => (
            <tr key={`${keyPrefix}-${iv1}`} className="border-t border-slate-200/80">
              <td className="px-3 py-2 font-semibold text-slate-700">{iv1}</td>
              {["A", "B"].map((iv2) => {
                const cell = breakdown.find(
                  (entry) => entry.iv1 === iv1 && entry.iv2 === iv2,
                );
                return (
                  <td
                    key={`${keyPrefix}-${iv1}-${iv2}`}
                    className="px-3 py-2 text-center font-medium text-slate-900"
                  >
                    {cell?.count ?? 0}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function getDisplayedStageVariants(participant: AdminDetailRow) {
  if (
    typeof participant.stage_variants !== "object" ||
    participant.stage_variants === null ||
    Array.isArray(participant.stage_variants)
  ) {
    return participant.stage_variants;
  }

  const stageVariants = {
    ...participant.stage_variants,
  } as Record<string, unknown>;

  if (
    (stageVariants.stage_6 === "default" ||
      stageVariants.stage_6 === null ||
      stageVariants.stage_6 === undefined) &&
    (participant.iv2 === "A" || participant.iv2 === "B")
  ) {
    stageVariants.stage_6 = participant.iv2;
  }

  return stageVariants;
}

export function AdminDashboard({
  initialData,
  onLogout,
}: AdminDashboardProps) {
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "all">("all");
  const [iv1Filter, setIv1Filter] = useState<"all" | "A" | "B">("all");
  const [iv2Filter, setIv2Filter] = useState<"all" | "A" | "B">("all");
  const [orderField, setOrderField] = useState<OrderField>("updated_at");
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("desc");
  const [selectedProlificId, setSelectedProlificId] = useState<string | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState<"answers" | "submissions">(
    "answers",
  );
  const [detailCache, setDetailCache] = useState<Record<string, AdminDetailRow>>(
    {},
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const rows = dashboardData.rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

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
        row.failed_reason_summary?.toLowerCase().includes(normalizedSearch) ||
        row.failed_stage_id?.toLowerCase().includes(normalizedSearch) ||
        row.last_submission_stage_id?.toLowerCase().includes(normalizedSearch)
      );
    });

    const sortedRows = [...rows].sort((left, right) => {
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

    return sortedRows;
  }, [
    dashboardData.rows,
    iv1Filter,
    iv2Filter,
    orderDirection,
    orderField,
    searchText,
    statusFilter,
  ]);

  const selectedParticipant = selectedProlificId
    ? detailCache[selectedProlificId] ?? null
    : null;

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/dashboard");
      const payload = (await response.json()) as
        | AdminDashboardResponse
        | ApiErrorResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload ? payload.message : "Unable to load dashboard.",
        );
      }

      setDashboardData(payload);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Unexpected refresh error.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function openParticipantDetail(prolificId: string) {
    setSelectedProlificId(prolificId);
    setDetailError(null);
    setDetailTab("answers");

    if (detailCache[prolificId]) {
      return;
    }

    setLoadingDetail(true);

    try {
      const response = await fetch(
        `/api/admin/participant?prolificId=${encodeURIComponent(prolificId)}`,
      );
      const payload = (await response.json()) as
        | AdminParticipantDetailResponse
        | ApiErrorResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload ? payload.message : "Unable to load detail.",
        );
      }

      setDetailCache((previous) => ({
        ...previous,
        [prolificId]: payload.participant,
      }));
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Unexpected detail error.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Admin</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Participant Dashboard
              </h1>
              <p className="body-copy">
                Monitor participant progress, failures, completions, and
                response details across the study.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshDashboard()}
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
            {(["in_progress", "failed", "completed"] as AdminStatus[]).map(
              (status) => {
                const summary = dashboardData.summary[status];
                const expanded = summaryExpanded;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSummaryExpanded((previous) => !previous)}
                    className={[
                      "rounded-[1.75rem] border p-5 text-left transition",
                      statusMeta[status].cardClass,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {statusMeta[status].label}
                        </div>
                        <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                          {summary.total}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-500">
                        {expanded ? "Hide" : "Show"}
                      </span>
                    </div>
                    {expanded ? (
                      <div className="mt-5 rounded-[1.25rem] border border-white/80 bg-white/70 p-4">
                        {renderBreakdownTable(summary.breakdown, status)}
                      </div>
                    ) : null}
                  </button>
                );
              },
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Success Duration
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Based on completed participants with recorded total time.
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  n = {dashboardData.summary.completedDuration.count}
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Min
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    {formatDuration(dashboardData.summary.completedDuration.minSeconds)}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Max
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    {formatDuration(dashboardData.summary.completedDuration.maxSeconds)}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Avg
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    {formatDuration(
                      dashboardData.summary.completedDuration.averageSeconds,
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Success With Feedback Content
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Completed participants who entered non-empty `FEEDBACK_CONTENT`.
                  </div>
                </div>
                <div className="text-3xl font-semibold tracking-tight text-slate-950">
                  {dashboardData.summary.completedFeedbackContent.total}
                </div>
              </div>
              <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                {renderBreakdownTable(
                  dashboardData.summary.completedFeedbackContent.breakdown,
                  "completed-feedback-content",
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,0.75fr))]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder="Search participant or failure details"
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.currentTarget.value as AdminStatus | "all")
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">All</option>
                <option value="in_progress">In Progress</option>
                <option value="failed">Failed</option>
                <option value="completed">Success</option>
              </select>
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
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <select
                  value={orderField}
                  onChange={(event) =>
                    setOrderField(event.currentTarget.value as OrderField)
                  }
                  className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
                >
                  <option value="updated_at">Updated</option>
                  <option value="started_at">Started</option>
                  <option value="prolific_id">Participant ID</option>
                  <option value="submission_count">Submission count</option>
                  <option value="total_seconds">Total seconds</option>
                  <option value="last_submission_at">Last submission</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setOrderDirection((previous) =>
                      previous === "desc" ? "asc" : "desc",
                    )
                  }
                  className="secondary-button px-4"
                >
                  {orderDirection === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Participant
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">IV1</th>
                  <th className="px-4 py-3 text-left font-semibold">IV2</th>
                  <th className="px-4 py-3 text-left font-semibold">Stage idx</th>
                  <th className="px-4 py-3 text-left font-semibold">Failed stage</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Submission count
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Total seconds
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Last update
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.prolific_id}
                    className="border-t border-slate-200 text-slate-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">
                      {row.prolific_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "chip normal-case tracking-normal",
                          statusMeta[row.status].chipClass,
                        ].join(" ")}
                      >
                        {statusMeta[row.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.iv1}</td>
                    <td className="px-4 py-3">{row.iv2}</td>
                    <td className="px-4 py-3">{row.current_stage_index}</td>
                    <td className="px-4 py-3">{row.failed_stage_id ?? "—"}</td>
                    <td className="px-4 py-3">{row.submission_count}</td>
                    <td className="px-4 py-3">
                      {formatDuration(row.total_seconds)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(row.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="secondary-button px-4 py-2 text-xs"
                        onClick={() => void openParticipantDetail(row.prolific_id)}
                      >
                        View detail
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No participants match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedProlificId ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-6xl space-y-6 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-8 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.5)] max-h-[90svh]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="eyebrow">Participant detail</span>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {selectedProlificId}
                </h2>
              </div>
              <button
                type="button"
                className="secondary-button px-4 py-2 text-xs"
                onClick={() => {
                  setSelectedProlificId(null);
                  setDetailError(null);
                }}
              >
                Close
              </button>
            </div>

            {loadingDetail && !selectedParticipant ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-slate-600">
                Loading participant detail...
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {detailError}
              </div>
            ) : selectedParticipant ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">
                      {statusMeta[selectedParticipant.status].label}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      IV condition
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">
                      {selectedParticipant.iv1} × {selectedParticipant.iv2}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Submissions
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">
                      {selectedParticipant.submission_count}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Total duration
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">
                      {formatDuration(selectedParticipant.total_seconds)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-slate-950">
                      Failure detail
                    </h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Failed stage
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {selectedParticipant.failed_stage_id ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Last submission stage
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {selectedParticipant.last_submission_stage_id ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Last verdict
                        </div>
                        <pre className="overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800">
                          {formatJson(selectedParticipant.last_submission_verdict)}
                        </pre>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Failed reason
                        </div>
                        <pre className="overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800">
                          {formatJson(selectedParticipant.failed_reason)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-slate-950">
                      Progress detail
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Current stage index
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-950">
                          {selectedParticipant.current_stage_index}
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Last submission time
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedParticipant.last_submission_at)}
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Started at
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedParticipant.started_at)}
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Updated at
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedParticipant.updated_at)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stage variants
                      </div>
                      <pre className="overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800">
                        {formatJson(getDisplayedStageVariants(selectedParticipant))}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-slate-950">
                      Response payloads
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailTab("answers")}
                        className={[
                          "secondary-button px-4 py-2 text-xs",
                          detailTab === "answers"
                            ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-900"
                            : "",
                        ].join(" ")}
                      >
                        Questionnaire answers
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab("submissions")}
                        className={[
                          "secondary-button px-4 py-2 text-xs",
                          detailTab === "submissions"
                            ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-900"
                            : "",
                        ].join(" ")}
                      >
                        Submissions detail
                      </button>
                    </div>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-800">
                    {detailTab === "answers"
                      ? formatJson(selectedParticipant.questionnaire_answers)
                      : formatJson(selectedParticipant.submissions_detail)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
