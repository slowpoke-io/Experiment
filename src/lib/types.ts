export type ExperimentState =
  | "idle"
  | "loading"
  | "ready"
  | "submitting"
  | "completed"
  | "failed"
  | "error";

export type JsonObject = Record<string, unknown>;

export type AccentTone =
  | "amber"
  | "teal"
  | "rust"
  | "indigo"
  | "emerald"
  | "slate";

export type LikertScaleConfig = {
  min: number;
  max: number;
  labels: Record<number, string>;
};

export type LikertDisplayConfig = {
  showProgressBar?: boolean;
  groupsPerPage?: number;
  itemsPerPage?: number;
  enableSmoothScroll?: boolean;
};

export type LikertQuestion = {
  kind?: "likert";
  id: string;
  text: string;
  isAttentionCheck?: boolean;
  correctResponse?: number;
  candidate?: boolean;
};

export type LikertQuestionGroup = {
  id: string;
  title?: string;
  description?: string;
  items: SurveyQuestion[];
  show?: boolean;
};

export type LikertQuestionSection = {
  id: string;
  title?: string;
  description?: string;
  paginate?: boolean;
  groups: LikertQuestionGroup[];
};

export type ChoiceOption = {
  value: string | number;
  label: string;
  hint?: string;
};

export type ChoiceQuestion = {
  kind: "choice";
  id: string;
  text: string;
  options: ChoiceOption[];
  layout?: "default" | "scale";
  minLabel?: string;
  maxLabel?: string;
  isAttentionCheck?: boolean;
  correctResponse?: string | number;
};

export type SliderQuestion = {
  kind: "slider";
  id: string;
  text: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  defaultValue?: number;
  step?: number;
  showCurrentValue?: boolean;
};

export type TextQuestion = {
  kind: "text";
  id: string;
  text: string;
  placeholder?: string;
  optional?: boolean;
  rows?: number;
  maxLength?: number;
};

export type SurveyQuestion =
  | LikertQuestion
  | ChoiceQuestion
  | SliderQuestion
  | TextQuestion;

export type ChoiceQuestionGroup = {
  id: string;
  title?: string;
  description?: string;
  items: ChoiceQuestion[];
};

export type ContentPage = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string[];
  progressiveReveal?: boolean;
  footerInstructions?: string[];
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  eyebrowClassName?: string;
};

export type InteractivePopupVariant = {
  initialTitle: string;
  initialBody: string[];
};

export type InteractiveFeedbackPrompt = {
  title: string;
  body: string[];
  placeholder: string;
  submitLabel: string;
  submitDelaySeconds?: number;
};

export type InteractiveStatusStep = {
  label: string;
  isError?: boolean;
};

export type InteractiveChatMessage =
  | {
      id: string;
      role: "ai";
      html: string;
      isError?: boolean;
      type?: undefined;
    }
  | {
      id: string;
      role: "user";
      text: string;
      type?: undefined;
    }
  | {
      id: string;
      role: "ai";
      type: "statusBubble";
      statusSteps: InteractiveStatusStep[];
    };

export type InteractiveChatConfig = {
  headerTitle: string;
  headerStatus: string;
  messages: InteractiveChatMessage[];
  composerPlaceholder: string;
};

export type BaseStageUI = {
  screen: string;
  kind: "likert" | "content" | "video" | "interactive";
  title: string;
  description: string;
  instructions: string[];
  introTitle?: string;
  submitLabel?: string;
  continueDelaySeconds?: number;
  accent?: AccentTone;
};

export type LikertStageUI = BaseStageUI & {
  kind: "likert";
  screen: "likert_scale";
  scale: LikertScaleConfig;
  display?: LikertDisplayConfig;
  questionGroups: LikertQuestionGroup[];
  questionSections?: LikertQuestionSection[];
  nextLabel?: string;
  previousLabel?: string;
};

export type ContentStageUI = BaseStageUI & {
  kind: "content";
  screen: "content_pages";
  pages: ContentPage[];
  nextLabel?: string;
  previousLabel?: string;
};

export type VideoStageUI = BaseStageUI & {
  kind: "video";
  screen: "video_player";
  videoUrl: string;
  posterUrl?: string;
  nextLabel?: string;
  preCompletionSubmitLabel?: string;
  completionMessage?: string;
  transitionModal?: {
    title: string;
    description: string;
    confirmLabel: string;
    confirmDelaySeconds?: number;
  };
};

export type InteractiveStageUI = BaseStageUI & {
  kind: "interactive";
  screen: "interactive_placeholder";
  chat: InteractiveChatConfig;
  popupDelaySeconds: number;
  popupByIv2: Record<string, InteractivePopupVariant>;
  feedbackPrompt: InteractiveFeedbackPrompt;
};

export type StageUI =
  | LikertStageUI
  | ContentStageUI
  | VideoStageUI
  | InteractiveStageUI;

export type AssignmentMode = "balanced" | "random";

export type StageVariantConfig = {
  queryKey?: string;
  mode: AssignmentMode;
  value: string[];
  directFrom?: "iv1" | "iv2";
  stratifyBy?: { column: "iv1" | "iv2" } | { stageVariant: string };
};

export type StageEligibility = {
  iv1In?: string[];
  iv2In?: string[];
};

export type StageDefinition = {
  id: string;
  active?: boolean;
  eligibility?: StageEligibility;
  variant: StageVariantConfig;
  validator: Record<string, string>;
  ui: Record<string, StageUI>;
  params?: Record<string, JsonObject>;
};

