import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import type { AdminDashboardSummary, AdminStatus } from "@/lib/types";

type FollowUpResultsRow = {
  pipelineCode: string;
  prolificId: string;
  status: AdminStatus;
  iv1: string;
  iv2: string;
  lastSubmissionAt: string | null;
  totalSeconds: number | null;
  failureReasonText: string;
  hasFeedback: boolean;
  feedbackContent: string;
  feedbackReason: string;
  answerGroups: Array<{
    stageId: string;
    entries: Array<{
      label: string;
      value: string;
    }>;
  }>;
};

type FollowUpResultsData = {
  activePipelineCode: string;
  availablePipelineCodes: string[];
  selectedPipelineCodes: string[];
  summary: AdminDashboardSummary;
  rows: FollowUpResultsRow[];
};

type FollowUpResultsPageProps = {
  initialData: FollowUpResultsData;
};

type OrderField =
  | "pipelineCode"
  | "lastSubmissionAt"
  | "prolificId"
  | "status"
  | "totalSeconds";

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
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
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
  summary: AdminDashboardSummary[AdminStatus];
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
      </div>
      <IvBreakdownGrid breakdown={summary.breakdown} keyPrefix={status} />
    </div>
  );
}

function SortableHeader({
  label,
  field,
  orderField,
  orderDirection,
  onSort,
}: {
  label: string;
  field: OrderField;
  orderField: OrderField;
  orderDirection: OrderDirection;
  onSort: (field: OrderField) => void;
}) {
  const isActive = orderField === field;
  const indicator = isActive ? (orderDirection === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1"
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      <span className={isActive ? "text-slate-900" : "text-slate-400"}>
        {indicator}
      </span>
    </button>
  );
}

function buildPipelineQuery(pipelineCodes: string[]) {
  const params = new URLSearchParams();
  for (const code of pipelineCodes) {
    params.append("pipeline", code);
  }
  return params.toString();
}

function useDismissableMenu(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return containerRef;
}

