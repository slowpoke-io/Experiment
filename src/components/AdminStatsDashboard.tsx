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
import { DataGrid, type CellMouseArgs, type Column } from "react-data-grid";

import type {
  AdminConstructDefinition,
  AdminDashboardSummary,
  AdminStatisticsResponse,
  AdminStatsParticipantRow,
  AdminStatus,
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
      values: Array<{
        key: string;
        sourceKey: string;
        value: unknown;
      }>;
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

const conditionMeta = {
  A: {
    label: "Condition A",
    fill: "#f59e0b",
  },
  B: {
    label: "Condition B",
    fill: "#0f766e",
  },
} as const;

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

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function formatCount(value: unknown) {
  return typeof value === "number" ? String(value) : "0";
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "—";
  }

  return JSON.stringify(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeManipulationChoiceLabel(value: unknown) {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  if (value === "dont_recall") {
    return "Don't recall";
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return "—";
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
            <tr
              key={`${keyPrefix}-${iv1}`}
              className="border-t border-slate-200/80"
            >
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

function AdminSummaryPanels({
  summary,
  expanded,
  onToggle,
}: {
  summary: AdminDashboardSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {(["in_progress", "failed", "completed"] as AdminStatus[]).map(
          (status) => {
            const statusSummary = summary[status];

            return (
              <button
                key={status}
                type="button"
                onClick={onToggle}
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
                      {statusSummary.total}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {expanded ? "Hide" : "Show"}
                  </span>
                </div>
                {expanded ? (
                  <div className="mt-5 rounded-[1.25rem] border border-white/80 bg-white/70 p-4">
                    {renderBreakdownTable(statusSummary.breakdown, status)}
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
              n = {summary.completedDuration.count}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Min
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {formatDuration(summary.completedDuration.minSeconds)}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Max
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {formatDuration(summary.completedDuration.maxSeconds)}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Avg
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {formatDuration(summary.completedDuration.averageSeconds)}
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
              {summary.completedFeedbackContent.total}
            </div>
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            {renderBreakdownTable(
              summary.completedFeedbackContent.breakdown,
              "completed-feedback-content",
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function buildConstructComparisonData(
  constructs: AdminConstructDefinition[],
  rows: AdminStatsParticipantRow[],
  ivMode: IvMode,
) {
  return constructs
    .map((construct) => {
      const allValues = rows
        .map((row) => row.construct_averages[construct.id])
        .filter((value): value is number => typeof value === "number");
      const conditionAValues = rows
        .filter((row) => row[ivMode] === "A")
        .map((row) => row.construct_averages[construct.id])
        .filter((value): value is number => typeof value === "number");
      const conditionBValues = rows
        .filter((row) => row[ivMode] === "B")
        .map((row) => row.construct_averages[construct.id])
        .filter((value): value is number => typeof value === "number");

      return {
        ...construct,
        overallMean: average(allValues),
        conditionAMean: average(conditionAValues),
        conditionBMean: average(conditionBValues),
        conditionACount: conditionAValues.length,
        conditionBCount: conditionBValues.length,
      };
    })
    .filter(
      (construct): construct is ComparisonDatum =>
        construct.overallMean !== null,
    );
}

function buildComparisonGroups(constructData: ComparisonDatum[]) {
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
  const remaining = new Map(
    constructData.map((construct) => [construct.id, construct]),
  );
  const pairs = new Map<
    string,
    {
      pre?: ComparisonDatum;
      post?: ComparisonDatum;
    }
  >();
  const remainder: ComparisonDatum[] = [];

  const explicitPairGroups: ComparisonGroup[] = explicitPairs.flatMap(
    (pair) => {
      const left = remaining.get(pair.leftId) ?? null;
      const right = remaining.get(pair.rightId) ?? null;

      if (!left && !right) {
        return [];
      }

      if (left) {
        remaining.delete(pair.leftId);
      }

      if (right) {
        remaining.delete(pair.rightId);
      }

      return [
        {
          familyKey: pair.familyKey,
          familyLabel: pair.familyLabel,
          left,
          right,
          layout: "pair" as const,
        },
      ];
    },
  );

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

  const remainderGroups: ComparisonGroup[] = remainder.map((construct) => ({
    familyKey: construct.id,
    familyLabel: construct.label,
    left: construct,
    right: null,
    layout: "single" as const,
  }));

  return [...explicitPairGroups, ...pairedGroups, ...remainderGroups];
}

function buildManipulation1ChartData(rows: AdminStatsParticipantRow[]) {
  const optionOrder = ["yes", "no", "dont_recall"];

  return optionOrder.map((optionKey) => ({
    option: normalizeManipulationChoiceLabel(optionKey),
    A: rows.filter(
      (row) =>
        row.iv1 === "A" &&
        row.response_values["stage_7.MANIPULATION_IV1"] === optionKey,
    ).length,
    B: rows.filter(
      (row) =>
        row.iv1 === "B" &&
        row.response_values["stage_7.MANIPULATION_IV1"] === optionKey,
    ).length,
  }));
}

function defaultTooltipFormatter(value: unknown) {
  if (typeof value === "number") {
    return value.toFixed(2);
  }

  return String(value);
}

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
          hasValue
            ? "bg-emerald-50 text-emerald-800"
            : "bg-slate-100 text-slate-600",
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
  if (!hasNonEmptyString(content)) {
    return;
  }

  setDetailState({
    kind: "text",
    participantId,
    title,
    content,
  });
}

function openConstructDetail(
  setDetailState: Dispatch<SetStateAction<DetailState>>,
  participantId: string,
  construct: AdminConstructDefinition | undefined,
  sourceRow: AdminStatsParticipantRow,
  responseColumnByKey: Map<string, { sourceKey: string }>,
) {
  if (!construct) {
    return;
  }

  const values = construct.questionColumnKeys.map((columnKey) => ({
    key: columnKey,
    sourceKey: responseColumnByKey.get(columnKey)?.sourceKey ?? columnKey,
    value: sourceRow.response_values[columnKey],
  }));

  setDetailState({
    kind: "construct",
    participantId,
    construct,
    values,
  });
}

function buildSheetRows(rows: AdminStatsParticipantRow[]) {
  return rows.map<SheetRow>((row) => ({
    id: row.prolific_id,
    prolific_id: row.prolific_id,
    iv1: row.iv1,
    iv2: row.iv2,
    manipulation1: normalizeManipulationChoiceLabel(
      row.response_values["stage_7.MANIPULATION_IV1"],
    ),
    manipulation2:
      typeof row.construct_averages.MANIPULATION_IV2 === "number"
        ? row.construct_averages.MANIPULATION_IV2
        : null,
    feedback_content_flag: hasNonEmptyString(
      row.response_values["stage_6.FEEDBACK_CONTENT"],
    )
      ? "Has"
      : "No",
    feedback_reason_flag: hasNonEmptyString(
      row.response_values["stage_7.FEEDBACK_REASON"],
    )
      ? "Has"
      : "No",
    __source: row,
  }));
}

function TwoConditionAverageChart({
  title,
  subtitle,
  maxValue,
  overallMean,
  conditionAMean,
  conditionBMean,
}: {
  title: string;
  subtitle?: string;
  maxValue: number;
  overallMean: number | null;
  conditionAMean: number | null;
  conditionBMean: number | null;
}) {
  const chartData = [
    {
      condition: conditionMeta.A.label,
      value: conditionAMean ?? 0,
      fill: conditionMeta.A.fill,
    },
    {
      condition: conditionMeta.B.label,
      value: conditionBMean ?? 0,
      fill: conditionMeta.B.fill,
    },
  ];

  return (
    <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="text-base font-semibold text-slate-950">{title}</div>
          {subtitle ? (
            <div className="break-words text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>
        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left sm:w-auto sm:text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Overall Avg
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">
            {formatScore(overallMean)}
          </div>
          <div className="text-xs text-slate-500">/ {maxValue}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            A
          </div>
          <div className="mt-1 text-base font-semibold text-slate-950">
            {formatScore(conditionAMean)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            B
          </div>
          <div className="mt-1 text-base font-semibold text-slate-950">
            {formatScore(conditionBMean)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Delta
          </div>
          <div className="mt-1 text-base font-semibold text-slate-950">
            {conditionAMean !== null && conditionBMean !== null
              ? (conditionAMean - conditionBMean).toFixed(2)
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 h-56 rounded-[1.1rem] border border-slate-200 bg-slate-50/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 28, left: 10, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxValue]}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="condition"
              width={88}
              tick={{ fill: "#334155", fontSize: 12 }}
            />
            <Tooltip formatter={defaultTooltipFormatter} />
            {overallMean !== null ? (
              <ReferenceLine
                x={overallMean}
                stroke="#475569"
                strokeDasharray="4 4"
                label={{
                  value: `Overall ${overallMean.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "#475569",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Bar dataKey="value" radius={[0, 999, 999, 0]} maxBarSize={28}>
              {chartData.map((entry) => (
                <Cell key={entry.condition} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value: unknown) =>
                  typeof value === "number" ? value.toFixed(2) : String(value)
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Dashed line marks the overall mean and the numeric overall average is
        shown above.
      </div>
    </div>
  );
}

function Manipulation1Chart({ rows }: { rows: AdminStatsParticipantRow[] }) {
  const chartData = buildManipulation1ChartData(rows);
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((item) => [item.A, item.B]),
  );

  return (
    <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <div className="text-base font-semibold text-slate-950">
          Manipulation 1
        </div>
        <div className="text-sm text-slate-600">Counts by IV1 condition</div>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 32, left: 10, bottom: 0 }}
            barCategoryGap={14}
          >
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxValue]}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="option"
              width={100}
              tick={{ fill: "#334155", fontSize: 12 }}
            />
            <Tooltip />
            <Bar
              dataKey="A"
              name={conditionMeta.A.label}
              fill={conditionMeta.A.fill}
              radius={[0, 999, 999, 0]}
              maxBarSize={18}
            >
              <LabelList dataKey="A" position="right" formatter={formatCount} />
            </Bar>
            <Bar
              dataKey="B"
              name={conditionMeta.B.label}
              fill={conditionMeta.B.fill}
              radius={[0, 999, 999, 0]}
              maxBarSize={18}
            >
              <LabelList dataKey="B" position="right" formatter={formatCount} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ConstructPairPanel({
  group,
  ivMode,
}: {
  group: ComparisonGroup;
  ivMode: IvMode;
}) {
  const pairDelta =
    group.left?.id.startsWith("PRE_") &&
    group.right?.id.startsWith("POST_") &&
    typeof group.left.overallMean === "number" &&
    typeof group.right.overallMean === "number"
      ? group.right.overallMean - group.left.overallMean
      : null;

  return (
    <div className="min-w-0 rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-950">
            {group.familyLabel}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Compared by {ivMode.toUpperCase()} condition
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-start gap-2 sm:items-center sm:justify-end">
          {pairDelta !== null ? (
            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left sm:w-auto sm:text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Overall Delta
              </div>
              <div className="mt-1 text-base font-semibold text-slate-950">
                {pairDelta >= 0 ? "+" : ""}
                {pairDelta.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">Post - Pre</div>
            </div>
          ) : null}
          <div className="eyebrow">{group.familyKey}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {group.left ? (
          <TwoConditionAverageChart
            title={group.left.label}
            subtitle={group.left.id}
            maxValue={group.left.maxValue}
            overallMean={group.left.overallMean}
            conditionAMean={group.left.conditionAMean}
            conditionBMean={group.left.conditionBMean}
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
          />
        ) : null}
      </div>
    </div>
  );
}

function SingleConstructPanel({
  group,
  ivMode,
}: {
  group: ComparisonGroup;
  ivMode: IvMode;
}) {
  if (!group.left) {
    return null;
  }

  return (
    <TwoConditionAverageChart
      title={group.left.label}
      subtitle={`${group.left.id} average by ${ivMode.toUpperCase()} condition`}
      maxValue={group.left.maxValue}
      overallMean={group.left.overallMean}
      conditionAMean={group.left.conditionAMean}
      conditionBMean={group.left.conditionBMean}
    />
  );
}

export function AdminStatsDashboard({
  initialData,
  onLogout,
}: AdminStatsDashboardProps) {
  const [statsData, setStatsData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [ivMode, setIvMode] = useState<IvMode>("iv1");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>(null);
  const [expandedMobileCards, setExpandedMobileCards] = useState<Set<string>>(
    () => new Set(),
  );

  const completedRows = useMemo(
    () => statsData.rows.filter((row) => row.status === "completed"),
    [statsData.rows],
  );
  const constructMap = useMemo(
    () =>
      new Map(
        statsData.constructs.map((construct) => [construct.id, construct]),
      ),
    [statsData.constructs],
  );
  const responseColumnByKey = useMemo(
    () =>
      new Map(statsData.responseColumns.map((column) => [column.key, column])),
    [statsData.responseColumns],
  );
  const sheetRows = useMemo(
    () => buildSheetRows(completedRows),
    [completedRows],
  );
  const averageConstructs = useMemo(
    () =>
      statsData.constructs.filter(
        (construct) => construct.id !== "MANIPULATION_IV2",
      ),
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
        width: 72,
        renderCell: ({ row }) => <SimpleCell value={String(row.iv1)} />,
      },
      {
        key: "iv2",
        name: "IV2",
        frozen: true,
        width: 72,
        renderCell: ({ row }) => <SimpleCell value={String(row.iv2)} />,
      },
      {
        key: "manipulation1",
        name: "Manipulation 1",
        width: 140,
        renderCell: ({ row }) => (
          <SimpleCell value={String(row.manipulation1)} />
        ),
      },
      {
        key: "feedback_content_flag",
        name: "Feedback Content",
        width: 140,
        renderCell: ({ row }) => (
          <FlagCell value={String(row.feedback_content_flag)} />
        ),
      },
      {
        key: "feedback_reason_flag",
        name: "Feedback Reason",
        width: 140,
        renderCell: ({ row }) => (
          <FlagCell value={String(row.feedback_reason_flag)} />
        ),
      },
    ];

    if (manipulation2Construct) {
      baseColumns.push({
        key: `avg:${manipulation2Construct.id}`,
        name: "Manipulation 2",
        width: 140,
        renderCell: ({ row }) => (
          <AverageCell
            value={
              typeof row.manipulation2 === "number" ? row.manipulation2 : null
            }
          />
        ),
      });
    }

    baseColumns.push(
      ...averageConstructs.map<Column<SheetRow>>((construct) => ({
        key: `avg:${construct.id}`,
        name: construct.label,
        width: 156,
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
    const rowsWithAverages = sheetRows.map((row) => {
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

    return rowsWithAverages.sort((left, right) => {
      const feedbackContentDelta =
        Number(right.feedback_content_flag === "Has") -
        Number(left.feedback_content_flag === "Has");

      if (feedbackContentDelta !== 0) {
        return feedbackContentDelta;
      }

      const feedbackReasonDelta =
        Number(right.feedback_reason_flag === "Has") -
        Number(left.feedback_reason_flag === "Has");

      if (feedbackReasonDelta !== 0) {
        return feedbackReasonDelta;
      }

      return left.prolific_id.localeCompare(right.prolific_id);
    });
  }, [averageConstructs, manipulation2Construct, sheetRows]);

  async function refreshStatistics() {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/stats");
      const payload = (await response.json()) as
        | AdminStatisticsResponse
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
    setExpandedMobileCards((previous) => {
      const next = new Set(previous);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

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
        args.row.__source.response_values["stage_7.FEEDBACK_REASON"],
      );
      return;
    }

    if (!args.column.key.startsWith("avg:")) {
      return;
    }

    const constructId = args.column.key.replace(/^avg:/, "");
    openConstructDetail(
      setDetailState,
      args.row.prolific_id,
      constructMap.get(constructId),
      args.row.__source,
      responseColumnByKey,
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-[96rem] flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Admin Statistics</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Participant Statistics
              </h1>
              <p className="body-copy">
                Review the compact response sheet, construct averages, and
                IV-based comparisons across successful participants.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="secondary-button">
                Participant Dashboard
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshStatistics()}
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

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <AdminSummaryPanels
            summary={statsData.summary}
            expanded={summaryExpanded}
            onToggle={() => setSummaryExpanded((previous) => !previous)}
          />
        </div>

        <div className="panel space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Sheet</span>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Success Participants
              </h2>
              <p className="body-copy-compact max-w-3xl">
                Table columns are limited to participant identity, IVs,
                manipulation checks, and construct averages. Click any `AVG`
                cell to inspect its sub-item values.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {completedRows.length} success participants
            </div>
          </div>

          <div className="md:hidden">
            <div className="max-h-[70svh] overflow-x-hidden overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white/65 p-3">
              <div className="space-y-3">
                {dataGridRows.map((row) => (
                  <div
                    key={`mobile-${row.id}`}
                    className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Participant
                        </div>
                        <div className="mt-1 break-all font-mono text-sm text-slate-950">
                          {row.prolific_id}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="chip chip-neutral max-w-full whitespace-normal break-words normal-case tracking-normal">
                          IV1 {row.iv1}
                        </span>
                        <span className="chip chip-neutral max-w-full whitespace-normal break-words normal-case tracking-normal">
                          IV2 {row.iv2}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <div
                          className={`rounded-[1rem] border border-slate-200  px-3 py-2 ${row.feedback_content_flag === "Has" ? "bg-teal-300" : "bg-slate-50"}`}
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Feedback Content
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {row.feedback_content_flag}
                          </div>
                        </div>
                        <div
                          className={`rounded-[1rem] border border-slate-200  px-3 py-2 ${row.feedback_reason_flag === "Has" ? "bg-teal-300" : "bg-slate-50"}`}
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Feedback Reason
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {row.feedback_reason_flag}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary-button w-full shrink-0 px-4 py-2 text-xs sm:w-auto"
                        onClick={() => toggleMobileCard(row.id)}
                      >
                        {expandedMobileCards.has(row.id)
                          ? "Collapse"
                          : "Expand"}
                      </button>
                    </div>

                    {expandedMobileCards.has(row.id) ? (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-slate-100"
                            onClick={() =>
                              openTextDetail(
                                setDetailState,
                                row.prolific_id,
                                "Feedback Content",
                                row.__source.response_values[
                                  "stage_6.FEEDBACK_CONTENT"
                                ],
                              )
                            }
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Feedback Content
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {row.feedback_content_flag}
                            </div>
                          </button>
                          <button
                            type="button"
                            className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-slate-100"
                            onClick={() =>
                              openTextDetail(
                                setDetailState,
                                row.prolific_id,
                                "Feedback Reason",
                                row.__source.response_values[
                                  "stage_7.FEEDBACK_REASON"
                                ],
                              )
                            }
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Feedback Reason
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {row.feedback_reason_flag}
                            </div>
                          </button>
                        </div>

                        <div className="mt-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Construct Averages
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {manipulation2Construct ? (
                              <button
                                type="button"
                                className="rounded-[1.15rem] border border-slate-200 bg-amber-50 p-3 text-left transition hover:border-amber-300 hover:bg-amber-100/70"
                                onClick={() =>
                                  openConstructDetail(
                                    setDetailState,
                                    row.prolific_id,
                                    manipulation2Construct,
                                    row.__source,
                                    responseColumnByKey,
                                  )
                                }
                              >
                                <div className="break-words text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                                  Manipulation 2
                                </div>
                                <div className="mt-1 text-sm font-semibold text-amber-950">
                                  {formatScore(row.manipulation2)}
                                </div>
                              </button>
                            ) : null}
                            {averageConstructs.map((construct) => (
                              <button
                                key={`mobile-avg-${row.id}-${construct.id}`}
                                type="button"
                                className="rounded-[1.15rem] border border-slate-200 bg-amber-50 p-3 text-left transition hover:border-amber-300 hover:bg-amber-100/70"
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
                                <div className="break-words text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                                  {construct.label}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-amber-950">
                                  {formatScore(
                                    row.__source.construct_averages[
                                      construct.id
                                    ],
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white md:block">
            <DataGrid
              columns={gridColumns}
              rows={dataGridRows}
              rowKeyGetter={(row) => row.id}
              onCellClick={handleCellClick}
              defaultColumnOptions={{
                resizable: true,
                sortable: false,
              }}
              rowHeight={44}
              headerRowHeight={44}
              className="rdg-light border-0 text-sm"
              style={{ blockSize: "34rem" }}
            />
          </div>
        </div>

        <div className="panel space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <span className="eyebrow">Charts</span>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                IV Comparison by Construct
              </h2>
              <p className="body-copy-compact max-w-4xl">
                Manipulation charts are shown first. The construct grid below
                keeps matching `Pre` and `Post` cards side by side for direct
                comparison.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Compare by IV
              </label>
              <select
                value={ivMode}
                onChange={(event) =>
                  setIvMode(event.currentTarget.value as IvMode)
                }
                className="block rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
              >
                <option value="iv1">IV1</option>
                <option value="iv2">IV2</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <Manipulation1Chart rows={completedRows} />
            <TwoConditionAverageChart
              title="Manipulation 2"
              subtitle="Average by IV2 condition"
              maxValue={manipulation2Construct?.maxValue ?? 6}
              overallMean={average(
                completedRows
                  .map((row) => row.construct_averages.MANIPULATION_IV2)
                  .filter(
                    (value): value is number => typeof value === "number",
                  ),
              )}
              conditionAMean={average(
                completedRows
                  .filter((row) => row.iv2 === "A")
                  .map((row) => row.construct_averages.MANIPULATION_IV2)
                  .filter(
                    (value): value is number => typeof value === "number",
                  ),
              )}
              conditionBMean={average(
                completedRows
                  .filter((row) => row.iv2 === "B")
                  .map((row) => row.construct_averages.MANIPULATION_IV2)
                  .filter(
                    (value): value is number => typeof value === "number",
                  ),
              )}
            />
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
                .filter((group) => group.layout === "single")
                .map((group) => (
                  <SingleConstructPanel
                    key={`${ivMode}-${group.familyKey}`}
                    group={group}
                    ivMode={ivMode}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {detailState ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-2xl space-y-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_36px_120px_-50px_rgba(15,23,42,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="eyebrow">
                  {detailState.kind === "construct"
                    ? "Construct Detail"
                    : "Feedback Detail"}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {detailState.kind === "construct"
                    ? detailState.construct.label
                    : detailState.title}
                </h3>
                <p className="text-sm text-slate-600">
                  Participant:{" "}
                  <span className="font-mono text-slate-900">
                    {detailState.participantId}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="secondary-button px-4 py-2 text-xs"
                onClick={() => setDetailState(null)}
              >
                Close
              </button>
            </div>

            {detailState.kind === "construct" ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <div className="grid grid-cols-[minmax(0,1fr)_8rem] border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <div>Item</div>
                  <div className="text-right">Value</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {detailState.values.map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[minmax(0,1fr)_8rem] px-5 py-3 text-sm text-slate-800"
                    >
                      <div className="font-mono text-xs text-slate-700">
                        {item.sourceKey}
                      </div>
                      <div className="text-right font-semibold text-slate-950">
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
