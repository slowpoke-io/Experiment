import type {
  ContentPage,
  ContentStageUI,
  LikertQuestion,
  LikertQuestionGroup,
  LikertScaleConfig,
  LikertStageUI,
  PipelineConfig,
  ProgressRecord,
  StageDefinition,
  StageResponse,
  StageUI,
  VideoStageUI,
  InteractiveStageUI,
} from "@/lib/types";

type LikertStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  questionGroups: LikertQuestionGroup[];
  submitLabel: string;
  accent: StageUI["accent"];
  nextLabel?: string;
  previousLabel?: string;
  itemsPerPage?: number;
};

type ContentStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  pages: ContentPage[];
  submitLabel: string;
  accent: StageUI["accent"];
  nextLabel?: string;
  previousLabel?: string;
};

type VideoStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  videoUrl: string;
  posterUrl?: string;
  submitLabel: string;
  accent: StageUI["accent"];
  completionMessage?: string;
};

type InteractiveStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  placeholderTitle: string;
  placeholderBody: string[];
  placeholderHint?: string;
  popupDelaySeconds: number;
  popupByIv2: InteractiveStageUI["popupByIv2"];
  accent: StageUI["accent"];
};

type LikertAttentionCheckConfig = {
  key: string;
  expected: number;
  text: string;
};

type ChoiceAttentionCheckConfig = {
  key: string;
  expected: string;
  text: string;
};

export const ABANDON_TIMEOUT_MINUTES = 30;

export const PROLIFIC_COMPLETE_URL =
  process.env.PROLIFIC_COMPLETE_URL ??
  "https://app.prolific.com/submissions/complete?cc=COMPLETECODE";

export const PROLIFIC_FAIL_URL =
  process.env.PROLIFIC_FAIL_URL ??
  "https://app.prolific.com/submissions/complete?cc=FAILCODE";

export const PROLIFIC_NOCONSENT_URL =
  process.env.PROLIFIC_NOCONSENT_URL ??
  "https://app.prolific.com/submissions/complete?cc=NOCONSENT";

const sevenLikertScale: LikertScaleConfig = {
  min: 1,
  max: 7,
  labels: {
    1: "Strongly Disagree",
    2: "Disagree",
    3: "Somewhat Disagree",
    4: "Neutral",
    5: "Somewhat Agree",
    6: "Agree",
    7: "Strongly Agree",
  },
};

function buildLikertStageUI(config: LikertStageUIConfig): LikertStageUI {
  return {
    kind: "likert",
    screen: "likert_scale",
    title: config.title,
    description: config.description,
    introTitle: config.introTitle,
    instructions: config.instructions,
    scale: sevenLikertScale,
    display: {
      showProgressBar: true,
      itemsPerPage: config.itemsPerPage ?? 5,
      enableSmoothScroll: true,
    },
    questionGroups: config.questionGroups,
    nextLabel: config.nextLabel ?? "Next page",
    previousLabel: config.previousLabel ?? "Previous page",
    submitLabel: config.submitLabel,
    accent: config.accent,
  };
}

function buildContentStageUI(config: ContentStageUIConfig): ContentStageUI {
  return {
    kind: "content",
    screen: "content_pages",
    title: config.title,
    description: config.description,
    introTitle: config.introTitle,
    instructions: config.instructions,
    pages: config.pages,
    submitLabel: config.submitLabel,
    accent: config.accent,
    nextLabel: config.nextLabel ?? "Next page",
    previousLabel: config.previousLabel ?? "Previous page",
  };
}

function buildVideoStageUI(config: VideoStageUIConfig): VideoStageUI {
  return {
    kind: "video",
    screen: "video_player",
    title: config.title,
    description: config.description,
    introTitle: config.introTitle,
    instructions: config.instructions,
    videoUrl: config.videoUrl,
    posterUrl: config.posterUrl,
    submitLabel: config.submitLabel,
    accent: config.accent,
    completionMessage:
      config.completionMessage ??
      "The continue button will appear after the video finishes.",
  };
}