function PipelineMenu({
  availablePipelineCodes,
  selectedPipelineCodes,
  onToggle,
}: {
  availablePipelineCodes: string[];
  selectedPipelineCodes: string[];
  onToggle: (pipelineCode: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const summaryLabel =
    selectedPipelineCodes.length === 1
      ? selectedPipelineCodes[0]
      : `${selectedPipelineCodes.length} selected`;
  const containerRef = useDismissableMenu(open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
        onClick={() => setOpen((current) => !current)}
      >
        {`Pipeline: ${summaryLabel}`}
      </button>
      {open ? (
        <div className="absolute left-0 z-10 mt-2 min-w-64 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-lg">
          {availablePipelineCodes.map((pipelineCode) => (
            <label
              key={pipelineCode}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedPipelineCodes.includes(pipelineCode)}
                onChange={() => onToggle(pipelineCode)}
              />
              <span>{pipelineCode}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DownloadMenu({ pipelineCodes }: { pipelineCodes: string[] }) {
  const [open, setOpen] = useState(false);
  const query = buildPipelineQuery(pipelineCodes);
  const containerRef = useDismissableMenu(open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="secondary-button"
        onClick={() => setOpen((current) => !current)}
      >
        Download
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 min-w-52 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-lg">
          <a
            href={`/api/follow-up/export?scope=all${query ? `&${query}` : ""}`}
            className="block rounded-xl px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50"
          >
            All participants
          </a>
          <a
            href={`/api/follow-up/export?scope=completed${query ? `&${query}` : ""}`}
            className="block rounded-xl px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50"
          >
            Completed only
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function FollowUpResultsPage({
  initialData,
}: FollowUpResultsPageProps) {
  const [data, setData] = useState(initialData);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "all">("all");
  const [iv1Filter, setIv1Filter] = useState<"all" | "A" | "B">("all");
  const [iv2Filter, setIv2Filter] = useState<"all" | "A" | "B">("all");
  const [orderField, setOrderField] = useState<OrderField>("lastSubmissionAt");
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedPipelineCodes, setSelectedPipelineCodes] = useState(
    initialData.selectedPipelineCodes,
  );
  const [selectedFeedbackRow, setSelectedFeedbackRow] =
    useState<FollowUpResultsRow | null>(null);
  const [selectedAnswersRow, setSelectedAnswersRow] =
    useState<FollowUpResultsRow | null>(null);
  const [selectedFailureRow, setSelectedFailureRow] =
    useState<FollowUpResultsRow | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const rows = data.rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (iv1Filter !== "all" && row.iv1 !== iv1Filter) return false;
      if (iv2Filter !== "all" && row.iv2 !== iv2Filter) return false;
      if (!normalizedSearch) return true;

      return (
        row.pipelineCode.toLowerCase().includes(normalizedSearch) ||
        row.prolificId.toLowerCase().includes(normalizedSearch) ||
        row.feedbackContent.toLowerCase().includes(normalizedSearch) ||
        row.feedbackReason.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...rows].sort((left, right) => {
      const leftValue = left[orderField];
      const rightValue = right[orderField];
      if (leftValue === rightValue) return 0;
      const leftComparable = leftValue ?? "";
      const rightComparable = rightValue ?? "";
      if (leftComparable < rightComparable) {
        return orderDirection === "asc" ? -1 : 1;
      }
      return orderDirection === "asc" ? 1 : -1;
    });
  }, [data.rows, iv1Filter, iv2Filter, orderDirection, orderField, searchText, statusFilter]);

  async function refresh(pipelineCodes: string[] = selectedPipelineCodes) {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const query = buildPipelineQuery(pipelineCodes);
      const response = await fetch(`/api/follow-up/results${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as
        | ({ ok: true } & FollowUpResultsData)
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload ? payload.message : "Unable to load results.",
        );
      }

      setData({
        activePipelineCode: payload.activePipelineCode,
        availablePipelineCodes: payload.availablePipelineCodes,
        selectedPipelineCodes: payload.selectedPipelineCodes,
        summary: payload.summary,
        rows: payload.rows,
      });
      setSelectedPipelineCodes(payload.selectedPipelineCodes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load results.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function togglePipelineCode(pipelineCode: string) {
    const nextSelected = selectedPipelineCodes.includes(pipelineCode)
      ? selectedPipelineCodes.filter((code) => code !== pipelineCode)
      : [...selectedPipelineCodes, pipelineCode];

    if (nextSelected.length === 0) {
      return;
    }

    setSelectedPipelineCodes(nextSelected);
    await refresh(nextSelected);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/follow-up/logout", { method: "POST" });
    } finally {
      window.location.assign("/follow-up/login");
    }
  }

  function handleSort(field: OrderField) {
    setOrderField(field);
    setOrderDirection(
      orderField === field && orderDirection === "asc" ? "desc" : "asc",
    );
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <section className="hero-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="eyebrow">Follow-Up</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Results
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700">
              <span className="chip chip-neutral normal-case tracking-normal">
                Active {data.activePipelineCode}
              </span>
              <span className="chip chip-neutral normal-case tracking-normal">
                {data.rows.length} participants
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <DownloadMenu pipelineCodes={selectedPipelineCodes} />
            <button
              type="button"
              className="secondary-button"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link href="/follow-up/settings" className="secondary-button">
              Settings
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void logout()}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatusCard status="in_progress" summary={data.summary.in_progress} />
        <StatusCard status="failed" summary={data.summary.failed} />
        <StatusCard status="completed" summary={data.summary.completed} />
      </section>

      <section className="panel space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.currentTarget.value)}
            placeholder="Search participant or text…"
            className="block w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70 lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.currentTarget.value as AdminStatus | "all")}
              className="rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="all">All status</option>
              <option value="in_progress">In progress</option>
              <option value="failed">Failed</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={iv1Filter}
              onChange={(event) => setIv1Filter(event.currentTarget.value as "all" | "A" | "B")}
              className="rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="all">IV1 all</option>
              <option value="A">IV1 A</option>
              <option value="B">IV1 B</option>
            </select>
            <select
              value={iv2Filter}
              onChange={(event) => setIv2Filter(event.currentTarget.value as "all" | "A" | "B")}
              className="rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="all">IV2 all</option>
              <option value="A">IV2 A</option>
              <option value="B">IV2 B</option>
            </select>
            <PipelineMenu
              availablePipelineCodes={data.availablePipelineCodes}
              selectedPipelineCodes={selectedPipelineCodes}
              onToggle={(pipelineCode) => {
                void togglePipelineCode(pipelineCode);
              }}
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    <SortableHeader
                      label="Pipeline"
                      field="pipelineCode"
                      orderField={orderField}
                      orderDirection={orderDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <SortableHeader
                      label="Participant"
                      field="prolificId"
                      orderField={orderField}
                      orderDirection={orderDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <SortableHeader
                      label="Status"
                      field="status"
                      orderField={orderField}
                      orderDirection={orderDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Condition</th>
                  <th className="px-4 py-3 font-semibold">
                    <SortableHeader
                      label="Updated"
                      field="lastSubmissionAt"
                      orderField={orderField}
                      orderDirection={orderDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <SortableHeader
                      label="Duration"
                      field="totalSeconds"
                      orderField={orderField}
                      orderDirection={orderDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Feedback</th>
                  <th className="px-4 py-3 font-semibold">Answers</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredRows.map((row) => (
                  <tr key={`${row.pipelineCode}:${row.prolificId}`} className="border-t border-slate-200 align-middle">
                    <td className="px-4 py-3 text-slate-700">
                      {row.pipelineCode}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-900">
                      {row.prolificId}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "failed" ? (
                        <button
                          type="button"
                          className={`chip normal-case tracking-normal ${statusMeta[row.status].chipClass}`}
                          onClick={() => setSelectedFailureRow(row)}
                        >
                          {statusMeta[row.status].label}
                        </button>
                      ) : (
                        <span className={`chip normal-case tracking-normal ${statusMeta[row.status].chipClass}`}>
                          {statusMeta[row.status].label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      IV1 {row.iv1} / IV2 {row.iv2}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(row.lastSubmissionAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDuration(row.totalSeconds)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.hasFeedback ? (
                        <button
                          type="button"
                          className="secondary-button px-4 py-2"
                          onClick={() => setSelectedFeedbackRow(row)}
                        >
                          Yes
                        </button>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <button
                        type="button"
                        className="secondary-button px-4 py-2"
                        onClick={() => setSelectedAnswersRow(row)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No participants match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedFeedbackRow ? (
        <div className="modal-backdrop" onClick={() => setSelectedFeedbackRow(null)}>
          <div className="modal-card max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Feedback</h2>
                <p className="body-copy mt-2">{selectedFeedbackRow.prolificId}</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedFeedbackRow(null)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="hero-metric-label">Content</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {selectedFeedbackRow.feedbackContent.trim() || "—"}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="hero-metric-label">Reason</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {selectedFeedbackRow.feedbackReason.trim() || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedFailureRow ? (
        <div className="modal-backdrop" onClick={() => setSelectedFailureRow(null)}>
          <div className="modal-card max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Failed Reason</h2>
                <p className="body-copy mt-2">{selectedFailureRow.prolificId}</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedFailureRow(null)}
              >
                Close
              </button>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="whitespace-pre-wrap text-sm text-slate-800">
                {selectedFailureRow.failureReasonText.trim() || "—"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedAnswersRow ? (
        <div className="modal-backdrop" onClick={() => setSelectedAnswersRow(null)}>
          <div className="modal-card max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Answers</h2>
                <p className="body-copy mt-2">{selectedAnswersRow.prolificId}</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedAnswersRow(null)}
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-[1.25rem] border border-slate-200">
              <div className="max-h-[60vh] overflow-auto">
                <div className="space-y-4 p-4">
                  {selectedAnswersRow.answerGroups.map((group) => (
                    <section
                      key={group.stageId}
                      className="overflow-hidden rounded-[1.25rem] border border-slate-200"
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                          {group.stageId}
                        </h3>
                      </div>
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-white text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Item</th>
                            <th className="px-4 py-3 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {group.entries.map((entry) => (
                            <tr key={`${group.stageId}-${entry.label}`} className="border-t border-slate-200 align-top">
                              <td className="px-4 py-3 font-mono text-xs text-slate-700">
                                {entry.label}
                              </td>
                              <td className="px-4 py-3 whitespace-pre-wrap text-slate-800">
                                {entry.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ))}
                  {selectedAnswersRow.answerGroups.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500">
                      No answer items recorded.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
