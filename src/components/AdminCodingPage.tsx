import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import type { AdminCodingDataResponse, AdminCodingParticipant } from "@/lib/admin-coding";
import type { ApiErrorResponse } from "@/lib/types";

// ─── Coding types ─────────────────────────────────────────────────────────────

type Score = 0 | 1 | 2;

const MAIN_DIMENSIONS = [
  { key: "response_quality" as const, label: "Response Quality" },
  { key: "request_understanding" as const, label: "Request Understanding" },
  { key: "task_completion" as const, label: "Task Completion" },
  { key: "issue_reporting" as const, label: "Issue Reporting" },
  { key: "improvement_advice" as const, label: "Improvement Advice" },
] as const;

type MainDimensionKey = (typeof MAIN_DIMENSIONS)[number]["key"];

type ParticipantCoding = {
  [K in MainDimensionKey]: Score | null;
} & {
  affective_score: Score | null;
  has_feedback: 0 | 1;
  coded: boolean;
  coded_at: string | null;
};

type CodingStore = Record<string, ParticipantCoding>;

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "feedback_coding_v1";

function loadStore(): CodingStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CodingStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: CodingStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function defaultCoding(participant: AdminCodingParticipant): ParticipantCoding {
  return {
    response_quality: null,
    request_understanding: null,
    task_completion: null,
    issue_reporting: null,
    improvement_advice: null,
    affective_score: null,
    has_feedback: participant.feedback_content ? 1 : 0,
    coded: false,
    coded_at: null,
  };
}

function getParticipantCoding(
  store: CodingStore,
  participant: AdminCodingParticipant,
): ParticipantCoding {
  return store[participant.prolific_id] ?? defaultCoding(participant);
}

// ─── Derived scores ───────────────────────────────────────────────────────────

function deriveScores(coding: ParticipantCoding) {
  if (coding.has_feedback === 0) {
    return { elaboration_score: null, coverage_score: null, affective_present: null };
  }
  const mainValues = MAIN_DIMENSIONS.map((d) => coding[d.key]);
  const allFilled = mainValues.every((v) => v !== null);

  const elaboration_score = allFilled
    ? mainValues.reduce<number>((acc, v) => acc + (v ?? 0), 0)
    : null;

  const coverage_score = allFilled
    ? mainValues.reduce<number>((acc, v) => acc + (v !== null && v > 0 ? 1 : 0), 0)
    : null;

  const affective_present =
    coding.affective_score !== null ? (coding.affective_score > 0 ? 1 : 0) : null;

  return { elaboration_score, coverage_score, affective_present };
}

// ─── Export ───────────────────────────────────────────────────────────────────

type ExportRow = {
  prolific_id: string;
  iv1: string;
  iv2: string;
  feedback_content: string;
  has_feedback: number | "";
  response_quality: number | "";
  request_understanding: number | "";
  task_completion: number | "";
  issue_reporting: number | "";
  improvement_advice: number | "";
  elaboration_score: number | "";
  coverage_score: number | "";
  affective_score: number | "";
  affective_present: number | "";
};

function buildExportRows(
  participants: AdminCodingParticipant[],
  store: CodingStore,
): ExportRow[] {
  return participants.map((p) => {
    const coding = getParticipantCoding(store, p);
    const { elaboration_score, coverage_score, affective_present } = deriveScores(coding);
    const noFeedback = coding.has_feedback === 0;
    return {
      prolific_id: p.prolific_id,
      iv1: p.iv1,
      iv2: p.iv2,
      feedback_content: p.feedback_content ?? "",
      has_feedback: coding.has_feedback,
      response_quality: noFeedback ? "" : (coding.response_quality ?? ""),
      request_understanding: noFeedback ? "" : (coding.request_understanding ?? ""),
      task_completion: noFeedback ? "" : (coding.task_completion ?? ""),
      issue_reporting: noFeedback ? "" : (coding.issue_reporting ?? ""),
      improvement_advice: noFeedback ? "" : (coding.improvement_advice ?? ""),
      elaboration_score: elaboration_score ?? "",
      coverage_score: coverage_score ?? "",
      affective_score: noFeedback ? "" : (coding.affective_score ?? ""),
      affective_present: affective_present ?? "",
    };
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(participants: AdminCodingParticipant[], store: CodingStore) {
  const rows = buildExportRows(participants, store);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = String(row[h]);
          return v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"`
            : v;
        })
        .join(","),
    ),
  ].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob(["﻿" + csvLines], { type: "text/csv;charset=utf-8;" }),
    `feedback_coding_${date}.csv`,
  );
}