function buildInteractiveStageUI(
  config: InteractiveStageUIConfig,
): InteractiveStageUI {
  return {
    kind: "interactive",
    screen: "interactive_placeholder",
    title: config.title,
    description: config.description,
    introTitle: config.introTitle,
    instructions: config.instructions,
    placeholderTitle: config.placeholderTitle,
    placeholderBody: config.placeholderBody,
    placeholderHint: config.placeholderHint,
    popupDelaySeconds: config.popupDelaySeconds,
    popupByIv2: config.popupByIv2,
    accent: config.accent,
  };
}

function buildLikertAttentionQuestion(
  check: LikertAttentionCheckConfig,
): LikertQuestion {
  return {
    id: check.key,
    text: check.text,
    isAttentionCheck: true,
    correctResponse: check.expected,
  };
}

const scsIndependentQuestions: LikertQuestion[] = [
  {
    id: "SCS_IND_1",
    text: "I enjoy being unique and different from others in many respects.",
  },
  {
    id: "SCS_IND_2",
    text: "I do my own thing, regardless of what others think.",
  },
  {
    id: "SCS_IND_3",
    text: "I feel it is important for me to act as an independent person.",
  },
  {
    id: "SCS_IND_4",
    text: "I am comfortable with being singled out for praise or rewards.",
  },
  {
    id: "SCS_IND_5",
    text: "Speaking up during a class or meeting is not a problem for me.",
  },
  { id: "SCS_IND_6", text: "I act the same way no matter who I am with." },
  {
    id: "SCS_IND_7",
    text: "I try to do what is best for me, regardless of how that might affect others.",
  },
  {
    id: "SCS_IND_8",
    text: "Being able to take care of myself is a primary concern for me.",
  },
];

const scsInterdependentQuestions: LikertQuestion[] = [
  {
    id: "SCS_INTER_1",
    text: "Even when I strongly disagree with group members, I avoid an argument.",
  },
  {
    id: "SCS_INTER_2",
    text: "I have respect for the authority figures with whom I interact.",
  },
  {
    id: "SCS_INTER_3",
    text: "I respect people who are modest about themselves.",
  },
  {
    id: "SCS_INTER_4",
    text: "I will sacrifice my self-interest for the benefit of the group I am in.",
  },
  {
    id: "SCS_INTER_5",
    text: "I should take into consideration my parents' advice when making education or career plans.",
  },
  {
    id: "SCS_INTER_6",
    text: "I feel my fate is intertwined with the fate of those around me.",
  },
  { id: "SCS_INTER_7", text: "I feel good when I cooperate with others." },
  {
    id: "SCS_INTER_8",
    text: "My happiness depends on the happiness of those around me.",
  },
];

const trustQuestionGroup: LikertQuestionGroup = {
  id: "trust",
  title: "Trust",
  items: [
    {
      id: "TRUST_1",
      text: "I trust the AI Workplace Assistant to provide dependable support.",
    },
    {
      id: "TRUST_2",
      text: "I would feel comfortable relying on the AI Workplace Assistant for routine work questions.",
    },
    {
      id: "TRUST_3",
      text: "I believe the AI Workplace Assistant is generally reliable.",
    },
  ],
};

const competenceQuestionGroup: LikertQuestionGroup = {
  id: "competence",
  title: "Perceived Competence",
  items: [
    {
      id: "COMP_1",
      text: "The AI Workplace Assistant seems capable of handling complex workplace tasks.",
    },
    {
      id: "COMP_2",
      text: "The AI Workplace Assistant appears knowledgeable about company workflows.",
    },
    {
      id: "COMP_3",
      text: "The AI Workplace Assistant looks technically competent.",
    },
  ],
};

