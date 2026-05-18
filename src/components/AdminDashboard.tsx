import { useMemo, useState } from "react";

import Link from "next/link";

import type {
  AdminDashboardResponse,
  AdminDetailRow,
  AdminParticipantDetailResponse,
  AdminStatus,
  AdminStatusSummary,
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
  { label: string; cardClass: string; chipClass: string; dotClass: string }
> = {
  in_progress: {
    label: "In Progress",
    cardClass: "border-amber-200 bg-amber-50/60",
    chipClass: "border-amber-300 bg-amber-100 text-amber-800",
    dotClass: "bg-amber-400",
  },
  failed: {
    label: "Failed",
    cardClass: "border-red-200 bg-red-50/60",
    chipClass: "border-red-300 bg-red-100 text-red-800",
    dotClass: "bg-red-400",
  },
  completed: {
    label: "Completed",
    cardClass: "border-emerald-200 bg-emerald-50/60",
    chipClass: "border-emerald-300 bg-emerald-100 text-emerald-800",
    dotClass: "bg-emerald-400",
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

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function IvBreakdownGrid({
  breakdown,
  keyPrefix,
}: {
  breakdown: { iv1: string; iv2: string; count: number }[];
  keyPrefix: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-white/60 bg-white/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/60">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
              IV1 ╲ IV2
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
              A
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
              B
            </th>
          </tr>
        </thead>
        <tbody>
          {["A", "B"].map((iv1) => (
            <tr key={`${keyPrefix}-${iv1}`} className="border-t border-slate-200/40">
              <td className="px-3 py-2 text-xs font-semibold text-slate-600">
                {iv1}
              </td>
              {["A", "B"].map((iv2) => {
                const cell = breakdown.find(
                  (entry) => entry.iv1 === iv1 && entry.iv2 === iv2,
                );
                return (
                  <td
                    key={`${keyPrefix}-${iv1}-${iv2}`}
                    className="px-3 py-2 text-center text-sm font-semibold text-slate-900"
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

function StatusCard({
  status,
  summary,
}: {
  status: AdminStatus;
  summary: AdminStatusSummary;
}) {
  const meta = statusMeta[status];
  return (
    <div className={`rounded-[1.75rem] border p-5 ${meta.cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {meta.label}
            </span>
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            {summary.total}
          </div>
        </div>
        <span className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-xs font-semibold text-slate-500">
          n
        </span>
      </div>
      <IvBreakdownGrid breakdown={summary.breakdown} keyPrefix={status} />
    </div>
  );
}

function getDisplayedStageVariants(participant: AdminDetailRow) {
  if (
    typeof participant.stage_variants !== "object" ||
    participant.stage_variants === null ||
    Array.isArray(participant.stage_variants)
  ) {
    return participant.stage_variants;
  }

  const stageVariants = { ...participant.stage_variants } as Record<
    string,
    unknown
  >;

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

export function AdminDashboard({ initialData, onLogout }: AdminDashboardProps) {
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
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
  const [detailCache, setDetailCache] = useState<
    Record<string, AdminDetailRow>
  >({});

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const rows = dashboardData.rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (iv1Filter !== "all" && row.iv1 !== iv1Filter) return false;
      if (iv2Filter !== "all" && row.iv2 !== iv2Filter) return false;
      if (!normalizedSearch) return true;
      return (
        row.prolific_id.toLowerCase().includes(normalizedSearch) ||
        row.failed_reason_summary?.toLowerCase().includes(normalizedSearch) ||
        row.failed_stage_id?.toLowerCase().includes(normalizedSearch) ||
        row.last_submission_stage_id?.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...rows].sort((left, right) => {
      const leftValue = left[orderField];
      const rightValue = right[orderField];
      if (leftValue === rightValue) return 0;
      const leftComparable = leftValue ?? (orderDirection === "asc" ? "" : -1);
      const rightComparable =
        rightValue ?? (orderDirection === "asc" ? "" : -1);
      if (leftComparable < rightComparable)
        return orderDirection === "asc" ? -1 : 1;
      return orderDirection === "asc" ? 1 : -1;
    });
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
    ? (detailCache[selectedProlificId] ?? null)
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
    if (detailCache[prolificId]) return;
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

  const { summary } = dashboardData;
  const total =
    summary.in_progress.total + summary.failed.total + summary.completed.total;

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Admin · Overview</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                All Participants
              </h1>
              <p className="body-copy max-w-xl">
                Monitor all{" "}
                <span className="font-semibold text-slate-950">{total}</span>{" "}
                participants across every stage — including those in progress,
                failed, and completed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/stats" className="secondary-button">
                Statistics
              </Link>
              <Link href="/admin/feedback" className="secondary-button">
                Feedback
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshDashboard()}
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

          {/* Status overview cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            {(["in_progress", "failed", "completed"] as AdminStatus[]).map(
              (status) => (
                <StatusCard
                  key={status}
                  status={status}
                  summary={summary[status]}
                />
              ),
            )}
          </div>

          {/* Duration + Feedback side-by-side */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Completed Duration
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Time-on-task for completed participants.
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  n = {summary.completedDuration.count}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Min",
                    value: formatDuration(summary.completedDuration.minSeconds),
                  },
                  {
                    label: "Avg",
                    value: formatDuration(
                      summary.completedDuration.averageSeconds,
                    ),
                  },
                  {
                    label: "Max",
                    value: formatDuration(summary.completedDuration.maxSeconds),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 text-center"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-950">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Feedback Submitted
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Completed participants who entered non-empty feedback.
                  </div>
                </div>
                <div className="text-3xl font-semibold tracking-tight text-slate-950">
                  {summary.completedFeedbackContent.total}
                </div>
              </div>
              <IvBreakdownGrid
                breakdown={summary.completedFeedbackContent.breakdown}
                keyPrefix="feedback"
              />
            </div>
          </div>
        </div>

        {/* Participant table */}
        <div className="panel space-y-5">
          <div className="space-y-1">
            <span className="eyebrow">Participant List</span>
            <p className="text-sm text-slate-600">
              {filteredRows.length} of {dashboardData.rows.length} participants
              shown.
            </p>
          </div>

          {/* Filters */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Search
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder="Participant ID or failure details…"
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.currentTarget.value as AdminStatus | "all",
                  )
                }
                className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">All</option>
                <option value="in_progress">In Progress</option>
                <option value="failed">Failed</option>
                <option value="completed">Completed</option>
              </select>
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
                Order
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
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
                  <option value="submission_count">Submissions</option>
                  <option value="total_seconds">Duration</option>
                  <option value="last_submission_at">Last sub.</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setOrderDirection((p) => (p === "desc" ? "asc" : "desc"))
                  }
                  className="secondary-button px-4"
                >
                  {orderDirection === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Participant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    IV1 / IV2
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Failed At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Last Update
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.prolific_id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">
                      {row.prolific_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusMeta[row.status].chipClass,
                        ].join(" ")}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusMeta[row.status].dotClass}`}
                        />
                        {statusMeta[row.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                          {row.iv1}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                          {row.iv2}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.current_stage_index}
                    </td>
                    <td className="px-4 py-3">
                      {row.failed_stage_id ? (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700">
                          {row.failed_stage_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDuration(row.total_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDateTime(row.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="secondary-button px-4 py-2 text-xs"
                        onClick={() =>
                          void openParticipantDetail(row.prolific_id)
                        }
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
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

      {/* Participant detail modal */}
      {selectedProlificId ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-5xl space-y-6 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.5)] max-h-[90svh] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="eyebrow">Participant Detail</span>
                <h2 className="break-all font-mono text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {selectedProlificId}
                </h2>
              </div>
              <button
                type="button"
                className="secondary-button shrink-0 px-4 py-2 text-xs"
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
                Loading participant detail…
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {detailError}
              </div>
            ) : selectedParticipant ? (
              <div className="space-y-5">
                {/* Key metrics */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Status",
                      value: statusMeta[selectedParticipant.status].label,
                    },
                    {
                      label: "IV Condition",
                      value: `${selectedParticipant.iv1} × ${selectedParticipant.iv2}`,
                    },
                    {
                      label: "Submissions",
                      value: String(selectedParticipant.submission_count),
                    },
                    {
                      label: "Duration",
                      value: formatDuration(selectedParticipant.total_seconds),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {label}
                      </div>
                      <div className="mt-2 text-base font-semibold text-slate-950">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  {/* Failure detail */}
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-slate-950">
                      Failure Detail
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: "Failed Stage",
                          value: selectedParticipant.failed_stage_id ?? "—",
                        },
                        {
                          label: "Last Submission Stage",
                          value:
                            selectedParticipant.last_submission_stage_id ??
                            "—",
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {label}
                          </div>
                          <div className="mt-1.5 font-mono text-xs text-slate-900">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-3">
                      {[
                        {
                          label: "Last Verdict",
                          value: selectedParticipant.last_submission_verdict,
                        },
                        {
                          label: "Failed Reason",
                          value: selectedParticipant.failed_reason,
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {label}
                          </div>
                          <pre className="overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-800">
                            {formatJson(value)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress detail */}
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-slate-950">
                      Progress Detail
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: "Current Stage",
                          value: String(
                            selectedParticipant.current_stage_index,
                          ),
                        },
                        {
                          label: "Last Submission",
                          value: formatDateTime(
                            selectedParticipant.last_submission_at,
                          ),
                        },
                        {
                          label: "Started At",
                          value: formatDateTime(selectedParticipant.started_at),
                        },
                        {
                          label: "Updated At",
                          value: formatDateTime(selectedParticipant.updated_at),
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {label}
                          </div>
                          <div className="mt-1.5 text-sm font-semibold text-slate-950">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stage Variants
                      </div>
                      <pre className="overflow-x-auto rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-800">
                        {formatJson(
                          getDisplayedStageVariants(selectedParticipant),
                        )}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Response payloads */}
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-slate-950">
                      Response Payloads
                    </h3>
                    <div className="flex gap-2">
                      {(["answers", "submissions"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDetailTab(tab)}
                          className={[
                            "secondary-button px-4 py-2 text-xs",
                            detailTab === tab
                              ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-900"
                              : "",
                          ].join(" ")}
                        >
                          {tab === "answers"
                            ? "Questionnaire Answers"
                            : "Submissions Detail"}
                        </button>
                      ))}
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