function exportJSON(participants: AdminCodingParticipant[], store: CodingStore) {
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([JSON.stringify(buildExportRows(participants, store), null, 2)], {
      type: "application/json",
    }),
    `feedback_coding_${date}.json`,
  );
}

// ─── Score button ─────────────────────────────────────────────────────────────

function ScoreButton({
  value,
  selected,
  disabled,
  onClick,
}: {
  value: Score;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-9 w-9 rounded-full text-sm font-semibold transition",
        disabled
          ? "border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
          : selected
            ? "bg-slate-950 text-white shadow-sm"
            : "border border-slate-300 bg-white text-slate-600 hover:border-slate-600 hover:text-slate-950",
      ].join(" ")}
    >
      {value}
    </button>
  );
}

// ─── Dimension row ────────────────────────────────────────────────────────────

function DimensionRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: Score | null;
  disabled?: boolean;
  onChange: (v: Score) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className={`text-sm ${disabled ? "text-slate-400" : "text-slate-700"}`}>{label}</span>
      <div className="flex shrink-0 gap-1.5">
        {([0, 1, 2] as Score[]).map((s) => (
          <ScoreButton
            key={s}
            value={s}
            selected={value === s}
            disabled={disabled}
            onClick={() => onChange(s)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-950">
        {value !== null ? value : <span className="text-sm text-slate-400">—</span>}
      </div>
    </div>
  );
}

// ─── Has-feedback toggle ──────────────────────────────────────────────────────

function HasFeedbackToggle({
  value,
  onChange,
}: {
  value: 0 | 1;
  onChange: (v: 0 | 1) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">Has Feedback</div>
        <div className="text-xs text-slate-500">
          {value === 1 ? "Content counts as codeable feedback" : "No codeable feedback (skip dimensions)"}
        </div>
      </div>
      <div className="flex gap-1.5">
        {([1, 0] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={[
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              value === v
                ? v === 1
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:border-slate-500",
            ].join(" ")}
          >
            {v === 1 ? "Yes (1)" : "No (0)"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Coding form ──────────────────────────────────────────────────────────────

function CodingForm({
  participant,
  coding,
  onChange,
  onToggleCoded,
}: {
  participant: AdminCodingParticipant;
  coding: ParticipantCoding;
  onChange: (update: Partial<ParticipantCoding>) => void;
  onToggleCoded: () => void;
}) {
  const { elaboration_score, coverage_score, affective_present } = deriveScores(coding);
  const noFeedback = coding.has_feedback === 0;
  const mainFilled = noFeedback || MAIN_DIMENSIONS.every((d) => coding[d.key] !== null);
  const allFilled = mainFilled && (noFeedback || coding.affective_score !== null);

  const statusChipClass = participant.status === "completed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : participant.status === "failed"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="space-y-5">
      {/* Participant header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-slate-900">
          {participant.prolific_id}
        </span>
        <span className="chip chip-neutral normal-case tracking-normal">IV1 {participant.iv1}</span>
        <span className="chip chip-neutral normal-case tracking-normal">IV2 {participant.iv2}</span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusChipClass}`}>
          {participant.status === "completed" ? "Completed" : participant.status === "failed" ? "Failed" : "In Progress"}
        </span>
        {coding.coded ? (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Coded ✓
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Not coded
          </span>
        )}
      </div>

      {/* Feedback content */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Feedback Content
        </div>
        <div
          className={`max-h-52 overflow-y-auto rounded-[1.25rem] border px-4 py-3 ${participant.feedback_content ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-200 bg-slate-50/60"}`}
        >
          {participant.feedback_content ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {participant.feedback_content}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">No feedback content submitted.</p>
          )}
        </div>
      </div>

      {/* Has feedback toggle */}
      <HasFeedbackToggle
        value={coding.has_feedback}
        onChange={(v) => onChange({ has_feedback: v })}
      />

      {/* Main dimensions */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Content Dimensions
          {noFeedback && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-500">
              skipped (no feedback)
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100 rounded-[1.25rem] border border-slate-200 bg-white px-4">
          {MAIN_DIMENSIONS.map((dim) => (
            <DimensionRow
              key={dim.key}
              label={dim.label}
              value={coding[dim.key]}
              disabled={noFeedback}
              onChange={(v) => onChange({ [dim.key]: v })}
            />
          ))}
        </div>
      </div>

      {/* Derived scores */}
      <div className="flex gap-2">
        <StatChip label="Elaboration Score" value={elaboration_score} />
        <StatChip label="Coverage Score" value={coverage_score} />
      </div>

      {/* Affective */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Affective Coding
          {noFeedback && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-500">
              skipped (no feedback)
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100 rounded-[1.25rem] border border-slate-200 bg-white px-4">
          <DimensionRow
            label="Affective Score"
            value={coding.affective_score}
            disabled={noFeedback}
            onChange={(v) => onChange({ affective_score: v })}
          />
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className={`text-sm ${noFeedback ? "text-slate-400" : "text-slate-500"}`}>
              Affective Present (derived)
            </span>
            <span className="font-mono text-sm font-semibold text-slate-900">
              {affective_present !== null ? affective_present : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Mark as coded */}
      <button
        type="button"
        onClick={onToggleCoded}
        className={allFilled || coding.coded ? "primary-button w-full" : "secondary-button w-full"}
      >
        {coding.coded ? "Unmark as Coded" : "Mark as Coded"}
      </button>

      {!allFilled && !coding.coded && !noFeedback && (
        <p className="text-center text-xs text-slate-400">
          Fill all dimensions to mark as coded
        </p>
      )}
    </div>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function CodingListItem({
  participant,
  coding,
  selected,
  onClick,
}: {
  participant: AdminCodingParticipant;
  coding: ParticipantCoding | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const c = coding ?? defaultCoding(participant);
  const noFeedback = c.has_feedback === 0;

  const filledCount = noFeedback
    ? 6
    : MAIN_DIMENSIONS.filter((d) => c[d.key] !== null).length +
      (c.affective_score !== null ? 1 : 0);
  const isComplete = filledCount === 6 || noFeedback;
  const isPartial = !noFeedback && filledCount > 0 && !isComplete;

  let badgeClass = "border-slate-200 bg-slate-100 text-slate-400";
  let badgeText = "—";
  if (c.coded) {
    badgeClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
    badgeText = "Done";
  } else if (noFeedback) {
    badgeClass = "border-slate-300 bg-slate-100 text-slate-500";
    badgeText = "Skip";
  } else if (isComplete) {
    badgeClass = "border-teal-200 bg-teal-50 text-teal-700";
    badgeText = "Full";
  } else if (isPartial) {
    badgeClass = "border-amber-200 bg-amber-50 text-amber-700";
    badgeText = `${filledCount}/6`;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[1.25rem] border p-3 text-left transition",
        selected
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white hover:border-slate-400",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="truncate font-mono text-xs font-semibold">
            {participant.prolific_id}
          </div>
          <div className="flex gap-1">
            {(["iv1", "iv2"] as const).map((key) => (
              <span
                key={key}
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selected ? "bg-white/15 text-white/70" : "bg-slate-100 text-slate-500"}`}
              >
                {key.toUpperCase()} {participant[key]}
              </span>
            ))}
            {!participant.feedback_content && !selected && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                no content
              </span>
            )}
          </div>
        </div>
        {!selected && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
          >
            {badgeText}
          </span>
        )}
      </div>
      {!selected && participant.feedback_content && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
          {participant.feedback_content.slice(0, 120)}
        </p>
      )}
    </button>
  );
}

// ─── Filter toggle group ──────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "flex-1 rounded-lg py-1.5 text-xs font-semibold transition",
            value === opt.value
              ? "bg-slate-950 text-white"
              : "border border-slate-200 text-slate-600 hover:border-slate-400",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type AdminCodingPageProps = {
  initialData: AdminCodingDataResponse;
  onLogout: () => void;
};

export function AdminCodingPage({ initialData, onLogout }: AdminCodingPageProps) {
  const [data, setData] = useState<AdminCodingDataResponse>(initialData);
  const [codingStore, setCodingStore] = useState<CodingStore>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [iv1Filter, setIv1Filter] = useState<"all" | "A" | "B">("all");
  const [iv2Filter, setIv2Filter] = useState<"all" | "A" | "B">("all");
  const [codedFilter, setCodedFilter] = useState<"all" | "coded" | "uncoded">("all");
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "has" | "none">("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    setCodingStore(loadStore());
  }, []);

  const allParticipants = data.participants;

  const filteredParticipants = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return allParticipants.filter((p) => {
      if (iv1Filter !== "all" && p.iv1 !== iv1Filter) return false;
      if (iv2Filter !== "all" && p.iv2 !== iv2Filter) return false;
      if (feedbackFilter === "has" && !p.feedback_content) return false;
      if (feedbackFilter === "none" && p.feedback_content) return false;
      const c = codingStore[p.prolific_id];
      if (codedFilter === "coded" && !c?.coded) return false;
      if (codedFilter === "uncoded" && c?.coded) return false;
      if (search) {
        return (
          p.prolific_id.toLowerCase().includes(search) ||
          (p.feedback_content?.toLowerCase().includes(search) ?? false)
        );
      }
      return true;
    });
  }, [allParticipants, iv1Filter, iv2Filter, codedFilter, feedbackFilter, searchText, codingStore]);

  const selectedParticipant = useMemo(
    () => allParticipants.find((p) => p.prolific_id === selectedId) ?? null,
    [allParticipants, selectedId],
  );

  const selectedCoding = useMemo(
    () =>
      selectedParticipant
        ? getParticipantCoding(codingStore, selectedParticipant)
        : null,
    [selectedParticipant, codingStore],
  );

  const progress = useMemo(() => {
    const coded = allParticipants.filter((p) => codingStore[p.prolific_id]?.coded).length;
    return { coded, total: allParticipants.length };
  }, [allParticipants, codingStore]);

  const selectedIndex = filteredParticipants.findIndex((p) => p.prolific_id === selectedId);

  const updateCoding = useCallback(
    (prolificId: string, participant: AdminCodingParticipant, update: Partial<ParticipantCoding>) => {
      setCodingStore((prev) => {
        const existing = prev[prolificId] ?? defaultCoding(participant);
        const next = { ...prev, [prolificId]: { ...existing, ...update } };
        saveStore(next);
        return next;
      });
    },
    [],
  );

  const toggleCoded = useCallback(
    (prolificId: string, participant: AdminCodingParticipant) => {
      setCodingStore((prev) => {
        const existing = prev[prolificId] ?? defaultCoding(participant);
        const coded = !existing.coded;
        const next = {
          ...prev,
          [prolificId]: {
            ...existing,
            coded,
            coded_at: coded ? new Date().toISOString() : null,
          },
        };
        saveStore(next);
        return next;
      });
    },
    [],
  );

  async function refreshData() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/coding-data");
      const payload = (await res.json()) as AdminCodingDataResponse | ApiErrorResponse;
      if (payload.ok) setData(payload as AdminCodingDataResponse);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  function goNext() {
    if (selectedIndex < filteredParticipants.length - 1) {
      setSelectedId(filteredParticipants[selectedIndex + 1].prolific_id);
    }
  }

  function goPrev() {
    if (selectedIndex > 0) {
      setSelectedId(filteredParticipants[selectedIndex - 1].prolific_id);
    }
  }

  const progressPct =
    progress.total > 0 ? Math.round((progress.coded / progress.total) * 100) : 0;

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-white">
      {/* ── Top bar ── */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-4">
          <span className="eyebrow">Admin · Coding</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {progress.coded} / {progress.total} coded
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/feedback" className="secondary-button px-4 py-2 text-xs">
            Feedback
          </Link>
          <Link href="/admin/stats" className="secondary-button px-4 py-2 text-xs">
            Stats
          </Link>
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={refreshing}
            className="secondary-button px-4 py-2 text-xs"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => exportCSV(allParticipants, codingStore)}
            className="secondary-button px-4 py-2 text-xs"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportJSON(allParticipants, codingStore)}
            className="secondary-button px-4 py-2 text-xs"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="secondary-button px-4 py-2 text-xs"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1">
        {/* Left: list panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          {/* Filters */}
          <div className="space-y-2 border-b border-slate-200 bg-white p-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.currentTarget.value)}
              placeholder="Search ID or content…"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            <ToggleGroup
              value={iv1Filter}
              onChange={setIv1Filter}
              options={[
                { value: "all", label: "IV1 All" },
                { value: "A", label: "IV1 A" },
                { value: "B", label: "IV1 B" },
              ]}
            />
            <ToggleGroup
              value={iv2Filter}
              onChange={setIv2Filter}
              options={[
                { value: "all", label: "IV2 All" },
                { value: "A", label: "IV2 A" },
                { value: "B", label: "IV2 B" },
              ]}
            />
            <ToggleGroup
              value={feedbackFilter}
              onChange={setFeedbackFilter}
              options={[
                { value: "all", label: "All" },
                { value: "has", label: "Has Content" },
                { value: "none", label: "No Content" },
              ]}
            />
            <ToggleGroup
              value={codedFilter}
              onChange={setCodedFilter}
              options={[
                { value: "all", label: "All" },
                { value: "coded", label: "Done" },
                { value: "uncoded", label: "Todo" },
              ]}
            />
            <div className="pt-0.5 text-right text-[10px] text-slate-400">
              {filteredParticipants.length} of {allParticipants.length}
            </div>
          </div>

          {/* Participant list */}
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {filteredParticipants.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No entries match filters
              </div>
            ) : (
              filteredParticipants.map((p) => (
                <CodingListItem
                  key={p.prolific_id}
                  participant={p}
                  coding={codingStore[p.prolific_id]}
                  selected={selectedId === p.prolific_id}
                  onClick={() => setSelectedId(p.prolific_id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right: coding panel */}
        <main className="flex min-w-0 flex-1 flex-col">
          {selectedParticipant && selectedCoding ? (
            <>
              {/* Navigation bar */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
                <span className="text-xs text-slate-500">
                  {selectedIndex + 1} / {filteredParticipants.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={selectedIndex <= 0}
                    className="secondary-button px-4 py-1.5 text-xs disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={selectedIndex >= filteredParticipants.length - 1}
                    className="secondary-button px-4 py-1.5 text-xs disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="mx-auto max-w-lg">
                  <CodingForm
                    participant={selectedParticipant}
                    coding={selectedCoding}
                    onChange={(update) =>
                      updateCoding(selectedParticipant.prolific_id, selectedParticipant, update)
                    }
                    onToggleCoded={() =>
                      toggleCoded(selectedParticipant.prolific_id, selectedParticipant)
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
              <div className="text-4xl">←</div>
              <p className="text-sm">Select a participant to start coding</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