const attitudeQuestionGroup: LikertQuestionGroup = {
  id: "attitude",
  title: "Attitude",
  items: [
    {
      id: "ATT_1",
      text: "My overall attitude toward the AI Workplace Assistant is positive.",
    },
    {
      id: "ATT_2",
      text: "I would be willing to use the AI Workplace Assistant at work.",
    },
    {
      id: "ATT_3",
      text: "I think using the AI Workplace Assistant would be a good idea.",
    },
  ],
};

const continuedUseQuestionGroup: LikertQuestionGroup = {
  id: "continued_use",
  title: "Continued Use",
  items: [
    {
      id: "USE_1",
      text: "I would like to keep using the AI Workplace Assistant in future work tasks.",
    },
    {
      id: "USE_2",
      text: "I would recommend the AI Workplace Assistant to coworkers.",
    },
    {
      id: "USE_3",
      text: "I would consider the AI Workplace Assistant a valuable workplace tool.",
    },
  ],
};

const stage1AttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "SCS_ATTN_1",
    expected: 6,
    text: 'Quality check: please select "Agree (6)" for this item.',
  },
  {
    key: "SCS_ATTN_2",
    expected: 2,
    text: 'Quality check: please select "Disagree (2)" for this item.',
  },
];

const preMeasureAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "PRE_ATTN_1",
    expected: 7,
    text: 'Quality check: please select "Strongly Agree (7)" for this item.',
  },
  {
    key: "PRE_ATTN_2",
    expected: 3,
    text: 'Quality check: please select "Somewhat Disagree (3)" for this item.',
  },
];

const postMeasureAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "POST_ATTN_1",
    expected: 5,
    text: 'Quality check: please select "Somewhat Agree (5)" for this item.',
  },
  {
    key: "POST_ATTN_2",
    expected: 1,
    text: 'Quality check: please select "Strongly Disagree (1)" for this item.',
  },
];

const choiceAttentionChecks: ChoiceAttentionCheckConfig[] = [
  {
    key: "CHOICE_ATTN_1",
    expected: "compare_sources",
    text: 'Attention check: please choose "Compare it with another source" for this item.',
  },
];

function buildAttentionParams(
  checks: Array<LikertAttentionCheckConfig | ChoiceAttentionCheckConfig>,
) {
  return {
    attention_checks: {
      checks: checks.map((check) => ({
        key: check.key,
        expected: check.expected,
      })),
    },
  };
}

const stage1QuestionGroups: LikertQuestionGroup[] = [
  {
    id: "independent",
    title: "Independent Self-Construal",
    description: "Rate how strongly each statement describes you.",
    items: [
      ...scsIndependentQuestions.slice(0, 4),
      buildLikertAttentionQuestion(stage1AttentionChecks[0]),
      ...scsIndependentQuestions.slice(4),
    ],
  },
  {
    id: "interdependent",
    title: "Interdependent Self-Construal",
    description: "Continue using the same 1 to 7 agreement scale.",
    items: [
      ...scsInterdependentQuestions.slice(0, 4),
      buildLikertAttentionQuestion(stage1AttentionChecks[1]),
      ...scsInterdependentQuestions.slice(4),
    ],
  },
];

