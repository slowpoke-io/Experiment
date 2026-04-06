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
};

export type LikertQuestionSection = {
  id: string;
  title?: string;
  description?: string;
  groups: LikertQuestionGroup[];
};

export type ChoiceOption = {
  value: string;
  label: string;
  hint?: string;
};

export type ChoiceQuestion = {
  kind: "choice";
  id: string;
  text: string;
  options: ChoiceOption[];
  isAttentionCheck?: boolean;
  correctResponse?: string;
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
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  eyebrowClassName?: string;
};

export type InteractivePopupVariant = {
  initialTitle: string;
  initialBody: string[];
  yesLabel: string;
  noLabel: string;
  feedbackTitle: string;
  feedbackBody: string[];
  feedbackPlaceholder: string;
  feedbackSubmitLabel: string;
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
  completionMessage?: string;
  transitionModal?: {
    title: string;
    description: string;
    confirmLabel: string;
  };
};

export type InteractiveStageUI = BaseStageUI & {
  kind: "interactive";
  screen: "interactive_placeholder";
  chat: InteractiveChatConfig;
  popupDelaySeconds: number;
  popupByIv2: Record<string, InteractivePopupVariant>;
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
