import {
  fetchAdminStatistics,
} from "@/lib/admin-statistics";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AdminConstructDefinition,
  AdminDashboardSummary,
  AdminResponseColumn,
  AdminStatisticsResponse,
  AdminStatsParticipantRow,
  AdminStatus,
} from "@/lib/types";

const SAMPLE_EXPORT_SEQUENCE = [
  "iv1",
  "iv2",
  "MANIPULATION_IV1",
  "MANIPULATION_IV2",
  "FEEDBACK_DECISION",
  "AI_FAMILIARITY_1",
  "DISPOSITION_TO_TRUST_TECHNOLOGY_1",
  "DISPOSITION_TO_TRUST_TECHNOLOGY_2",
  "DISPOSITION_TO_TRUST_TECHNOLOGY_3",
  "AVG_DISPOSITION_TO_TRUST_TECHNOLOGY",
  "PRE_ABILITY_1",
  "PRE_ABILITY_2",
  "PRE_ABILITY_3",
  "PRE_ABILITY_4",
  "AVG_PRE_ABILITY",
  "PRE_COGNITIVE_TRUST_1",
  "PRE_COGNITIVE_TRUST_2",
  "PRE_COGNITIVE_TRUST_3",
  "PRE_COGNITIVE_TRUST_4",
  "AVG_PRE_COGNITIVE_TRUST",
  "POST_ABILITY_1",
  "POST_ABILITY_2",
  "POST_ABILITY_3",
  "POST_ABILITY_4",
  "AVG_POST_ABILITY",
  "POST_COGNITIVE_TRUST_1",
  "POST_COGNITIVE_TRUST_2",
  "POST_COGNITIVE_TRUST_3",
  "POST_COGNITIVE_TRUST_4",
  "AVG_POST_COGNITIVE_TRUST",
  "PRE_BENEVOLENCE_1",
  "PRE_BENEVOLENCE_2",
  "PRE_BENEVOLENCE_3",
  "AVG_PRE_BENEVOLENCE",
  "PRE_INTEGRITY_1",
  "PRE_INTEGRITY_2",
  "PRE_INTEGRITY_3",
  "AVG_PRE_INTEGRITY",
  "PRE_AFFECTIVE_TRUST_1",
  "PRE_AFFECTIVE_TRUST_4",
  "PRE_AFFECTIVE_TRUST_2",
  "PRE_AFFECTIVE_TRUST_5",
  "PRE_AFFECTIVE_TRUST_3",
  "PRE_AFFECTIVE_TRUST_6",
  "AVG_PRE_AFFECTIVE_TRUST",
  "POST_BENEVOLENCE_1",
  "POST_BENEVOLENCE_2",
  "POST_BENEVOLENCE_3",
  "AVG_POST_BENEVOLENCE",
  "POST_INTEGRITY_1",
  "POST_INTEGRITY_2",
  "POST_INTEGRITY_3",
  "AVG_POST_INTEGRITY",
  "POST_AFFECTIVE_TRUST_1",
  "POST_AFFECTIVE_TRUST_4",
  "POST_AFFECTIVE_TRUST_2",
  "POST_AFFECTIVE_TRUST_5",
  "POST_AFFECTIVE_TRUST_3",
  "POST_AFFECTIVE_TRUST_6",
  "AVG_POST_AFFECTIVE_TRUST",
  "PRE_COMPETENCE_1",
  "PRE_COMPETENCE_2",
  "PRE_COMPETENCE_3",
  "PRE_COMPETENCE_4",
  "PRE_COMPETENCE_5",
  "PRE_COMPETENCE_6",
  "AVG_PRE_COMPETENCE",
  "POST_COMPETENCE_1",
  "POST_COMPETENCE_2",
  "POST_COMPETENCE_3",
  "POST_COMPETENCE_4",
  "POST_COMPETENCE_5",
  "POST_COMPETENCE_6",
  "AVG_POST_COMPETENCE",
  "PRE_ATTITUDE_1",
  "PRE_ATTITUDE_2",
  "PRE_ATTITUDE_3",
  "PRE_ATTITUDE_4",
  "AVG_PRE_ATTITUDE",
  "POST_ATTITUDE_1",
  "POST_ATTITUDE_2",
  "POST_ATTITUDE_3",
  "POST_ATTITUDE_4",
  "AVG_POST_ATTITUDE",
  "FRUSTRATION_1",
  "FRUSTRATION_2",
  "FRUSTRATION_3",
  "AVG_FRUSTRATION",
  "FORGIVENESS_1",
  "FORGIVENESS_2",
  "FORGIVENESS_3",
  "FORGIVENESS_4",
  "AVG_FORGIVENESS",
  "SERVICE_FAILURE_SEVERITY_1",
  "SERVICE_FAILURE_SEVERITY_2",
  "SERVICE_FAILURE_SEVERITY_3",
  "AVG_SERVICE_FAILURE_SEVERITY",
  "CONFIRMATION_OF_EXPECTATIONS_1",
  "CONFIRMATION_OF_EXPECTATIONS_2",
  "CONFIRMATION_OF_EXPECTATIONS_3",
  "CONFIRMATION_OF_EXPECTATIONS_4",
  "AVG_CONFIRMATION_OF_EXPECTATIONS",
  "PERCEIVED_USEFULNESS_1",
  "PERCEIVED_USEFULNESS_2",
  "PERCEIVED_USEFULNESS_3",
  "PERCEIVED_USEFULNESS_4",
  "PERCEIVED_USEFULNESS_5",
  "PERCEIVED_USEFULNESS_6",
  "AVG_PERCEIVED_USEFULNESS",
  "SATISFACTION_1",
  "SATISFACTION_2",
  "SATISFACTION_3",
  "SATISFACTION_4",
  "AVG_SATISFACTION",
  "CONTINUANCE_INTENTION_1",
  "CONTINUANCE_INTENTION_2",
  "CONTINUANCE_INTENTION_3",
  "AVG_CONTINUANCE_INTENTION",
  "FEEDBACK_CONTENT",
  "FEEDBACK_REASON",
] as const;