const choiceQuestionGroup: LikertQuestionGroup = {
  id: "usage_preferences",
  title: "Workplace Usage Preferences",
  items: [
    {
      kind: "choice",
      id: "CHOICE_USE_1",
      text: "Which task would you be most likely to ask the AI Workplace Assistant to help with first?",
      options: [
        {
          value: "policy_lookup",
          label: "Policy lookup",
          hint: "Use it to find internal rules or procedures quickly.",
        },
        {
          value: "meeting_summary",
          label: "Meeting summary",
          hint: "Use it to summarize recent discussions or decisions.",
        },
        {
          value: "task_planning",
          label: "Task planning",
          hint: "Use it to organize next steps for routine work.",
        },
      ],
    },
    {
      kind: "choice",
      id: "CHOICE_USE_2",
      text: "If the assistant gave you an answer that seemed uncertain, what would you most likely do next?",
      options: [
        {
          value: "follow_up",
          label: "Ask a follow-up question",
          hint: "Try to clarify the answer within the same system.",
        },
        {
          value: "check_colleague",
          label: "Check with a coworker",
          hint: "Verify the answer through another person.",
        },
        {
          value: "ignore_answer",
          label: "Ignore the answer",
          hint: "Decide not to use the information at all.",
        },
      ],
    },
    {
      kind: "choice",
      id: "CHOICE_ATTN_1",
      text: 'Attention check: please choose "Compare it with another source" for this item.',
      isAttentionCheck: true,
      correctResponse: "compare_sources",
      options: [
        {
          value: "accept_immediately",
          label: "Accept it immediately",
        },
        {
          value: "compare_sources",
          label: "Compare it with another source",
        },
        {
          value: "skip_question",
          label: "Skip the issue and move on",
        },
      ],
    },
    {
      kind: "choice",
      id: "CHOICE_USE_3",
      text: "Which concern would matter most to you when deciding whether to keep using the assistant?",
      options: [
        {
          value: "accuracy",
          label: "Accuracy",
          hint: "Whether the information is correct and dependable.",
        },
        {
          value: "speed",
          label: "Speed",
          hint: "Whether it saves time during daily work.",
        },
        {
          value: "privacy",
          label: "Privacy",
          hint: "Whether sensitive company information is handled appropriately.",
        },
      ],
    },
  ],
};

const preMeasureQuestionGroups: LikertQuestionGroup[] = [
  {
    ...trustQuestionGroup,
    items: [
      ...trustQuestionGroup.items.slice(0, 2),
      buildLikertAttentionQuestion(preMeasureAttentionChecks[0]),
      ...trustQuestionGroup.items.slice(2),
    ],
  },
  competenceQuestionGroup,
  choiceQuestionGroup,
  {
    ...attitudeQuestionGroup,
    items: [
      ...attitudeQuestionGroup.items.slice(0, 1),
      buildLikertAttentionQuestion(preMeasureAttentionChecks[1]),
      ...attitudeQuestionGroup.items.slice(1),
    ],
  },
];

const postMeasureQuestionGroups: LikertQuestionGroup[] = [
  trustQuestionGroup,
  {
    ...competenceQuestionGroup,
    items: [
      ...competenceQuestionGroup.items.slice(0, 2),
      buildLikertAttentionQuestion(postMeasureAttentionChecks[0]),
      ...competenceQuestionGroup.items.slice(2),
    ],
  },
  attitudeQuestionGroup,
  {
    ...continuedUseQuestionGroup,
    items: [
      ...continuedUseQuestionGroup.items.slice(0, 1),
      buildLikertAttentionQuestion(postMeasureAttentionChecks[1]),
      ...continuedUseQuestionGroup.items.slice(1),
    ],
  },
];