export type PipelineConfig = {
  code: string;
  assign: {
    iv1: { mode: AssignmentMode; values: string[] };
    iv2: { mode: AssignmentMode; values: string[] };
  };
  stages: StageDefinition[];
};

export type ProgressRecord = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  current_stage_index: number;
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  failed_reason: JsonObject | null;
  stage_variants: Record<string, string>;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
};

export type StagePayload = {
  id: string;
  variant: string;
  index: number;
  total: number;
  ui: StageUI | null;
};

export type StageResponse = {
  ok: true;
  pipeline: string;
  prolificId: string;
  iv1: string;
  iv2: string;
  stage: StagePayload;
};

export type CompletedResponse = {
  ok: true;
  prolificId: string;
  completed: true;
  redirectUrl: string;
};

export type FailedResponse = {
  ok: true;
  prolificId: string;
  failed: true;
  failed_stage_id?: string | null;
  failed_reason?: JsonObject | null;
  redirectUrl: string;
};

export type ParticipantApiResponse =
  | StageResponse
  | CompletedResponse
  | FailedResponse;

export type ApiErrorResponse = {
  ok: false;
  message: string;
};

export type SubmitResponse = {
  ok: true;
  passed: boolean;
  completed: boolean;
  nextStageId: string | null;
  redirectUrl: string | null;
  verdict: JsonObject;
  lockedOut?: boolean;
};

export type InitRequestBody = {
  prolificId: string;
};

export type SubmitRequestBody = {
  prolificId: string;
  stageId: string;
  answers: JsonObject;
  meta?: {
    stageSeconds?: number;
  };
};

export type ValidatorContext = {
  iv1: string;
  iv2: string;
};

export type ValidatorResult = {
  passed: boolean;
  verdict: JsonObject;
};

export type ValidatorFn = (
  ctx: ValidatorContext,
  answers: JsonObject,
  params?: JsonObject,
) => ValidatorResult;

export type AdminStatus = "in_progress" | "failed" | "completed";

export type AdminOverviewRow = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  failed_reason_summary: string | null;
  current_stage_index: number;
  stage_variants: JsonObject;
  submission_count: number;
  last_submission_stage_id: string | null;
  last_submission_variant_id: string | null;
  last_submission_passed: boolean | null;
  last_submission_stage_seconds: number | null;
  last_submission_at: string | null;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
};

export type AdminDetailRow = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  failed_reason: JsonObject | null;
  current_stage_index: number;
  stage_variants: JsonObject;
  submission_count: number;
  last_submission_stage_id: string | null;
  last_submission_variant_id: string | null;
  last_submission_passed: boolean | null;
  last_submission_stage_seconds: number | null;
  last_submission_at: string | null;
  last_submission_verdict: JsonObject | null;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
  questionnaire_answers: JsonObject;
  submissions_detail: unknown[];
};

export type AdminStatusBreakdownCell = {
  iv1: string;
  iv2: string;
  count: number;
};

export type AdminStatusSummary = {
  status: AdminStatus;
  total: number;
  breakdown: AdminStatusBreakdownCell[];
};

export type AdminDurationStats = {
  count: number;
  minSeconds: number | null;
  maxSeconds: number | null;
  averageSeconds: number | null;
};

export type AdminFeedbackContentSummary = {
  total: number;
  breakdown: AdminStatusBreakdownCell[];
};

export type AdminDashboardSummary = {
  in_progress: AdminStatusSummary;
  failed: AdminStatusSummary;
  completed: AdminStatusSummary;
  completedDuration: AdminDurationStats;
  completedFeedbackContent: AdminFeedbackContentSummary;
};

export type AdminDashboardResponse = {
  ok: true;
  rows: AdminOverviewRow[];
  summary: AdminDashboardSummary;
};

export type AdminParticipantDetailResponse = {
  ok: true;
  participant: AdminDetailRow;
};

export type AdminFeedbackRow = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
  feedback_content: string;
  feedback_reason: string | null;
  feedback_submitted_at: string;
  reason_submitted_at: string | null;
};

export type AdminFeedbackResponse = {
  ok: true;
  rows: AdminFeedbackRow[];
};

export type AdminResponseColumn = {
  key: string;
  stageId: string;
  sourceKey: string;
  label: string;
  kind: "likert" | "choice" | "slider" | "text" | "system";
  constructId: string | null;
};

export type AdminConstructDefinition = {
  id: string;
  label: string;
  itemCount: number;
  maxValue: number;
  questionColumnKeys: string[];
};

export type AdminStatsParticipantRow = {
  pipeline_code: string;
  prolific_id: string;
  iv1: string;
  iv2: string;
  status: AdminStatus;
  completed: boolean;
  failed: boolean;
  failed_stage_id: string | null;
  current_stage_index: number;
  submission_count: number;
  last_submission_stage_id: string | null;
  last_submission_at: string | null;
  started_at: string;
  updated_at: string;
  total_seconds: number | null;
  response_values: Record<string, unknown>;
  construct_averages: Record<string, number | null>;
};

export type AdminStatisticsResponse = {
  ok: true;
  rows: AdminStatsParticipantRow[];
  summary: AdminDashboardSummary;
  responseColumns: AdminResponseColumn[];
  constructs: AdminConstructDefinition[];
};
