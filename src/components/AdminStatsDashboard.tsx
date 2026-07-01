import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataGrid, type CellMouseArgs, type Column, type SortColumn } from "react-data-grid";

import type {
  AdminConstructDefinition,
  AdminStatisticsResponse,
  AdminStatsParticipantRow,
  ApiErrorResponse,
} from "@/lib/types";

type AdminStatsDashboardProps = {
  initialData: AdminStatisticsResponse;
  onLogout: () => void;
};

type IvMode = "iv1" | "iv2";

type SheetRow = Record<string, unknown> & {
  id: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  manipulation1: string;
  manipulation2: number | null;
  feedback_content_flag: string;
  feedback_reason_flag: string;
  __source: AdminStatsParticipantRow;
};

type DetailState =
  | {
      kind: "construct";
      participantId: string;
      construct: AdminConstructDefinition;
      values: Array<{ key: string; sourceKey: string; value: unknown }>;
    }
  | {
      kind: "text";
      participantId: string;
      title: string;
      content: string;
    }
  | null;

type ComparisonDatum = AdminConstructDefinition & {
  overallMean: number | null;
  conditionAMean: number | null;
  conditionBMean: number | null;
  conditionACount: number;
  conditionBCount: number;
};

type ComparisonGroup = {
  familyKey: string;
  familyLabel: string;
  left: ComparisonDatum | null;
  right: ComparisonDatum | null;
  layout: "pair" | "single";
};

const IV_COLORS = {
  A: { fill: "#f59e0b", label: "Condition A" },
  B: { fill: "#0f766e", label: "Condition B" },
} as const;