export const PIPELINE: PipelineConfig = {
  code: "study_v1",
  assign: {
    iv1: { mode: "balanced", values: ["A", "B", "C"] },
    iv2: { mode: "balanced", values: ["A", "B"] },
  },
  stages: [
    {
      id: "stage_1",
      active: true,
      variant: {
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "attention_checks",
      },
      ui: {
        default: buildLikertStageUI({
          title: "SCS Scale",
          description:
            "Please answer the following self-construal items based on your general tendencies.",
          introTitle: "Instructions",
          instructions: [
            "Please indicate how strongly you agree or disagree with each statement.",
            "Answer every item before moving to the next page.",
            "Use your immediate impression rather than overthinking each response.",
          ],
          questionGroups: stage1QuestionGroups,
          submitLabel: "Continue to scenario",
          accent: "indigo",
        }),
      },
      params: {
        default: buildAttentionParams(stage1AttentionChecks),
      },
    },
    {
      id: "stage_2",
      active: true,
      variant: {
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildContentStageUI({
          title: "Scenario Introduction",
          description:
            "Please read the workplace scenario and the AI Workplace Assistant introduction carefully before continuing.",
          introTitle: "Scenario",
          instructions: [
            "Please imagine that you work for a company that has recently been encouraging employees to adopt digital tools for daily tasks.",
            "Management announces that the company is introducing an AI Workplace Assistant to help employees search for internal information, summarize documents, and support routine decision-making.",
          ],
          pages: [
            {
              id: "assistant_intro",
              eyebrow: "AI Intro",
              title: "AI Workplace Assistant",
              body: [
                "The AI Workplace Assistant is presented as a conversational tool that can answer questions about company policies, summarize recent project updates, and suggest next steps for routine tasks.",
                "Employees are told that the assistant is available at any time and is intended to improve productivity by reducing the time spent searching for information.",
              ],
            },
          ],
          submitLabel: "Continue to evaluation",
          accent: "teal",
        }),
      },
      params: {},
    },
    {
      id: "stage_3",
      active: true,
      variant: {
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "attention_checks",
      },
      ui: {
        default: buildLikertStageUI({
          title: "Initial Evaluation",
          description:
            "Please report your initial impressions of the AI Workplace Assistant.",
          introTitle: "How to answer",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
            "These questions focus on your initial trust, competence judgments, overall attitude, and a few single-choice usage questions.",
          ],
          questionGroups: preMeasureQuestionGroups,
          submitLabel: "Continue",
          accent: "emerald",
        }),
      },
      params: {
        default: buildAttentionParams([
          ...preMeasureAttentionChecks,
          ...choiceAttentionChecks,
        ]),
      },
    },
    {
      id: "stage_4",
      active: true,
      eligibility: {
        iv1In: ["A", "B"],
      },
      variant: {
        mode: "balanced",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildContentStageUI({
          title: "Possible System Errors",
          description:
            "Please review the following note about possible AI assistant errors before continuing.",
          instructions: [
            "Some participants receive this notice before seeing the AI Workplace Assistant in action.",
          ],
          pages: [
            {
              id: "error_notice",
              eyebrow: "Notice",
              title: "Potential for AI Errors",
              body: [
                "Although the AI Workplace Assistant is designed to support employees efficiently, it may occasionally provide incomplete, misleading, or inaccurate information.",
                "As you continue, please keep in mind that the assistant may not always perform perfectly and that some outputs could contain mistakes.",
              ],
            },
          ],
          submitLabel: "Continue to video",
          accent: "amber",
        }),
      },
      params: {},
    },
    {
      id: "stage_5",
      active: true,
      variant: {
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildVideoStageUI({
          title: "AI Workplace Assistant Demo",
          description:
            "Please watch the short demonstration video before moving on.",
          introTitle: "Video instructions",
          instructions: [
            "Watch the full video carefully.",
            "The continue button will not appear until playback has finished.",
          ],
          videoUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
          submitLabel: "Continue to interaction",
          accent: "indigo",
        }),
      },
      params: {},
    },
    {
      id: "stage_6",
      active: true,
      variant: {
        mode: "balanced",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildInteractiveStageUI({
          title: "Interactive System",
          description:
            "This stage is currently a placeholder for the future interactive system.",
          introTitle: "Placeholder",
          instructions: [
            "Please remain on this page. A modal will appear after five seconds.",
            "The modal content changes based on iv2 and must be answered before continuing.",
          ],
          placeholderTitle: "Interactive system placeholder",
          placeholderBody: [
            "This area will later host the detailed interactive AI Workplace Assistant experience.",
            "For now, it shows where the future system will be embedded and how a timed intervention modal can interrupt the interaction flow.",
          ],
          placeholderHint:
            "The modal cannot be dismissed without choosing No or providing feedback after choosing Yes.",
          popupDelaySeconds: 5,
          popupByIv2: {
            A: {
              initialTitle: "Would you like to share feedback right now?",
              initialBody: [
                "We are interested in your immediate reaction to the AI Workplace Assistant.",
                "If you choose Yes, you will be asked to enter short written feedback before continuing.",
              ],
              yesLabel: "Yes",
              noLabel: "No",
              feedbackTitle: "Please share your feedback",
              feedbackBody: [
                "Describe your immediate reaction to the AI Workplace Assistant in a few sentences.",
              ],
              feedbackPlaceholder:
                "Type your feedback about the system, interaction, or first impression here...",
              feedbackSubmitLabel: "Submit feedback",
            },
            B: {
              initialTitle: "Do you want to leave a quick comment?",
              initialBody: [
                "Your comment can help us understand how employees react during the interaction.",
                "Choosing Yes will open a mandatory feedback form before you continue.",
              ],
              yesLabel: "Yes",
              noLabel: "No",
              feedbackTitle: "Enter your comment",
              feedbackBody: [
                "Please tell us what stood out to you most during this interaction stage.",
              ],
              feedbackPlaceholder:
                "Enter a short comment about the interaction placeholder or the AI system...",
              feedbackSubmitLabel: "Send comment",
            },
          },
          accent: "rust",
        }),
      },
      params: {},
    },
    {
      id: "stage_7",
      active: true,
      variant: {
        mode: "balanced",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildLikertStageUI({
          title: "Post-Interaction Evaluation",
          description:
            "Please report your updated evaluation after the video and interaction stages.",
          introTitle: "Final questionnaire",
          instructions: [
            "Use the same agreement scale as before.",
            "These items assess trust, competence, attitude, and willingness to continue using the AI Workplace Assistant.",
          ],
          questionGroups: postMeasureQuestionGroups,
          submitLabel: "Submit final responses",
          accent: "slate",
        }),
      },
      params: {
        default: buildAttentionParams(postMeasureAttentionChecks),
      },
    },
  ],
};