const EXCLUDED_SOURCE_KEYS = new Set([
  "acknowledged",
  "viewedPageIds",
  "videoCompleted",
]);

export type FollowUpResultRow = {
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

export type FollowUpResultsPayload = {
  activePipelineCode: string;
  availablePipelineCodes: string[];
  selectedPipelineCodes: string[];
  summary: AdminDashboardSummary;
  rows: FollowUpResultRow[];
};

type ExportColumn =
  | { kind: "meta"; header: string; value: (row: AdminStatsParticipantRow) => unknown }
  | { kind: "response"; header: string; key: string }
  | { kind: "average"; header: string; constructId: string }
  | { kind: "computed"; header: string; value: (row: AdminStatsParticipantRow) => unknown };

const EXPORT_ALIAS_RESPONSE_KEYS: Record<string, string> = {
  PRE_COGNITIVE_TRUST_1: "pre_questionnaire.PRE_ABILITY_1",
  PRE_COGNITIVE_TRUST_2: "pre_questionnaire.PRE_ABILITY_2",
  PRE_COGNITIVE_TRUST_3: "pre_questionnaire.PRE_ABILITY_3",
  PRE_COGNITIVE_TRUST_4: "pre_questionnaire.PRE_ABILITY_4",
  POST_COGNITIVE_TRUST_1: "post_questionnaire.POST_ABILITY_1",
  POST_COGNITIVE_TRUST_2: "post_questionnaire.POST_ABILITY_2",
  POST_COGNITIVE_TRUST_3: "post_questionnaire.POST_ABILITY_3",
  POST_COGNITIVE_TRUST_4: "post_questionnaire.POST_ABILITY_4",
  PRE_AFFECTIVE_TRUST_1: "pre_questionnaire.PRE_BENEVOLENCE_1",
  PRE_AFFECTIVE_TRUST_4: "pre_questionnaire.PRE_INTEGRITY_1",
  PRE_AFFECTIVE_TRUST_2: "pre_questionnaire.PRE_BENEVOLENCE_2",
  PRE_AFFECTIVE_TRUST_5: "pre_questionnaire.PRE_INTEGRITY_2",
  PRE_AFFECTIVE_TRUST_3: "pre_questionnaire.PRE_BENEVOLENCE_3",
  PRE_AFFECTIVE_TRUST_6: "pre_questionnaire.PRE_INTEGRITY_3",
  POST_AFFECTIVE_TRUST_1: "post_questionnaire.POST_BENEVOLENCE_1",
  POST_AFFECTIVE_TRUST_4: "post_questionnaire.POST_INTEGRITY_1",
  POST_AFFECTIVE_TRUST_2: "post_questionnaire.POST_BENEVOLENCE_2",
  POST_AFFECTIVE_TRUST_5: "post_questionnaire.POST_INTEGRITY_2",
  POST_AFFECTIVE_TRUST_3: "post_questionnaire.POST_BENEVOLENCE_3",
  POST_AFFECTIVE_TRUST_6: "post_questionnaire.POST_INTEGRITY_3",
};

const EXPORT_ALIAS_AVERAGE_KEYS: Record<string, string[]> = {
  AVG_PRE_COGNITIVE_TRUST: [
    "pre_questionnaire.PRE_ABILITY_1",
    "pre_questionnaire.PRE_ABILITY_2",
    "pre_questionnaire.PRE_ABILITY_3",
    "pre_questionnaire.PRE_ABILITY_4",
  ],
  AVG_POST_COGNITIVE_TRUST: [
    "post_questionnaire.POST_ABILITY_1",
    "post_questionnaire.POST_ABILITY_2",
    "post_questionnaire.POST_ABILITY_3",
    "post_questionnaire.POST_ABILITY_4",
  ],
  AVG_PRE_AFFECTIVE_TRUST: [
    "pre_questionnaire.PRE_BENEVOLENCE_1",
    "pre_questionnaire.PRE_BENEVOLENCE_2",
    "pre_questionnaire.PRE_BENEVOLENCE_3",
    "pre_questionnaire.PRE_INTEGRITY_1",
    "pre_questionnaire.PRE_INTEGRITY_2",
    "pre_questionnaire.PRE_INTEGRITY_3",
  ],
  AVG_POST_AFFECTIVE_TRUST: [
    "post_questionnaire.POST_BENEVOLENCE_1",
    "post_questionnaire.POST_BENEVOLENCE_2",
    "post_questionnaire.POST_BENEVOLENCE_3",
    "post_questionnaire.POST_INTEGRITY_1",
    "post_questionnaire.POST_INTEGRITY_2",
    "post_questionnaire.POST_INTEGRITY_3",
  ],
};

function isExportableResponseColumn(column: AdminResponseColumn) {
  return !EXCLUDED_SOURCE_KEYS.has(column.sourceKey);
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value === "A") {
    return "0";
  }

  if (value === "B") {
    return "1";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(4).replace(/\.?0+$/, "");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function escapeCsvCell(value: unknown) {
  const formatted = formatCell(value);
  if (formatted.includes(",") || formatted.includes('"') || formatted.includes("\n")) {
    return `"${formatted.replace(/"/g, '""')}"`;
  }
  return formatted;
}

function buildAliasAverageValue(
  row: AdminStatsParticipantRow,
  sourceKeys: string[],
) {
  const numericValues = sourceKeys
    .map((key) => row.response_values[key])
    .filter((value): value is number => typeof value === "number");

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function formatFailureReason(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function buildAnswerGroups(row: AdminStatsParticipantRow) {
  const groups = new Map<
    string,
    Array<{
      label: string;
      value: string;
    }>
  >();

  for (const [key, value] of Object.entries(row.response_values)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const [stageId, ...rest] = key.split(".");
    const sourceKey = rest.join(".");
    if (!stageId || !sourceKey) {
      continue;
    }

    if (EXCLUDED_SOURCE_KEYS.has(sourceKey)) {
      continue;
    }

    const entries = groups.get(stageId) ?? [];
    entries.push({
      label: sourceKey,
      value: formatCell(value),
    });
    groups.set(stageId, entries);
  }

  return Array.from(groups.entries()).map(([stageId, entries]) => ({
    stageId,
    entries,
  }));
}

function buildResultsRows(stats: AdminStatisticsResponse): FollowUpResultRow[] {
  return stats.rows.map((row) => {
    const feedbackContent =
      typeof row.response_values["popup.FEEDBACK_CONTENT"] === "string"
        ? String(row.response_values["popup.FEEDBACK_CONTENT"])
        : typeof row.response_values["stage_6.FEEDBACK_CONTENT"] === "string"
          ? String(row.response_values["stage_6.FEEDBACK_CONTENT"])
          : "";
    const feedbackReason =
      typeof row.response_values["post_questionnaire.FEEDBACK_REASON"] === "string"
        ? String(row.response_values["post_questionnaire.FEEDBACK_REASON"])
        : "";

    return {
      pipelineCode: row.pipeline_code,
      prolificId: row.prolific_id,
      status: row.status,
      iv1: row.iv1,
      iv2: row.iv2,
      lastSubmissionAt: row.last_submission_at,
      totalSeconds: row.total_seconds,
      failureReasonText: formatFailureReason(row.failed_reason),
      hasFeedback: feedbackContent.trim().length > 0 || feedbackReason.trim().length > 0,
      feedbackContent,
      feedbackReason,
      answerGroups: buildAnswerGroups(row),
    };
  });
}

export async function listAvailablePipelineCodes(activePipelineCode: string) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("progress")
    .select("pipeline_code")
    .order("pipeline_code", { ascending: true });

  if (result.error) {
    throw result.error;
  }

  const codes = new Set<string>();
  codes.add(activePipelineCode);

  for (const row of result.data ?? []) {
    if (typeof row.pipeline_code === "string" && row.pipeline_code.trim().length > 0) {
      codes.add(row.pipeline_code);
    }
  }

  return Array.from(codes).sort((left, right) => left.localeCompare(right));
}

function normalizeSelectedPipelineCodes(
  requestedPipelineCodes: string[],
  availablePipelineCodes: string[],
  activePipelineCode: string,
) {
  const availableSet = new Set(availablePipelineCodes);
  const selected = Array.from(
    new Set(
      requestedPipelineCodes
        .map((code) => code.trim())
        .filter((code) => code.length > 0 && availableSet.has(code)),
    ),
  );

  if (selected.length > 0) {
    return selected;
  }

  return availableSet.has(activePipelineCode)
    ? [activePipelineCode]
    : availablePipelineCodes.slice(0, 1);
}

export async function fetchFollowUpResults(
  activePipelineCode: string,
  requestedPipelineCodes: string[] = [],
): Promise<FollowUpResultsPayload> {
  const availablePipelineCodes = await listAvailablePipelineCodes(activePipelineCode);
  const selectedPipelineCodes = normalizeSelectedPipelineCodes(
    requestedPipelineCodes,
    availablePipelineCodes,
    activePipelineCode,
  );
  const stats = await fetchAdminStatistics(selectedPipelineCodes);
  return {
    activePipelineCode,
    availablePipelineCodes,
    selectedPipelineCodes,
    summary: stats.summary,
    rows: buildResultsRows(stats),
  };
}

function addConstructColumns(
  exportColumns: ExportColumn[],
  construct: AdminConstructDefinition,
  responseColumnByKey: Map<string, AdminResponseColumn>,
  emittedResponseKeys: Set<string>,
  emittedConstructIds: Set<string>,
) {
  for (const questionKey of construct.questionColumnKeys) {
    if (emittedResponseKeys.has(questionKey)) {
      continue;
    }

    const questionColumn = responseColumnByKey.get(questionKey);
    if (!questionColumn || !isExportableResponseColumn(questionColumn)) {
      continue;
    }

    exportColumns.push({
      kind: "response",
      header: questionColumn.sourceKey,
      key: questionColumn.key,
    });
    emittedResponseKeys.add(questionColumn.key);
  }

  if (!emittedConstructIds.has(construct.id)) {
    exportColumns.push({
      kind: "average",
      header: `AVG_${construct.id}`,
      constructId: construct.id,
    });
    emittedConstructIds.add(construct.id);
  }
}

function buildExportColumns(stats: AdminStatisticsResponse): ExportColumn[] {
  const exportColumns: ExportColumn[] = [
    {
      kind: "meta",
      header: "prolific_id",
      value: (row) => row.prolific_id,
    },
  ];
  const responseColumnBySourceKey = new Map(
    stats.responseColumns.map((column) => [column.sourceKey, column] as const),
  );
  const responseColumnByKey = new Map(
    stats.responseColumns.map((column) => [column.key, column] as const),
  );
  const constructByAverageHeader = new Map<string, AdminConstructDefinition>(
    stats.constructs.map((construct) => [`AVG_${construct.id}`, construct] as const),
  );
  const emittedResponseKeys = new Set<string>();
  const emittedConstructIds = new Set<string>();

  for (const label of SAMPLE_EXPORT_SEQUENCE) {
    const header = String(label);

    if (header === "iv1" || header === "iv2") {
      exportColumns.push({
        kind: "meta",
        header,
        value: (row) => row[header],
      });
      continue;
    }

    if (header.startsWith("AVG_")) {
      const construct = constructByAverageHeader.get(header);
      if (construct && !emittedConstructIds.has(construct.id)) {
        exportColumns.push({
          kind: "average",
          header,
          constructId: construct.id,
        });
        emittedConstructIds.add(construct.id);
      }
      continue;
    }

    const aliasAverageKeys = EXPORT_ALIAS_AVERAGE_KEYS[header];
    if (aliasAverageKeys) {
      exportColumns.push({
        kind: "computed",
        header,
        value: (row) => buildAliasAverageValue(row, aliasAverageKeys),
      });
      continue;
    }

    const aliasResponseKey = EXPORT_ALIAS_RESPONSE_KEYS[header];
    if (aliasResponseKey) {
      exportColumns.push({
        kind: "computed",
        header,
        value: (row) => row.response_values[aliasResponseKey] ?? null,
      });
      continue;
    }

    const responseColumn = responseColumnBySourceKey.get(header);
    if (!responseColumn || !isExportableResponseColumn(responseColumn)) {
      continue;
    }

    exportColumns.push({
      kind: "response",
      header,
      key: responseColumn.key,
    });
    emittedResponseKeys.add(responseColumn.key);
  }

  for (const column of stats.responseColumns) {
    if (!isExportableResponseColumn(column) || emittedResponseKeys.has(column.key)) {
      continue;
    }

    if (column.constructId) {
      const construct = stats.constructs.find((entry) => entry.id === column.constructId);
      if (construct) {
        addConstructColumns(
          exportColumns,
          construct,
          responseColumnByKey,
          emittedResponseKeys,
          emittedConstructIds,
        );
        continue;
      }
    }

    exportColumns.push({
      kind: "response",
      header: column.sourceKey,
      key: column.key,
    });
    emittedResponseKeys.add(column.key);
  }

  return exportColumns;
}

export function buildFollowUpExportCsv(
  stats: AdminStatisticsResponse,
  scope: "all" | "completed",
) {
  const rows = scope === "completed"
    ? stats.rows.filter((row) => row.status === "completed")
    : stats.rows;
  const columns = buildExportColumns(stats);
  const scopedColumns =
    scope === "all"
      ? [
        columns[0],
        {
          kind: "meta" as const,
          header: "status",
          value: (row: AdminStatsParticipantRow) => row.status,
        },
        {
          kind: "meta" as const,
          header: "pipeline_code",
          value: (row: AdminStatsParticipantRow) => row.pipeline_code,
        },
        ...columns.slice(1),
      ]
      : [
        columns[0],
        {
          kind: "meta" as const,
          header: "pipeline_code",
          value: (row: AdminStatsParticipantRow) => row.pipeline_code,
        },
        ...columns.slice(1),
      ];
  const headerLine = scopedColumns.map((column) => escapeCsvCell(column.header)).join(",");
  const dataLines = rows.map((row) =>
    scopedColumns
      .map((column) => {
        if (column.kind === "meta") {
          return escapeCsvCell(column.value(row));
        }

        if (column.kind === "average") {
          return escapeCsvCell(row.construct_averages[column.constructId] ?? null);
        }

        if (column.kind === "computed") {
          return escapeCsvCell(column.value(row));
        }

        return escapeCsvCell(row.response_values[column.key]);
      })
      .join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}
