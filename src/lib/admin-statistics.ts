import { buildSummary, hasFeedbackContent } from "@/lib/admin-dashboard";
import { PIPELINE } from "@/lib/pipeline";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AdminConstructDefinition,
  AdminDetailRow,
  AdminResponseColumn,
  AdminStatisticsResponse,
  AdminStatsParticipantRow,
  ChoiceQuestion,
  JsonObject,
  LikertQuestion,
  LikertStageUI,
  SliderQuestion,
  SurveyQuestion,
  TextQuestion,
} from "@/lib/types";

type ResponseColumnInternal = AdminResponseColumn & {
  constructLabel: string | null;
  order: number;
  maxValue: number | null;
};

type QuestionContext = {
  stageId: string;
  groupTitle?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChoiceQuestion(question: SurveyQuestion): question is ChoiceQuestion {
  return question.kind === "choice";
}

function isSliderQuestion(question: SurveyQuestion): question is SliderQuestion {
  return question.kind === "slider";
}

function isTextQuestion(question: SurveyQuestion): question is TextQuestion {
  return question.kind === "text";
}

function isLikertQuestion(question: SurveyQuestion): question is LikertQuestion {
  return question.kind === undefined || question.kind === "likert";
}

function humanizeToken(token: string) {
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => {
      if (part === part.toUpperCase() && part.length <= 3) {
        return part;
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function deriveConstructId(question: SurveyQuestion) {
  if ("isAttentionCheck" in question && question.isAttentionCheck) {
    return null;
  }

  if (isTextQuestion(question)) {
    return null;
  }

  const numericSuffixMatch = question.id.match(/^(.*)_\d+$/);
  if (numericSuffixMatch) {
    return numericSuffixMatch[1];
  }

  if (isChoiceQuestion(question)) {
    return question.options.every((option) => typeof option.value === "number")
      ? question.id
      : null;
  }

  if (isSliderQuestion(question) || isLikertQuestion(question)) {
    return question.id;
  }

  return null;
}

function buildConstructLabel(constructId: string, groupTitle?: string) {
  if (constructId === "SCS_IND") {
    return "SCS Independent";
  }

  if (constructId === "SCS_INTER") {
    return "SCS Interdependent";
  }

  const prefixMatch = constructId.match(/^(PRE|POST)_(.+)$/);
  if (prefixMatch) {
    const prefixLabel = prefixMatch[1] === "PRE" ? "Pre" : "Post";
    return `${prefixLabel} ${groupTitle ?? humanizeToken(prefixMatch[2])}`;
  }

  return groupTitle ?? humanizeToken(constructId);
}

function buildQuestionColumn(
  question: SurveyQuestion,
  context: QuestionContext,
  order: number,
): ResponseColumnInternal {
  const constructId = deriveConstructId(question);
  let kind: ResponseColumnInternal["kind"] = "system";
  let maxValue: number | null = null;

  if (isLikertQuestion(question)) {
    kind = "likert";
    maxValue = 7;
  } else if (isChoiceQuestion(question)) {
    kind = "choice";
    maxValue = question.options.every((option) => typeof option.value === "number")
      ? Math.max(...question.options.map((option) => Number(option.value)))
      : null;
  } else if (isSliderQuestion(question)) {
    kind = "slider";
    maxValue = question.max;
  } else if (isTextQuestion(question)) {
    kind = "text";
  }

  return {
    key: `${context.stageId}.${question.id}`,
    stageId: context.stageId,
    sourceKey: question.id,
    label: `${context.stageId}.${question.id}`,
    kind,
    constructId,
    constructLabel: constructId
      ? buildConstructLabel(constructId, context.groupTitle)
      : null,
    order,
    maxValue,
  };
}

function buildKnownResponseColumns() {
  const columns: ResponseColumnInternal[] = [];
  let order = 0;

  for (const stage of PIPELINE.stages) {
    const ui = Object.values(stage.ui)[0];

    if (!ui) {
      continue;
    }

    if (ui.kind === "likert") {
      const likertUi = ui as LikertStageUI;
      const groups =
        likertUi.questionSections?.flatMap((section) => section.groups) ??
        likertUi.questionGroups;

      for (const group of groups) {
        for (const question of group.items) {
          columns.push(
            buildQuestionColumn(question, { stageId: stage.id, groupTitle: group.title }, order),
          );
          order += 1;
        }
      }

      continue;
    }

    if (ui.kind === "content") {
      for (const sourceKey of ["acknowledged", "viewedPageIds"]) {
        columns.push({
          key: `${stage.id}.${sourceKey}`,
          stageId: stage.id,
          sourceKey,
          label: `${stage.id}.${sourceKey}`,
          kind: "system",
          constructId: null,
          constructLabel: null,
          order,
          maxValue: null,
        });
        order += 1;
      }
      continue;
    }

    if (ui.kind === "video") {
      columns.push({
        key: `${stage.id}.videoCompleted`,
        stageId: stage.id,
        sourceKey: "videoCompleted",
        label: `${stage.id}.videoCompleted`,
        kind: "system",
        constructId: null,
        constructLabel: null,
        order,
        maxValue: null,
      });
      order += 1;
      continue;
    }

    if (ui.kind === "interactive") {
      for (const sourceKey of ["FEEDBACK_DECISION", "FEEDBACK_CONTENT"]) {
        columns.push({
          key: `${stage.id}.${sourceKey}`,
          stageId: stage.id,
          sourceKey,
          label: `${stage.id}.${sourceKey}`,
          kind: sourceKey === "FEEDBACK_CONTENT" ? "text" : "system",
          constructId: null,
          constructLabel: null,
          order,
          maxValue: null,
        });
        order += 1;
      }
    }
  }

  return columns;
}

function getStageResponses(
  questionnaireAnswers: unknown,
  stageId: string,
): Record<string, unknown> {
  if (!isPlainObject(questionnaireAnswers)) {
    return {};
  }

  const stageValue = questionnaireAnswers[stageId];
  if (!isPlainObject(stageValue) || !isPlainObject(stageValue.responses)) {
    return {};
  }

  return stageValue.responses;
}

function buildExtraResponseColumns(rows: AdminDetailRow[], knownKeys: Set<string>) {
  const extras: ResponseColumnInternal[] = [];
  let order = 10_000;

  for (const row of rows) {
    if (!isPlainObject(row.questionnaire_answers)) {
      continue;
    }

    for (const [stageId, stageValue] of Object.entries(row.questionnaire_answers)) {
      if (!isPlainObject(stageValue) || !isPlainObject(stageValue.responses)) {
        continue;
      }

      for (const sourceKey of Object.keys(stageValue.responses)) {
        const key = `${stageId}.${sourceKey}`;
        if (knownKeys.has(key)) {
          continue;
        }

        knownKeys.add(key);
        extras.push({
          key,
          stageId,
          sourceKey,
          label: key,
          kind: "system",
          constructId: null,
          constructLabel: null,
          order,
          maxValue: null,
        });
        order += 1;
      }
    }
  }

  return extras;
}

function buildConstructDefinitions(columns: ResponseColumnInternal[]) {
  const constructs = new Map<
    string,
    {
      id: string;
      label: string;
      itemCount: number;
      maxValue: number;
      questionColumnKeys: string[];
      order: number;
    }
  >();

  for (const column of columns) {
    if (!column.constructId || column.maxValue === null) {
      continue;
    }

    const existing = constructs.get(column.constructId);
    if (existing) {
      existing.itemCount += 1;
      existing.questionColumnKeys.push(column.key);
      existing.maxValue = Math.max(existing.maxValue, column.maxValue);
      continue;
    }

    constructs.set(column.constructId, {
      id: column.constructId,
      label:
        column.constructLabel ?? buildConstructLabel(column.constructId),
      itemCount: 1,
      maxValue: column.maxValue,
      questionColumnKeys: [column.key],
      order: column.order,
    });
  }

  return Array.from(constructs.values())
    .sort((left, right) => left.order - right.order)
    .map<AdminConstructDefinition>((construct) => ({
      id: construct.id,
      label: construct.label,
      itemCount: construct.itemCount,
      maxValue: construct.maxValue,
      questionColumnKeys: construct.questionColumnKeys,
    }));
}

function toDisplayValue(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (isPlainObject(value)) {
    return value as JsonObject;
  }

  return null;
}

function buildStatsParticipantRow(
  row: AdminDetailRow,
  columns: ResponseColumnInternal[],
  constructs: AdminConstructDefinition[],
): AdminStatsParticipantRow {
  const responseValues = columns.reduce<Record<string, unknown>>((accumulator, column) => {
    const stageResponses = getStageResponses(row.questionnaire_answers, column.stageId);
    const rawValue = stageResponses[column.sourceKey];
    accumulator[column.key] = toDisplayValue(rawValue);
    return accumulator;
  }, {});

  const constructAverages = constructs.reduce<Record<string, number | null>>(
    (accumulator, construct) => {
      const numericValues = construct.questionColumnKeys
        .map((columnKey) => responseValues[columnKey])
        .filter((value): value is number => typeof value === "number");

      accumulator[construct.id] =
        numericValues.length > 0
          ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
          : null;
      return accumulator;
    },
    {},
  );

  return {
    pipeline_code: row.pipeline_code,
    prolific_id: row.prolific_id,
    iv1: row.iv1,
    iv2: row.iv2,
    status: row.status,
    completed: row.completed,
    failed: row.failed,
    failed_stage_id: row.failed_stage_id,
    current_stage_index: row.current_stage_index,
    submission_count: row.submission_count,
    last_submission_stage_id: row.last_submission_stage_id,
    last_submission_at: row.last_submission_at,
    started_at: row.started_at,
    updated_at: row.updated_at,
    total_seconds: row.total_seconds,
    response_values: responseValues,
    construct_averages: constructAverages,
  };
}

export async function fetchAdminStatistics(): Promise<AdminStatisticsResponse> {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("admin_participant_detail")
    .select("*")
    .eq("pipeline_code", PIPELINE.code)
    .order("updated_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  const detailRows = (result.data ?? []) as AdminDetailRow[];
  const knownColumns = buildKnownResponseColumns();
  const knownKeys = new Set(knownColumns.map((column) => column.key));
  const responseColumnsInternal = [
    ...knownColumns,
    ...buildExtraResponseColumns(detailRows, knownKeys),
  ].sort((left, right) => left.order - right.order);
  const responseColumns = responseColumnsInternal.map<AdminResponseColumn>((column) => ({
    key: column.key,
    stageId: column.stageId,
    sourceKey: column.sourceKey,
    label: column.label,
    kind: column.kind,
    constructId: column.constructId,
  }));
  const constructs = buildConstructDefinitions(responseColumnsInternal);
  const rows = detailRows.map((row) =>
    buildStatsParticipantRow(row, responseColumnsInternal, constructs),
  );
  const prolificIdsWithFeedbackContent = new Set(
    rows
      .filter((row) =>
        hasFeedbackContent({
          responses: {
            FEEDBACK_CONTENT: row.response_values["stage_6.FEEDBACK_CONTENT"],
          },
        }),
      )
      .map((row) => row.prolific_id),
  );

  return {
    ok: true,
    rows,
    summary: buildSummary(rows, prolificIdsWithFeedbackContent),
    responseColumns,
    constructs,
  };
}