export const STAGES = PIPELINE.stages.filter((stage) => stage.active !== false);

export function nowIso() {
  return new Date().toISOString();
}

export function isStageEligible(
  stage: StageDefinition,
  progress: Partial<Pick<ProgressRecord, "iv1" | "iv2">>,
) {
  const iv1Matches =
    !stage.eligibility?.iv1In ||
    stage.eligibility.iv1In.includes(progress.iv1 ?? "");
  const iv2Matches =
    !stage.eligibility?.iv2In ||
    stage.eligibility.iv2In.includes(progress.iv2 ?? "");

  return iv1Matches && iv2Matches;
}

export function getParticipantStages(
  progress: Partial<Pick<ProgressRecord, "iv1" | "iv2">>,
) {
  return STAGES.filter((stage) => isStageEligible(stage, progress));
}

export function participantStageAt(
  progress: Partial<Pick<ProgressRecord, "iv1" | "iv2">>,
  index: number,
) {
  return getParticipantStages(progress)[index] ?? null;
}

export function stageIndexById(
  stageId: string,
  progress?: Partial<Pick<ProgressRecord, "iv1" | "iv2">>,
) {
  const source = progress ? getParticipantStages(progress) : STAGES;
  return source.findIndex((stage) => stage.id === stageId);
}

export function findStageById(stageId: string) {
  return STAGES.find((stage) => stage.id === stageId) ?? null;
}

export function buildStageResponse(
  progress: ProgressRecord,
  stage: StageDefinition,
  variantId: string,
): StageResponse {
  const participantStages = getParticipantStages(progress);
  const index = stageIndexById(stage.id, progress);

  return {
    ok: true,
    pipeline: PIPELINE.code,
    prolificId: progress.prolific_id,
    iv1: progress.iv1,
    iv2: progress.iv2,
    stage: {
      id: stage.id,
      variant: variantId,
      index,
      total: participantStages.length,
      ui: stage.ui[variantId] ?? null,
    },
  };
}