// IV1 A sees a subtle notice → should NOT recall it → correct = "no"
// IV1 B sees a prominent notice → should recall it → correct = "yes"
const MANIPULATION1_CORRECT: Record<string, string> = {
  A: "no",
  B: "yes",
};

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function formatCount(value: unknown) {
  return typeof value === "number" ? String(value) : "0";
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value.trim().length > 0 ? value : "—";
  return JSON.stringify(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeManipulationChoiceLabel(value: unknown) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "dont_recall") return "Don't recall";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return "—";
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildConstructComparisonData(
  constructs: AdminConstructDefinition[],
  rows: AdminStatsParticipantRow[],
  ivMode: IvMode,
): ComparisonDatum[] {
  return constructs
    .map((construct) => {
      const allValues = rows
        .map((row) => row.construct_averages[construct.id])
        .filter((v): v is number => typeof v === "number");
      const aValues = rows
        .filter((row) => row[ivMode] === "A")
        .map((row) => row.construct_averages[construct.id])
        .filter((v): v is number => typeof v === "number");
      const bValues = rows
        .filter((row) => row[ivMode] === "B")
        .map((row) => row.construct_averages[construct.id])
        .filter((v): v is number => typeof v === "number");
      return {
        ...construct,
        overallMean: average(allValues),
        conditionAMean: average(aValues),
        conditionBMean: average(bValues),
        conditionACount: aValues.length,
        conditionBCount: bValues.length,
      };
    })
    .filter((c): c is ComparisonDatum => c.overallMean !== null);
}

function buildComparisonGroups(constructData: ComparisonDatum[]): ComparisonGroup[] {
  const explicitPairs = [
    {
      familyKey: "SCS",
      familyLabel: "Self-Construal Scale",
      leftId: "SCS_INTER",
      rightId: "SCS_IND",
    },
    {
      familyKey: "FEEDBACK_MOTIVATION",
      familyLabel: "Feedback Motivation",
      leftId: "RESP_EFF",
      rightId: "GUILT",
    },
  ] as const;

  const remaining = new Map(constructData.map((c) => [c.id, c]));
  const pairs = new Map<string, { pre?: ComparisonDatum; post?: ComparisonDatum }>();
  const remainder: ComparisonDatum[] = [];

  const explicitPairGroups: ComparisonGroup[] = explicitPairs.flatMap((pair) => {
    const left = remaining.get(pair.leftId) ?? null;
    const right = remaining.get(pair.rightId) ?? null;
    if (!left && !right) return [];
    if (left) remaining.delete(pair.leftId);
    if (right) remaining.delete(pair.rightId);
    return [{ familyKey: pair.familyKey, familyLabel: pair.familyLabel, left, right, layout: "pair" as const }];
  });

  for (const construct of remaining.values()) {
    const preMatch = construct.id.match(/^PRE_(.+)$/);
    const postMatch = construct.id.match(/^POST_(.+)$/);
    if (preMatch) {
      const entry = pairs.get(preMatch[1]) ?? {};
      entry.pre = construct;
      pairs.set(preMatch[1], entry);
      continue;
    }
    if (postMatch) {
      const entry = pairs.get(postMatch[1]) ?? {};
      entry.post = construct;
      pairs.set(postMatch[1], entry);
      continue;
    }
    remainder.push(construct);
  }

  const pairedGroups: ComparisonGroup[] = Array.from(pairs.entries()).map(
    ([familyKey, entry]) => ({
      familyKey,
      familyLabel:
        entry.pre?.label.replace(/^Pre\s+/, "") ??
        entry.post?.label.replace(/^Post\s+/, "") ??
        familyKey,
      left: entry.pre ?? null,
      right: entry.post ?? null,
      layout: "pair" as const,
    }),
  );

  const remainderGroups: ComparisonGroup[] = remainder.map((c) => ({
    familyKey: c.id,
    familyLabel: c.label,
    left: c,
    right: null,
    layout: "single" as const,
  }));

  return [...explicitPairGroups, ...pairedGroups, ...remainderGroups];
}

function buildManipulation1ChartData(rows: AdminStatsParticipantRow[]) {
  return ["yes", "no", "dont_recall"].map((optionKey) => ({
    option: normalizeManipulationChoiceLabel(optionKey),
    A: rows.filter(
      (row) => row.iv1 === "A" && row.response_values["post_questionnaire.MANIPULATION_IV1"] === optionKey,
    ).length,
    B: rows.filter(
      (row) => row.iv1 === "B" && row.response_values["post_questionnaire.MANIPULATION_IV1"] === optionKey,
    ).length,
  }));
}

function buildSheetRows(rows: AdminStatsParticipantRow[]): SheetRow[] {
  return rows.map((row) => ({
    id: row.prolific_id,
    prolific_id: row.prolific_id,
    iv1: row.iv1,
    iv2: row.iv2,
    manipulation1: normalizeManipulationChoiceLabel(row.response_values["post_questionnaire.MANIPULATION_IV1"]),
    manipulation2:
      typeof row.construct_averages.MANIPULATION_IV2 === "number"
        ? row.construct_averages.MANIPULATION_IV2
        : null,
    feedback_content_flag: hasNonEmptyString(row.response_values["stage_6.FEEDBACK_CONTENT"])
      ? "Has"
      : "No",
    feedback_reason_flag: hasNonEmptyString(row.response_values["post_questionnaire.FEEDBACK_REASON"])
      ? "Has"
      : "No",
    __source: row,
  }));
}

/* ── Chart components ── */

function ConditionBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function TwoConditionAverageChart({
  title,
  subtitle,
  maxValue,
  overallMean,
  conditionAMean,
  conditionBMean,
  ivLabel = "IV",
}: {
  title: string;
  subtitle?: string;
  maxValue: number;
  overallMean: number | null;
  conditionAMean: number | null;
  conditionBMean: number | null;
  ivLabel?: string;
}) {
  const delta =
    conditionAMean !== null && conditionBMean !== null
      ? conditionAMean - conditionBMean
      : null;

  const chartData = [
    { condition: `${ivLabel} A`, value: conditionAMean ?? 0, fill: IV_COLORS.A.fill },
    { condition: `${ivLabel} B`, value: conditionBMean ?? 0, fill: IV_COLORS.B.fill },
  ];

  return (
    <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Overall Avg
          </div>
          <div className="mt-0.5 text-lg font-semibold text-slate-950">
            {formatScore(overallMean)}
          </div>
          <div className="text-[11px] text-slate-400">/ {maxValue}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <ConditionBadge
          label={`${ivLabel} A`}
          value={formatScore(conditionAMean)}
          color={IV_COLORS.A.fill}
        />
        <ConditionBadge
          label={`${ivLabel} B`}
          value={formatScore(conditionBMean)}
          color={IV_COLORS.B.fill}
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Delta (A−B)
          </div>
          <div
            className={[
              "mt-1 text-lg font-semibold",
              delta === null
                ? "text-slate-400"
                : delta > 0
                  ? "text-amber-700"
                  : delta < 0
                    ? "text-teal-700"
                    : "text-slate-700",
            ].join(" ")}
          >
            {delta !== null
              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 h-48 rounded-[1rem] border border-slate-200 bg-slate-50/60 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 6, right: 32, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxValue]}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="condition"
              width={56}
              tick={{ fill: "#334155", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: unknown) =>
                typeof value === "number" ? value.toFixed(2) : String(value)
              }
            />
            {overallMean !== null ? (
              <ReferenceLine
                x={overallMean}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{
                  value: `Avg ${overallMean.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "#64748b",
                  fontSize: 10,
                }}
              />
            ) : null}
            <Bar dataKey="value" radius={[0, 999, 999, 0]} maxBarSize={26}>
              {chartData.map((entry) => (
                <Cell key={entry.condition} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: unknown) =>
                  typeof v === "number" ? v.toFixed(2) : String(v)
                }
                style={{ fontSize: 11, fill: "#475569" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Manipulation1Chart({ rows }: { rows: AdminStatsParticipantRow[] }) {
  const chartData = buildManipulation1ChartData(rows);
  const maxValue = Math.max(1, ...chartData.flatMap((item) => [item.A, item.B]));

  const totalA = rows.filter((r) => r.iv1 === "A").length;
  const totalB = rows.filter((r) => r.iv1 === "B").length;

  // IV1 A correct = "no", IV1 B correct = "yes"
  const correctA = rows.filter(
    (r) => r.iv1 === "A" && r.response_values["post_questionnaire.MANIPULATION_IV1"] === MANIPULATION1_CORRECT.A,
  ).length;
  const correctB = rows.filter(
    (r) => r.iv1 === "B" && r.response_values["post_questionnaire.MANIPULATION_IV1"] === MANIPULATION1_CORRECT.B,
  ).length;

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
              IV1 A — correct: No
            </span>
          </div>
          <div className="mt-1.5 text-3xl font-semibold text-amber-950">
            {correctA}
            <span className="ml-1 text-base text-amber-600">/ {totalA}</span>
          </div>
          <div className="mt-0.5 text-xs text-amber-700">
            {totalA > 0 ? Math.round((correctA / totalA) * 100) : 0}% correct
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-teal-200 bg-teal-50 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
              IV1 B — correct: Yes
            </span>
          </div>
          <div className="mt-1.5 text-3xl font-semibold text-teal-950">
            {correctB}
            <span className="ml-1 text-base text-teal-600">/ {totalB}</span>
          </div>
          <div className="mt-0.5 text-xs text-teal-700">
            {totalB > 0 ? Math.round((correctB / totalB) * 100) : 0}% correct
          </div>
        </div>
      </div>

      <div className="h-52 rounded-[1rem] border border-slate-200 bg-slate-50/60 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 28, left: 8, bottom: 0 }}
            barCategoryGap={12}
          >
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" domain={[0, maxValue]} tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="option"
              width={80}
              tick={{ fill: "#334155", fontSize: 11 }}
            />
            <Tooltip />
            <Bar
              dataKey="A"
              name="IV1 A"
              fill={IV_COLORS.A.fill}
              radius={[0, 999, 999, 0]}
              maxBarSize={16}
            >
              <LabelList dataKey="A" position="right" formatter={formatCount} style={{ fontSize: 11 }} />
            </Bar>
            <Bar
              dataKey="B"
              name="IV1 B"
              fill={IV_COLORS.B.fill}
              radius={[0, 999, 999, 0]}
              maxBarSize={16}
            >
              <LabelList dataKey="B" position="right" formatter={formatCount} style={{ fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const MANIPULATION2_THRESHOLD = 3.5;

function IncorrectRespondersManip2Panel({
  rows,
  constructs,
}: {
  rows: AdminStatsParticipantRow[];
  constructs: AdminConstructDefinition[];
}) {
  const [expanded, setExpanded] = useState(true);

  // IV2 A: expected low → flag if score < 3.5
  // IV2 B: expected high → flag if score > 3.5
  const incorrectRows = rows.filter((row) => {
    const m2 = row.construct_averages.MANIPULATION_IV2;
    if (typeof m2 !== "number") return false;
    if (row.iv2 === "A") return m2 < MANIPULATION2_THRESHOLD;
    if (row.iv2 === "B") return m2 > MANIPULATION2_THRESHOLD;
    return false;
  });

  const incorrectA = incorrectRows.filter((r) => r.iv2 === "A");
  const incorrectB = incorrectRows.filter((r) => r.iv2 === "B");

  return (
    <div className="rounded-[1.65rem] border border-teal-100 bg-teal-50/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-300 bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Manipulation 2 — Incorrect Responders
            </span>
            <span className="text-sm font-semibold text-slate-700">
              n = {incorrectRows.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              <span className="font-semibold" style={{ color: IV_COLORS.A.fill }}>IV2 A</span>
              {" "}below {MANIPULATION2_THRESHOLD}:{" "}
              <span className="font-semibold text-red-700">{incorrectA.length}</span>
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold" style={{ color: IV_COLORS.B.fill }}>IV2 B</span>
              {" "}above {MANIPULATION2_THRESHOLD}:{" "}
              <span className="font-semibold text-red-700">{incorrectB.length}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button shrink-0 px-4 py-2 text-xs"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded ? (
        incorrectRows.length === 0 ? (
          <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm font-semibold text-emerald-700">
            All participants within expected range.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.25rem] border border-teal-100 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Participant
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV1
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV2
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-teal-600">
                    Manip 2 Avg
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Expected
                  </th>
                  {constructs.map((c) => (
                    <th
                      key={c.id}
                      className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.11em] text-slate-500"
                      title={c.id}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incorrectRows.map((row) => {
                  const m2 = row.construct_averages.MANIPULATION_IV2 as number;
                  const expectedDir = row.iv2 === "A" ? `< ${MANIPULATION2_THRESHOLD}` : `> ${MANIPULATION2_THRESHOLD}`;
                  return (
                    <tr
                      key={row.prolific_id}
                      className="border-t border-slate-100 transition hover:bg-teal-50/30"
                    >
                      <td className="sticky left-0 bg-white px-4 py-3 font-mono text-xs text-slate-800">
                        {row.prolific_id}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: IV_COLORS[row.iv1 as "A" | "B"]?.fill ?? "#94a3b8" }}
                        >
                          {row.iv1}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: IV_COLORS[row.iv2 as "A" | "B"]?.fill ?? "#94a3b8" }}
                        >
                          {row.iv2}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          {formatScore(m2)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">
                        {expectedDir}
                      </td>
                      {constructs.map((c) => (
                        <td key={c.id} className="px-3 py-3 text-right">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            {formatScore(row.construct_averages[c.id])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

function IncorrectRespondersPanel({
  rows,
  constructs,
  manipulation2Construct,
}: {
  rows: AdminStatsParticipantRow[];
  constructs: AdminConstructDefinition[];
  manipulation2Construct: AdminConstructDefinition | null;
}) {
  const [expanded, setExpanded] = useState(true);

  const incorrectRows = rows.filter((row) => {
    const answer = row.response_values["post_questionnaire.MANIPULATION_IV1"];
    return answer !== MANIPULATION1_CORRECT[row.iv1];
  });

  const incorrectA = incorrectRows.filter((r) => r.iv1 === "A");
  const incorrectB = incorrectRows.filter((r) => r.iv1 === "B");

  return (
    <div className="rounded-[1.65rem] border border-red-100 bg-red-50/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              Incorrect Responders
            </span>
            <span className="text-sm font-semibold text-slate-700">
              n = {incorrectRows.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              <span className="font-semibold" style={{ color: IV_COLORS.A.fill }}>IV1 A</span>
              {" "}incorrect (answered Yes or Don&apos;t recall):{" "}
              <span className="font-semibold text-red-700">{incorrectA.length}</span>
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold" style={{ color: IV_COLORS.B.fill }}>IV1 B</span>
              {" "}incorrect (answered No or Don&apos;t recall):{" "}
              <span className="font-semibold text-red-700">{incorrectB.length}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button shrink-0 px-4 py-2 text-xs"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded ? (
        incorrectRows.length === 0 ? (
          <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm font-semibold text-emerald-700">
            All participants answered correctly.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.25rem] border border-red-100 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Participant
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV1
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV2
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Answer
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Expected
                  </th>
                  {manipulation2Construct ? (
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.11em] text-teal-600">
                      Manip 2 Avg
                    </th>
                  ) : null}
                  {constructs.map((c) => (
                    <th
                      key={c.id}
                      className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.11em] text-slate-500"
                      title={c.id}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incorrectRows.map((row) => {
                  const answer = normalizeManipulationChoiceLabel(
                    row.response_values["post_questionnaire.MANIPULATION_IV1"],
                  );
                  const expected = normalizeManipulationChoiceLabel(
                    MANIPULATION1_CORRECT[row.iv1],
                  );
                  return (
                    <tr
                      key={row.prolific_id}
                      className="border-t border-slate-100 transition hover:bg-red-50/30"
                    >
                      <td className="sticky left-0 bg-white px-4 py-3 font-mono text-xs text-slate-800">
                        {row.prolific_id}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: IV_COLORS[row.iv1 as "A" | "B"]?.fill ?? "#94a3b8" }}
                        >
                          {row.iv1}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {row.iv2}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          {answer}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {expected}
                        </span>
                      </td>
                      {manipulation2Construct ? (
                        <td className="px-3 py-3 text-right">
                          <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                            {formatScore(row.construct_averages[manipulation2Construct.id])}
                          </span>
                        </td>
                      ) : null}
                      {constructs.map((c) => {
                        const avg = row.construct_averages[c.id];
                        return (
                          <td key={c.id} className="px-3 py-3 text-right">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                              {formatScore(avg)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

function IncorrectRespondersManip1And2Panel({
  rows,
  constructs,
  manipulation2Construct,
}: {
  rows: AdminStatsParticipantRow[];
  constructs: AdminConstructDefinition[];
  manipulation2Construct: AdminConstructDefinition | null;
}) {
  const [expanded, setExpanded] = useState(true);

  const incorrectRows = rows.filter((row) => {
    const m1Wrong = row.response_values["post_questionnaire.MANIPULATION_IV1"] !== MANIPULATION1_CORRECT[row.iv1];
    const m2 = row.construct_averages.MANIPULATION_IV2;
    const m2Wrong =
      typeof m2 === "number" &&
      ((row.iv2 === "A" && m2 < MANIPULATION2_THRESHOLD) ||
        (row.iv2 === "B" && m2 > MANIPULATION2_THRESHOLD));
    return m1Wrong && m2Wrong;
  });

  return (
    <div className="rounded-[1.65rem] border border-purple-100 bg-purple-50/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
              Both Manipulations — Incorrect Responders
            </span>
            <span className="text-sm font-semibold text-slate-700">
              n = {incorrectRows.length}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            Failed both Manipulation 1 (IV1) and Manipulation 2 (IV2) checks simultaneously.
          </div>
        </div>
        <button
          type="button"
          className="secondary-button shrink-0 px-4 py-2 text-xs"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded ? (
        incorrectRows.length === 0 ? (
          <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm font-semibold text-emerald-700">
            No participants failed both checks.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.25rem] border border-purple-100 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    Participant
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV1
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    IV2
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-red-600">
                    Manip 1 Answer
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    M1 Expected
                  </th>
                  {manipulation2Construct ? (
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-red-600">
                      Manip 2 Avg
                    </th>
                  ) : null}
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
                    M2 Expected
                  </th>
                  {constructs.map((c) => (
                    <th
                      key={c.id}
                      className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.11em] text-slate-500"
                      title={c.id}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incorrectRows.map((row) => {
                  const m1Answer = normalizeManipulationChoiceLabel(
                    row.response_values["post_questionnaire.MANIPULATION_IV1"],
                  );
                  const m1Expected = normalizeManipulationChoiceLabel(MANIPULATION1_CORRECT[row.iv1]);
                  const m2 = row.construct_averages.MANIPULATION_IV2 as number;
                  const m2ExpectedDir = row.iv2 === "A" ? `≥ ${MANIPULATION2_THRESHOLD}` : `≤ ${MANIPULATION2_THRESHOLD}`;
                  return (
                    <tr
                      key={row.prolific_id}
                      className="border-t border-slate-100 transition hover:bg-purple-50/30"
                    >
                      <td className="sticky left-0 bg-white px-4 py-3 font-mono text-xs text-slate-800">
                        {row.prolific_id}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: IV_COLORS[row.iv1 as "A" | "B"]?.fill ?? "#94a3b8" }}
                        >
                          {row.iv1}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: IV_COLORS[row.iv2 as "A" | "B"]?.fill ?? "#94a3b8" }}
                        >
                          {row.iv2}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          {m1Answer}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {m1Expected}
                        </span>
                      </td>
                      {manipulation2Construct ? (
                        <td className="px-3 py-3 text-center">
                          <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                            {formatScore(m2)}
                          </span>
                        </td>
                      ) : null}
                      <td className="px-3 py-3 text-center text-xs text-slate-500">
                        {m2ExpectedDir}
                      </td>
                      {constructs.map((c) => (
                        <td key={c.id} className="px-3 py-3 text-right">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            {formatScore(row.construct_averages[c.id])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

function ConstructPairPanel({ group, ivMode }: { group: ComparisonGroup; ivMode: IvMode }) {
  const isPre = group.left?.id.startsWith("PRE_");
  const isPost = group.right?.id.startsWith("POST_");
  const overallDelta =
    isPre &&
    isPost &&
    typeof group.left?.overallMean === "number" &&
    typeof group.right?.overallMean === "number"
      ? group.right.overallMean - group.left.overallMean
      : null;

  const ivLabel = ivMode.toUpperCase();

  return (
    <div className="min-w-0 rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-950">
            {group.familyLabel}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Construct averages compared by {ivLabel} condition
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {overallDelta !== null ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Overall Post − Pre
              </div>
              <div
                className={[
                  "mt-0.5 text-base font-semibold",
                  overallDelta > 0 ? "text-emerald-700" : overallDelta < 0 ? "text-red-700" : "text-slate-700",
                ].join(" ")}
              >
                {overallDelta >= 0 ? "+" : ""}
                {overallDelta.toFixed(2)}
              </div>
            </div>
          ) : null}
          <span className="eyebrow">{group.familyKey}</span>
        </div>
      </div>

      {/* Pre/Post label row */}
      {isPre && isPost ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
            Pre-Exposure
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Post-Exposure
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {group.left ? (
          <TwoConditionAverageChart
            title={group.left.label}
            subtitle={group.left.id}
            maxValue={group.left.maxValue}
            overallMean={group.left.overallMean}
            conditionAMean={group.left.conditionAMean}
            conditionBMean={group.left.conditionBMean}
            ivLabel={ivLabel}
          />
        ) : null}
        {group.right ? (
          <TwoConditionAverageChart
            title={group.right.label}
            subtitle={group.right.id}
            maxValue={group.right.maxValue}
            overallMean={group.right.overallMean}
            conditionAMean={group.right.conditionAMean}
            conditionBMean={group.right.conditionBMean}
            ivLabel={ivLabel}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ── Data grid helpers ── */

function AverageCell({ value }: { value: number | null }) {
  return (
    <div className="flex h-full items-center justify-end px-2">
      <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-950">
        {formatScore(value)}
      </span>
    </div>
  );
}

function SimpleCell({ value }: { value: string }) {
  return (
    <div className="flex h-full items-center px-2 text-sm font-medium text-slate-800">
      {value}
    </div>
  );
}

function FlagCell({ value }: { value: string }) {
  const hasValue = value === "Has";
  return (
    <div className="flex h-full items-center px-2">
      <span
        className={[
          "rounded-full px-2.5 py-1 text-xs font-semibold",
          hasValue ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function openTextDetail(
  setDetailState: Dispatch<SetStateAction<DetailState>>,
  participantId: string,
  title: string,
  content: unknown,
) {
  if (!hasNonEmptyString(content)) return;
  setDetailState({ kind: "text", participantId, title, content });
}

function openConstructDetail(
  setDetailState: Dispatch<SetStateAction<DetailState>>,
  participantId: string,
  construct: AdminConstructDefinition | undefined,
  sourceRow: AdminStatsParticipantRow,
  responseColumnByKey: Map<string, { sourceKey: string }>,
) {
  if (!construct) return;
  const values = construct.questionColumnKeys.map((columnKey) => ({
    key: columnKey,
    sourceKey: responseColumnByKey.get(columnKey)?.sourceKey ?? columnKey,
    value: sourceRow.response_values[columnKey],
  }));
  setDetailState({ kind: "construct", participantId, construct, values });
}

/* ── Main component ── */

export function AdminStatsDashboard({ initialData, onLogout }: AdminStatsDashboardProps) {
  const [statsData, setStatsData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [ivMode, setIvMode] = useState<IvMode>("iv1");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>(null);
  const [expandedMobileCards, setExpandedMobileCards] = useState<Set<string>>(
    () => new Set(),
  );
  const [sheetSearch, setSheetSearch] = useState("");
  const [sheetSortColumns, setSheetSortColumns] = useState<readonly SortColumn[]>([]);
  const [sheetIv1Filter, setSheetIv1Filter] = useState<"all" | "A" | "B">("all");
  const [sheetIv2Filter, setSheetIv2Filter] = useState<"all" | "A" | "B">("all");

  const completedRows = useMemo(
    () => statsData.rows.filter((row) => row.status === "completed"),
    [statsData.rows],
  );
  const constructMap = useMemo(
    () => new Map(statsData.constructs.map((c) => [c.id, c])),
    [statsData.constructs],
  );
  const responseColumnByKey = useMemo(
    () => new Map(statsData.responseColumns.map((col) => [col.key, col])),
    [statsData.responseColumns],
  );
  const sheetRows = useMemo(() => buildSheetRows(completedRows), [completedRows]);
  const averageConstructs = useMemo(
    () => statsData.constructs.filter((c) => c.id !== "MANIPULATION_IV2"),
    [statsData.constructs],
  );
  const comparisonGroups = useMemo(
    () =>
      buildComparisonGroups(
        buildConstructComparisonData(averageConstructs, completedRows, ivMode),
      ),
    [averageConstructs, completedRows, ivMode],
  );
  const manipulation2Construct = useMemo(
    () => constructMap.get("MANIPULATION_IV2") ?? null,
    [constructMap],
  );

  // Manipulation 2 averages by IV2 condition
  const manipulation2Overall = useMemo(
    () =>
      average(
        completedRows
          .map((r) => r.construct_averages.MANIPULATION_IV2)
          .filter((v): v is number => typeof v === "number"),
      ),
    [completedRows],
  );
  const manipulation2A = useMemo(
    () =>
      average(
        completedRows
          .filter((r) => r.iv2 === "A")
          .map((r) => r.construct_averages.MANIPULATION_IV2)
          .filter((v): v is number => typeof v === "number"),
      ),
    [completedRows],
  );
  const manipulation2B = useMemo(
    () =>
      average(
        completedRows
          .filter((r) => r.iv2 === "B")
          .map((r) => r.construct_averages.MANIPULATION_IV2)
          .filter((v): v is number => typeof v === "number"),
      ),
    [completedRows],
  );

  const gridColumns = useMemo(() => {
    const baseColumns: Column<SheetRow>[] = [
      {
        key: "prolific_id",
        name: "Participant",
        frozen: true,
        width: 180,
        renderCell: ({ row }) => (
          <div className="flex h-full items-center px-2 font-mono text-xs text-slate-950">
            {row.prolific_id}
          </div>
        ),
      },
      {
        key: "iv1",
        name: "IV1",
        frozen: true,
        width: 60,
        renderCell: ({ row }) => <SimpleCell value={String(row.iv1)} />,
      },
      {
        key: "iv2",
        name: "IV2",
        frozen: true,
        width: 60,
        renderCell: ({ row }) => <SimpleCell value={String(row.iv2)} />,
      },
      {
        key: "manipulation1",
        name: "Manip. 1",
        width: 130,
        renderCell: ({ row }) => <SimpleCell value={String(row.manipulation1)} />,
      },
      {
        key: "feedback_content_flag",
        name: "Feedback",
        width: 110,
        renderCell: ({ row }) => <FlagCell value={String(row.feedback_content_flag)} />,
      },
      {
        key: "feedback_reason_flag",
        name: "Reason",
        width: 110,
        renderCell: ({ row }) => <FlagCell value={String(row.feedback_reason_flag)} />,
      },
    ];

    if (manipulation2Construct) {
      baseColumns.push({
        key: `avg:${manipulation2Construct.id}`,
        name: "Manip. 2",
        width: 120,
        renderCell: ({ row }) => (
          <AverageCell value={typeof row.manipulation2 === "number" ? row.manipulation2 : null} />
        ),
      });
    }

    baseColumns.push(
      ...averageConstructs.map<Column<SheetRow>>((construct) => ({
        key: `avg:${construct.id}`,
        name: construct.label,
        width: 150,
        renderCell: ({ row }) => (
          <AverageCell
            value={
              typeof row[`avg:${construct.id}`] === "number"
                ? (row[`avg:${construct.id}`] as number)
                : null
            }
          />
        ),
      })),
    );

    return baseColumns;
  }, [averageConstructs, manipulation2Construct]);

  const dataGridRows = useMemo(() => {
    const allRows = sheetRows.map((row) => {
      const nextRow: SheetRow = { ...row };
      for (const construct of averageConstructs) {
        nextRow[`avg:${construct.id}`] =
          row.__source.construct_averages[construct.id] ?? null;
      }
      if (manipulation2Construct) {
        nextRow[`avg:${manipulation2Construct.id}`] =
          row.__source.construct_averages[manipulation2Construct.id] ?? null;
      }
      return nextRow;
    });

    const normalizedSearch = sheetSearch.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      if (sheetIv1Filter !== "all" && row.iv1 !== sheetIv1Filter) return false;
      if (sheetIv2Filter !== "all" && row.iv2 !== sheetIv2Filter) return false;
      if (normalizedSearch && !row.prolific_id.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });

    if (sheetSortColumns.length === 0) {
      return [...filtered].sort((left, right) => {
        const fbDelta =
          Number(right.feedback_content_flag === "Has") -
          Number(left.feedback_content_flag === "Has");
        if (fbDelta !== 0) return fbDelta;
        const rDelta =
          Number(right.feedback_reason_flag === "Has") -
          Number(left.feedback_reason_flag === "Has");
        if (rDelta !== 0) return rDelta;
        return left.prolific_id.localeCompare(right.prolific_id);
      });
    }

    return [...filtered].sort((a, b) => {
      for (const sort of sheetSortColumns) {
        const aVal = a[sort.columnKey];
        const bVal = b[sort.columnKey];
        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        }
        if (cmp !== 0) return sort.direction === "ASC" ? cmp : -cmp;
      }
      return 0;
    });
  }, [averageConstructs, manipulation2Construct, sheetRows, sheetSearch, sheetSortColumns, sheetIv1Filter, sheetIv2Filter]);

  async function refreshStatistics() {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/stats");
      const payload = (await response.json()) as
        | typeof initialData
        | ApiErrorResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload ? payload.message : "Unable to load statistics.",
        );
      }
      setStatsData(payload);
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

  function toggleMobileCard(rowId: string) {
    setExpandedMobileCards((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function handleCellClick(args: CellMouseArgs<SheetRow>) {
    if (args.column.key === "feedback_content_flag") {
      openTextDetail(
        setDetailState,
        args.row.prolific_id,
        "Feedback Content",
        args.row.__source.response_values["stage_6.FEEDBACK_CONTENT"],
      );
      return;
    }
    if (args.column.key === "feedback_reason_flag") {
      openTextDetail(
        setDetailState,
        args.row.prolific_id,
        "Feedback Reason",
        args.row.__source.response_values["post_questionnaire.FEEDBACK_REASON"],
      );
      return;
    }
    if (!args.column.key.startsWith("avg:")) return;
    const constructId = args.column.key.replace(/^avg:/, "");
    openConstructDetail(
      setDetailState,
      args.row.prolific_id,
      constructMap.get(constructId),
      args.row.__source,
      responseColumnByKey,
    );
  }

  const { summary } = statsData;
  const ivLabel = ivMode.toUpperCase();

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-[96rem] flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Admin · Statistics</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Participant Statistics
              </h1>
              <p className="body-copy max-w-xl">
                Analysis based on{" "}
                <span className="font-semibold text-slate-950">
                  {completedRows.length} completed
                </span>{" "}
                participants — manipulation checks, construct averages, and
                IV-level comparisons.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="secondary-button">
                All Participants
              </Link>
              <Link href="/admin/feedback" className="secondary-button">
                Feedback
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshStatistics()}
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

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {/* Completion summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Completed",
                value: summary.completed.total,
                color: "text-emerald-950",
                bg: "bg-emerald-50 border-emerald-200",
              },
              {
                label: "Failed",
                value: summary.failed.total,
                color: "text-red-950",
                bg: "bg-red-50 border-red-200",
              },
              {
                label: "In Progress",
                value: summary.in_progress.total,
                color: "text-amber-950",
                bg: "bg-amber-50 border-amber-200",
              },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-[1.5rem] border p-4 ${bg}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {label}
                </div>
                <div className={`mt-1.5 text-3xl font-semibold ${color}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Manipulation Checks ── */}
        <div className="panel space-y-5">
          <div className="space-y-1.5">
            <span className="eyebrow">Manipulation Checks</span>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Manipulation 1 & 2 Verification
            </h2>
            <p className="body-copy-compact max-w-3xl">
              Confirm that the experimental manipulations were perceived as
              intended. Manipulation 1 is a choice question by IV1; Manipulation
              2 is a Likert-scale average by IV2.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Manipulation 1 */}
            <div className="rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Manipulation 1
                    </span>
                    <span className="text-xs text-slate-500">by IV1</span>
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-slate-950">
                    Manipulation Check — System Notice Awareness
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Choice response: Yes / No / Don&apos;t recall (by IV1 condition)
                  </div>
                </div>
              </div>
              <Manipulation1Chart rows={completedRows} />
            </div>

            {/* Manipulation 2 */}
            <div className="rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-teal-300 bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                      Manipulation 2
                    </span>
                    <span className="text-xs text-slate-500">by IV2</span>
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-slate-950">
                    Manipulation Check — Feedback Salience
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Likert average (/{manipulation2Construct?.maxValue ?? 7}) by
                    IV2 condition
                  </div>
                </div>
              </div>
              <TwoConditionAverageChart
                title="Manipulation 2 Avg"
                maxValue={manipulation2Construct?.maxValue ?? 7}
                overallMean={manipulation2Overall}
                conditionAMean={manipulation2A}
                conditionBMean={manipulation2B}
                ivLabel="IV2"
              />
            </div>
          </div>

          <IncorrectRespondersPanel
            rows={completedRows}
            constructs={averageConstructs}
            manipulation2Construct={manipulation2Construct}
          />

          <IncorrectRespondersManip2Panel
            rows={completedRows}
            constructs={averageConstructs}
          />

          <IncorrectRespondersManip1And2Panel
            rows={completedRows}
            constructs={averageConstructs}
            manipulation2Construct={manipulation2Construct}
          />
        </div>

        {/* ── IV Comparison by Construct ── */}
        <div className="panel space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <span className="eyebrow">Construct Averages</span>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                IV Comparison by Construct
              </h2>
              <p className="body-copy-compact max-w-3xl">
                Items are grouped by construct. Pre and Post measures appear
                side-by-side with overall delta. Use the IV selector to switch
                between IV1 and IV2 comparisons.
              </p>
            </div>
            <div className="shrink-0 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Compare by IV
              </label>
              <div className="flex overflow-hidden rounded-[1.25rem] border border-slate-300 bg-white">
                {(["iv1", "iv2"] as IvMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setIvMode(mode)}
                    className={[
                      "px-5 py-2.5 text-sm font-semibold transition",
                      ivMode === mode
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 [&>*]:min-w-0">
            {comparisonGroups
              .filter((group) => group.layout === "pair")
              .map((group) => (
                <ConstructPairPanel
                  key={`${ivMode}-${group.familyKey}`}
                  group={group}
                  ivMode={ivMode}
                />
              ))}
            <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
              {comparisonGroups
                .filter((group) => group.layout === "single" && group.left)
                .map((group) => (
                  <div
                    key={`${ivMode}-${group.familyKey}`}
                    className="rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-3 text-sm text-slate-500">
                      {group.left?.id} — {ivLabel}
                    </div>
                    <TwoConditionAverageChart
                      title={group.left?.label ?? group.familyLabel}
                      maxValue={group.left?.maxValue ?? 7}
                      overallMean={group.left?.overallMean ?? null}
                      conditionAMean={group.left?.conditionAMean ?? null}
                      conditionBMean={group.left?.conditionBMean ?? null}
                      ivLabel={ivLabel}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* ── Data Sheet ── */}
        <div className="panel space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <span className="eyebrow">Data Sheet</span>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Completed Participants
              </h2>
              <p className="body-copy-compact max-w-3xl">
                Identity, IV conditions, manipulation responses, and construct
                averages. Click any{" "}
                <span className="font-semibold">AVG</span> cell to inspect
                sub-item values. Click column headers to sort.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.currentTarget.value)}
                placeholder="Search participant ID…"
                className="w-44 rounded-[1.25rem] border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              />
              <select
                value={sheetIv1Filter}
                onChange={(e) => setSheetIv1Filter(e.currentTarget.value as "all" | "A" | "B")}
                className="rounded-[1.25rem] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">IV1: All</option>
                <option value="A">IV1: A</option>
                <option value="B">IV1: B</option>
              </select>
              <select
                value={sheetIv2Filter}
                onChange={(e) => setSheetIv2Filter(e.currentTarget.value as "all" | "A" | "B")}
                className="rounded-[1.25rem] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="all">IV2: All</option>
                <option value="A">IV2: A</option>
                <option value="B">IV2: B</option>
              </select>
              <span className="text-sm font-semibold text-slate-500">
                {dataGridRows.length} / {completedRows.length}
              </span>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            <div className="max-h-[70svh] overflow-y-auto overflow-x-hidden rounded-[1.5rem] border border-slate-200 bg-white/65 p-3">
              <div className="space-y-3">
                {dataGridRows.map((row) => (
                  <div
                    key={`mobile-${row.id}`}
                    className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-slate-900">
                          {row.prolific_id}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="chip chip-neutral normal-case tracking-normal">
                            IV1 {row.iv1}
                          </span>
                          <span className="chip chip-neutral normal-case tracking-normal">
                            IV2 {row.iv2}
                          </span>
                          <span
                            className={[
                              "chip normal-case tracking-normal",
                              row.feedback_content_flag === "Has"
                                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                : "chip-neutral",
                            ].join(" ")}
                          >
                            Feedback: {row.feedback_content_flag}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary-button shrink-0 px-3 py-1.5 text-xs"
                        onClick={() => toggleMobileCard(row.id)}
                      >
                        {expandedMobileCards.has(row.id) ? "Collapse" : "Expand"}
                      </button>
                    </div>
                    {expandedMobileCards.has(row.id) ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Manipulation 1
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">
                              {row.manipulation1}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-[1rem] border border-slate-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                            onClick={() =>
                              openConstructDetail(
                                setDetailState,
                                row.prolific_id,
                                manipulation2Construct ?? undefined,
                                row.__source,
                                responseColumnByKey,
                              )
                            }
                          >
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                              Manipulation 2
                            </div>
                            <div className="mt-1 text-sm font-semibold text-amber-950">
                              {formatScore(row.manipulation2)}
                            </div>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {averageConstructs.map((construct) => (
                            <button
                              key={`mobile-${row.id}-${construct.id}`}
                              type="button"
                              className="rounded-[1rem] border border-slate-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                              onClick={() =>
                                openConstructDetail(
                                  setDetailState,
                                  row.prolific_id,
                                  construct,
                                  row.__source,
                                  responseColumnByKey,
                                )
                              }
                            >
                              <div className="break-words text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                {construct.label}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-amber-950">
                                {formatScore(
                                  row.__source.construct_averages[construct.id],
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop data grid */}
          <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white md:block">
            <DataGrid
              columns={gridColumns}
              rows={dataGridRows}
              rowKeyGetter={(row) => row.id}
              onCellClick={handleCellClick}
              defaultColumnOptions={{ resizable: true, sortable: true }}
              sortColumns={sheetSortColumns}
              onSortColumnsChange={setSheetSortColumns}
              rowHeight={44}
              headerRowHeight={44}
              className="rdg-light border-0 text-sm"
              style={{ blockSize: "34rem" }}
            />
          </div>
        </div>
      </div>

      {/* Construct / text detail modal */}
      {detailState ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-2xl space-y-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.5)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="eyebrow">
                  {detailState.kind === "construct"
                    ? "Construct Detail"
                    : "Response Detail"}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {detailState.kind === "construct"
                    ? detailState.construct.label
                    : detailState.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Participant:{" "}
                  <span className="font-mono text-slate-800">
                    {detailState.participantId}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="secondary-button shrink-0 px-4 py-2 text-xs"
                onClick={() => setDetailState(null)}
              >
                Close
              </button>
            </div>

            {detailState.kind === "construct" ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-[1fr_7rem] border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <div>Item key</div>
                  <div className="text-right">Value</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {detailState.values.map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[1fr_7rem] px-5 py-3"
                    >
                      <div className="font-mono text-xs text-slate-700">
                        {item.sourceKey}
                      </div>
                      <div className="text-right text-sm font-semibold text-slate-950">
                        {formatCellValue(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  {detailState.content}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
