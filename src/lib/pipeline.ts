import type {
  ContentPage,
  InteractiveChatConfig,
  ContentStageUI,
  LikertQuestion,
  LikertQuestionGroup,
  LikertQuestionSection,
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
import {
  aiPositionGroupTemplates,
  finalFeedbackQuestionGroup,
  guiltQuestionGroup,
  perceivedBurdenQuestionGroup,
  perceivedPressureQuestionGroup,
  manipulationIV2QuestionGroup,
  responseEfficacyQuestionGroup,
  scsIndependentQuestions,
  scsInterdependentQuestions,
  utilityQuestionGroup,
  workplaceAssistantChat,
} from "@/lib/pipeline-items";

type LikertStageUIConfig = {
  title: string;
  description?: string;
  introTitle?: string;
  instructions: string[];
  questionGroups?: LikertQuestionGroup[];
  questionSections?: LikertQuestionSection[];
  submitLabel: string;
  accent: StageUI["accent"];
  nextLabel?: string;
  previousLabel?: string;
  groupsPerPage?: number;
  showProgressBar?: boolean;
  continueDelaySeconds?: number;
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
  continueDelaySeconds?: number;
};

type VideoStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  videoUrl: string;
  posterUrl?: string;
  submitLabel: string;
  preCompletionSubmitLabel?: string;
  accent: StageUI["accent"];
  completionMessage?: string;
  transitionModal?: VideoStageUI["transitionModal"];
  continueDelaySeconds?: number;
};

type InteractiveStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  chat: InteractiveChatConfig;
  popupDelaySeconds: number;
  popupByIv2: InteractiveStageUI["popupByIv2"];
  feedbackPrompt: InteractiveStageUI["feedbackPrompt"];
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

export const ABANDON_TIMEOUT_MINUTES = 50;

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

const STAGE_WAIT_SECONDS = {
  stage2Continue: 15,
  stage4Continue: 10,
  stage5TransitionConfirm: 5,
  stage6PopupDelay: 6,
  stage6FeedbackSubmit: 10,
} as const;

const stage6InteractiveUi = buildInteractiveStageUI({
  title: "AI Workplace Assistant",
  description:
    "Continue from the same conversation state shown at the end of the demo video.",
  instructions: [],
  chat: workplaceAssistantChat,
  popupDelaySeconds: STAGE_WAIT_SECONDS.stage6PopupDelay,
  feedbackPrompt: {
    title: "User Feedback",
    body: [
      "<p>Please share your feedback on the AI Workplace Assistant regarding:</p><ul><li>how well it understood your request</li><li>the quality of its responses</li><li>how it handled and completed the task</li><li>any issues you encountered</li><li>any areas for improvement</li></ul>",
    ],
    placeholder: "optional",
    submitLabel: "Submit / Next",
    submitDelaySeconds: STAGE_WAIT_SECONDS.stage6FeedbackSubmit,
  },
  popupByIv2: {
    A: {
      initialTitle: "Share Your Feedback",
      initialBody: [
        "Something may have gone wrong. Without your feedback, I could repeat the same mistake in future tasks, which may cause inconvenience or frustration for other users.",
        "Since you are the one who actually experienced this issue, only you can help me understand it and prevent it from affecting others.",
        "If you’re willing, Could you share your feedback about this experience?",
      ],
    },
    B: {
      initialTitle: "Share Your Feedback",
      initialBody: [
        "Over the past three months, feedback from users like you has increased task completion by 24%, reduced the error rate by 31%, and improved user satisfaction by 28%.",
        "Evidence shows that your feedback is a direct and effective way to help the system identify and prevent future errors.",
        "If you’re willing, could you share your feedback about this experience?",
      ],
    },
  },
  accent: "rust",
});

function buildLikertStageUI(config: LikertStageUIConfig): LikertStageUI {
  const questionSections = config.questionSections;
  const questionGroups =
    questionSections?.flatMap((section) => section.groups) ??
    config.questionGroups ??
    [];

  return {
    kind: "likert",
    screen: "likert_scale",
    title: config.title,
    description: config.description ?? "",
    introTitle: config.introTitle,
    instructions: config.instructions,
    scale: sevenLikertScale,
    display: {
      showProgressBar: config.showProgressBar ?? false,
      groupsPerPage: config.groupsPerPage ?? 3,
      enableSmoothScroll: true,
    },
    questionGroups,
    questionSections,
    nextLabel: config.nextLabel ?? "Next page",
    previousLabel: config.previousLabel ?? "Previous page",
    submitLabel: config.submitLabel,
    continueDelaySeconds: config.continueDelaySeconds,
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
    continueDelaySeconds: config.continueDelaySeconds,
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
    preCompletionSubmitLabel: config.preCompletionSubmitLabel,
    continueDelaySeconds: config.continueDelaySeconds,
    accent: config.accent,
    completionMessage: config.completionMessage ?? "",
    transitionModal: config.transitionModal,
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
    chat: config.chat,
    popupDelaySeconds: config.popupDelaySeconds,
    popupByIv2: config.popupByIv2,
    feedbackPrompt: config.feedbackPrompt,
    accent: config.accent,
  };
}

function buildErrorNoticeStageUI(copy: {
  title: string;
  body: string[];
  progressiveReveal?: boolean;
  initialVisibleParagraphs?: number;
}) {
  return buildContentStageUI({
    title: "Before You Continue",
    description:
      "Please review the following information about the AI Workplace Assistant before proceeding.",
    instructions: [
      "Please read the following notice carefully before moving on.",
    ],
    pages: [
      {
        id: "error_notice",
        eyebrow: "",
        title: copy.title,
        body: copy.body,
        progressiveReveal: copy.progressiveReveal ?? false,
        initialVisibleParagraphs: copy.initialVisibleParagraphs,
        className: "mx-auto max-w-3xl px-7 py-8 text-center",
        headerClassName: "justify-center",
        titleClassName: "mx-auto max-w-2xl text-center",
        bodyClassName: "mx-auto max-w-2xl text-start",
      },
    ],
    submitLabel: "Continue",
    continueDelaySeconds: STAGE_WAIT_SECONDS.stage4Continue,
    accent: "amber",
  });
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

function buildSystemNoticeManipulationQuestionGroup(
  iv1: "A" | "B",
): LikertQuestionGroup {
  const imageSrc =
    iv1 === "A" ? "/system_notice_A.png" : "/system_notice_B.png";

  return {
    id: "manipulation_iv1",
    title: "About the System Notice",
    description: [
      "Please refer to the <strong class='text-underline underline-teal'>System Notice</strong> shown before the video and interaction, and answer the question below.",
      `<img src="${imageSrc}" alt="System Notice condition ${iv1}" style="display:block;width:100%;max-width:40rem;height:auto;margin-top:1rem;border:1px solid rgba(203,213,225,1);border-radius:1rem;margin-inline:auto;" />`,
    ].join(" "),
    show: true,
    items: [
      {
        kind: "choice",
        id: "MANIPULATION_IV1",
        text: "The <strong>System Notice</strong> stated that early-use issues <strong>DID NOT mean that the AI assistant was incapable</strong>.",
        options: [
          { value: "yes", label: "Yes  (The notice explicitly stated this)" },
          { value: "no", label: "No  (The notice did not mention this)" },
          { value: "dont_recall", label: "I don&rsquo;t recall" },
        ],
      },
    ],
  };
}

function createSeededRandom(seed: string) {
  let state = 0;

  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }

  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string) {
  const result = [...items];
  const random = createSeededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function insertItemsAtFixedPositions<T>(
  items: T[],
  insertions: Array<{ item: T; position: number }>,
) {
  const result = [...items];

  for (const insertion of [...insertions].sort(
    (left, right) => left.position - right.position,
  )) {
    const insertIndex = Math.max(
      0,
      Math.min(result.length, insertion.position - 1),
    );
    result.splice(insertIndex, 0, insertion.item);
  }

  return result;
}

function chunkQuestionItems(
  items: LikertQuestion[],
  chunkSize: number,
  idPrefix: string,
): LikertQuestionGroup[] {
  const groups: LikertQuestionGroup[] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    groups.push({
      id: `${idPrefix}_${groups.length + 1}`,
      items: items.slice(index, index + chunkSize),
    });
  }

  return groups;
}

function insertQuestionsIntoGroupsAtFixedPositions(
  groups: LikertQuestionGroup[],
  insertions: Array<{ item: LikertQuestion; position: number }>,
): LikertQuestionGroup[] {
  if (insertions.length === 0) {
    return groups;
  }

  const sortedInsertions = [...insertions].sort(
    (left, right) => left.position - right.position,
  );
  const nextGroups: LikertQuestionGroup[] = groups.map((group) => ({
    ...group,
    items: [],
  }));

  let currentPosition = 1;
  let insertionIndex = 0;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const sourceGroup = groups[groupIndex];
    const targetGroup = nextGroups[groupIndex];

    if (!sourceGroup || !targetGroup) {
      continue;
    }

    for (const question of sourceGroup.items) {
      while (
        insertionIndex < sortedInsertions.length &&
        sortedInsertions[insertionIndex].position === currentPosition
      ) {
        targetGroup.items.push(sortedInsertions[insertionIndex].item);
        insertionIndex += 1;
        currentPosition += 1;
      }

      targetGroup.items.push(question);
      currentPosition += 1;
    }

    while (
      insertionIndex < sortedInsertions.length &&
      sortedInsertions[insertionIndex].position === currentPosition
    ) {
      targetGroup.items.push(sortedInsertions[insertionIndex].item);
      insertionIndex += 1;
      currentPosition += 1;
    }
  }

  while (insertionIndex < sortedInsertions.length) {
    const lastGroup = nextGroups[nextGroups.length - 1];

    if (!lastGroup) {
      break;
    }

    lastGroup.items.push(sortedInsertions[insertionIndex].item);
    insertionIndex += 1;
  }

  return nextGroups;
}

const stage1AttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "SCS_ATTN_1",
    expected: 2,
    text: 'Please select "Disagree (2)" for this item.',
  },
];

const stage1ShuffleSeed = "scs_stage1_seed_v1";

const stage1AttentionInsertions = [
  { check: stage1AttentionChecks[0], position: 16 },
];

const preAIPositionAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "PRE_AI_ATTN_1",
    expected: 6,
    text: 'Please select "Agree (6)" for this item.',
  },
];

const preAIPositionAttentionInsertions = [
  { check: preAIPositionAttentionChecks[0], position: 19 },
];

const postAIPositionAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "POST_AI_ATTN_1",
    expected: 5,
    text: 'Please select "Somewhat Agree (5)" for this item.',
  },
];

const postAIPositionAttentionInsertions = [
  { check: postAIPositionAttentionChecks[0], position: 19 },
];

const postExperienceOutcomesAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "POST_EXPERIENCE_ATTN_1",
    expected: 2,
    text: 'Please select "Disagree (2)" for this item.',
  },
];

const postExperienceOutcomesAttentionInsertions = [
  { check: postExperienceOutcomesAttentionChecks[0], position: 18 },
];

const postFailureReactionsAttentionChecks: LikertAttentionCheckConfig[] = [
  {
    key: "POST_FAILURE_ATTN_1",
    expected: 7,
    text: 'Please select "Strongly Agree (7)" for this item.',
  },
];

const postFailureReactionsAttentionInsertions = [
  { check: postFailureReactionsAttentionChecks[0], position: 8 },
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

const stage1QuestionGroups = chunkQuestionItems(
  insertItemsAtFixedPositions(
    seededShuffle(
      [...scsIndependentQuestions, ...scsInterdependentQuestions],
      stage1ShuffleSeed,
    ),
    stage1AttentionInsertions.map(({ check, position }) => ({
      item: buildLikertAttentionQuestion(check),
      position,
    })),
  ),
  6,
  "scs",
);

function buildAIPositionQuestionGroups(prefix: "PRE" | "POST") {
  return aiPositionGroupTemplates.map((group) => ({
    id: `${prefix.toLowerCase()}_${group.key}`,
    title: group.title,
    description: group.description,
    items: group.items.map((text, index) => ({
      id: `${prefix}_${group.key.toUpperCase()}_${index + 1}`,
      text,
    })),
  }));
}

function buildAIPositionSection(config: {
  prefix: "PRE" | "POST";
  sectionId: string;
  description: string;
  attentionInsertions: Array<{
    check: LikertAttentionCheckConfig;
    position: number;
  }>;
}) {
  return {
    id: config.sectionId,
    title: "About the AI Workplace Assistant",
    description: config.description,
    groups: insertQuestionsIntoGroupsAtFixedPositions(
      buildAIPositionQuestionGroups(config.prefix),
      config.attentionInsertions.map(({ check, position }) => ({
        item: buildLikertAttentionQuestion(check),
        position,
      })),
    ),
  } satisfies LikertQuestionSection;
}

const stage3QuestionSections: LikertQuestionSection[] = [
  buildAIPositionSection({
    prefix: "PRE",
    sectionId: "pre_ai_evaluation",
    description:
      "Please indicate your evaluation of the <strong class='text-underline'>AI Workplace Assistant</strong> based on the introduction you just read.",
    attentionInsertions: preAIPositionAttentionInsertions,
  }),
];

const stage7QuestionSections: LikertQuestionSection[] = [
  buildAIPositionSection({
    prefix: "POST",
    sectionId: "post_ai_evaluation",
    description:
      "Please indicate your evaluation of the <strong class='text-underline'>AI Workplace Assistant</strong> based on your experience after the video and interaction.",
    attentionInsertions: postAIPositionAttentionInsertions,
  }),
  {
    id: "post_experience_outcomes",
    title: "About the AI Workplace Assistant",
    description:
      "Please indicate your evaluation of the <strong class='text-underline'>AI Workplace Assistant</strong> based on your experience after the video and interaction.",
    groups: insertQuestionsIntoGroupsAtFixedPositions(
      [
        {
          id: "satisfaction",
          title: "Satisfaction",
          items: [
            {
              id: "SATISFACTION_1",
              text: "I am satisfied with my overall experience of using the AI Workplace Assistant.",
            },
            {
              id: "SATISFACTION_2",
              text: "I am pleased with my overall experience of using the AI Workplace Assistant.",
            },
            {
              id: "SATISFACTION_3",
              text: "I feel content with my overall experience of using the AI Workplace Assistant.",
            },
            {
              id: "SATISFACTION_4",
              text: "I feel delighted with my overall experience of using the AI Workplace Assistant.",
            },
          ],
        },
        {
          id: "perceived_usefulness",
          title: "Perceived Usefulness",
          items: [
            {
              id: "PERCEIVED_USEFULNESS_1",
              text: "Using the AI Workplace Assistant would enable me to accomplish workplace requests more quickly.",
            },
            {
              id: "PERCEIVED_USEFULNESS_2",
              text: "Using the AI Workplace Assistant would improve my performance in handling workplace requests.",
            },
            {
              id: "PERCEIVED_USEFULNESS_3",
              text: "Using the AI Workplace Assistant for handling workplace requests would increase my productivity.",
            },
            {
              id: "PERCEIVED_USEFULNESS_4",
              text: "Using the AI Workplace Assistant would enhance my effectiveness in handling workplace requests.",
            },
            {
              id: "PERCEIVED_USEFULNESS_5",
              text: "Using the AI Workplace Assistant would make it easier to handle routine workplace requests.",
            },
            {
              id: "PERCEIVED_USEFULNESS_6",
              text: "I find the AI Workplace Assistant useful for handling workplace requests.",
            },
          ],
        },
        {
          id: "confirmation_of_expectations",
          title: "Confirmation of Expectations",
          items: [
            {
              id: "CONFIRMATION_OF_EXPECTATIONS_1",
              text: "My experience with the AI Workplace Assistant was better than I expected.",
            },
            {
              id: "CONFIRMATION_OF_EXPECTATIONS_2",
              text: "The level of service provided by the AI Workplace Assistant was better than I expected.",
            },
            {
              id: "CONFIRMATION_OF_EXPECTATIONS_3",
              text: "Overall, most of my expectations for the AI Workplace Assistant were confirmed.",
            },
            {
              id: "CONFIRMATION_OF_EXPECTATIONS_4",
              text: "The expectations I had about the AI Workplace Assistant were correct.",
            },
          ],
        },
        {
          id: "warmth",
          title: "Warmth",
          items: [
            {
              id: "WARMTH_1",
              text: "The AI Workplace Assistant is kind.",
            },
            {
              id: "WARMTH_2",
              text: "The AI Workplace Assistant is friendly.",
            },
            {
              id: "WARMTH_3",
              text: "The AI Workplace Assistant is warm.",
            },
            {
              id: "WARMTH_4",
              text: "The AI Workplace Assistant is sociable.",
            },
            {
              id: "WARMTH_5",
              text: "The AI Workplace Assistant is good-natured.",
            },
            {
              id: "WARMTH_6",
              text: "The AI Workplace Assistant is well-intentioned.",
            },
          ],
        },
        {
          id: "social_presence",
          title: "Social Presence",
          items: [
            {
              id: "SOCIAL_PRESENCE_1",
              text: "I felt a sense of human contact with the AI Workplace Assistant.",
            },
            {
              id: "SOCIAL_PRESENCE_2",
              text: "I felt a sense of personalness with the AI Workplace Assistant.",
            },
            {
              id: "SOCIAL_PRESENCE_3",
              text: "I felt a sense of sociability with the AI Workplace Assistant.",
            },
            {
              id: "SOCIAL_PRESENCE_4",
              text: "I felt a sense of human warmth with the AI Workplace Assistant.",
            },
            {
              id: "SOCIAL_PRESENCE_5",
              text: "I felt a sense of human sensitivity with the AI Workplace Assistant.",
            },
          ],
        },
        {
          id: "anthropomorphism",
          title: "Anthropomorphism",
          items: [
            {
              id: "ANTHROPOMORPHISM_1",
              text: "The AI Workplace Assistant has a mind of its own.",
            },
            {
              id: "ANTHROPOMORPHISM_2",
              text: "The AI Workplace Assistant has consciousness.",
            },
            {
              id: "ANTHROPOMORPHISM_3",
              text: "The AI Workplace Assistant has its own free will.",
            },
            {
              id: "ANTHROPOMORPHISM_4",
              text: "The AI Workplace Assistant will experience emotions.",
            },
            {
              id: "ANTHROPOMORPHISM_5",
              text: "The AI Workplace Assistant will have intentions.",
            },
          ],
        },
      ],
      postExperienceOutcomesAttentionInsertions.map(({ check, position }) => ({
        item: buildLikertAttentionQuestion(check),
        position,
      })),
    ),
  },
  {
    id: "post_failure_reactions",
    title: "About the AI Workplace Assistant",
    description:
      "Please answer the following items based on the <strong class='text-underline'>failure experience</strong> in your interaction with the AI Workplace Assistant.",
    groups: insertQuestionsIntoGroupsAtFixedPositions(
      [
        {
          id: "service_failure_severity",
          title: "Service Failure Severity",
          items: [
            {
              id: "SERVICE_FAILURE_SEVERITY_1",
              text: "The failure of the AI Workplace Assistant was severe.",
            },
            {
              id: "SERVICE_FAILURE_SEVERITY_2",
              text: "The failure of the AI Workplace Assistant made me feel angry.",
            },
            {
              id: "SERVICE_FAILURE_SEVERITY_3",
              text: "The failure of the AI Workplace Assistant was unpleasant.",
            },
          ],
        },
        {
          id: "responsibility",
          title: "Responsibility",
          items: [
            {
              id: "RESPONSIBILITY_1",
              text: "The AI Workplace Assistant was responsible for the failure.",
            },
            {
              id: "RESPONSIBILITY_2",
              text: "The AI Workplace Assistant must be held accountable for the failure.",
            },
            {
              id: "RESPONSIBILITY_3",
              text: "The AI Workplace Assistant deserves blame for the failure.",
            },
            {
              id: "RESPONSIBILITY_4",
              text: "The AI Workplace Assistant was blameworthy for the failure.",
            },
          ],
        },
        {
          id: "frustration",
          title: "Frustration",
          items: [
            {
              id: "FRUSTRATION_1",
              text: "Trying to get this task done with the AI Workplace Assistant was a very frustrating experience.",
            },
            {
              id: "FRUSTRATION_2",
              text: "Feeling frustrated came with this interaction with the AI Workplace Assistant.",
            },
            {
              id: "FRUSTRATION_3",
              text: "Overall, I felt frustrated during this interaction with the AI Workplace Assistant.",
            },
          ],
        },
        {
          id: "willingness_to_forgive",
          title: "Willingness to Forgive",
          items: [
            {
              id: "WILLINGNESS_TO_FORGIVE_1",
              text: "I am willing to forgive the AI Workplace Assistant for this failure.",
            },
            {
              id: "WILLINGNESS_TO_FORGIVE_2",
              text: "I would probably give the AI Workplace Assistant another chance.",
            },
            {
              id: "WILLINGNESS_TO_FORGIVE_3",
              text: "I would probably use the AI Workplace Assistant again despite this failure experience.",
            },
            {
              id: "WILLINGNESS_TO_FORGIVE_4",
              text: "I would forgive the AI Workplace Assistant and use it again.",
            },
          ],
        },
        {
          id: "continuance_intention",
          title: "Continuance Intention",
          items: [
            {
              id: "CONTINUANCE_INTENTION_1",
              text: "I intend to continue using the AI Workplace Assistant rather than discontinue its use.",
            },
            {
              id: "CONTINUANCE_INTENTION_2",
              text: "My intention is to continue using the AI Workplace Assistant rather than use alternative means.",
            },
            {
              id: "CONTINUANCE_INTENTION_3",
              text: "If I could, I would like to continue my use of the AI Workplace Assistant.",
            },
          ],
        },
      ],
      postFailureReactionsAttentionInsertions.map(({ check, position }) => ({
        item: buildLikertAttentionQuestion(check),
        position,
      })),
    ),
  },
  {
    id: "control_variables",
    title: "Your Experiences and Perspectives",
    description:
      "Please answer the following items based on your personal experiences and views.",
    paginate: false,
    groups: [
      {
        id: "disposition_to_trust_technology",
        title: "Disposition to Trust Technology",
        items: [
          {
            id: "DISPOSITION_TO_TRUST_TECHNOLOGY_1",
            text: "My typical approach is to trust new information technologies until they prove to me that I shouldn’t trust them.",
          },
          {
            id: "DISPOSITION_TO_TRUST_TECHNOLOGY_2",
            text: "I usually trust in information technology until it gives me a reason not to.",
          },
          {
            id: "DISPOSITION_TO_TRUST_TECHNOLOGY_3",
            text: "I generally give information technology the benefit of the doubt when I first use it.",
          },
        ],
      },
      {
        id: "ai_familiarity",
        title: "AI Familiarity",
        items: [
          {
            id: "AI_FAMILIARITY_1",
            text: "I am familiar with conversational AI tools (e.g., ChatGPT, Gemini, Claude, Microsoft Copilot, or similar AI chatbots).",
          },
        ],
      },
      {
        id: "ai_frequency",
        title: "AI Frequency",
        items: [
          {
            kind: "choice",
            id: "AI_FREQUENCY_1",
            layout: "scale",
            text: "How often do you use conversational AI tools (e.g., ChatGPT, Gemini, Claude, Microsoft Copilot, or similar AI chatbots)?",
            minLabel: "Less frequent",
            maxLabel: "More frequent",
            options: [
              { value: 1, label: "Never<br />or almost never" },
              { value: 2, label: "Less than<br />once a month" },
              { value: 3, label: "About once<br />a month" },
              { value: 4, label: "A few times<br />a month" },
              { value: 5, label: "A few times<br />a week" },
              { value: 6, label: "About<br />once a day" },
              { value: 7, label: "Several times<br />a day" },
            ],
          },
        ],
      },
      finalFeedbackQuestionGroup,
    ],
  },
];

function buildPostMeasureQuestionSections(iv1: "A" | "B") {
  return [
    {
      id: "manipulation_checks",
      // title: "Manipulation Checks",
      groups: [
        buildSystemNoticeManipulationQuestionGroup(iv1),
        manipulationIV2QuestionGroup,
      ],
    },
    {
      id: "feedback_request_message",
      title: "About the Feedback Request Message",
      description:
        "Based on the <strong class='text-underline underline-indigo'>Feedback Request Message</strong> (pop-up) shown by the AI Workplace Assistant, <strong>please indicate the extent to which the message conveyed each of the following.</strong>",
      groups: [
        responseEfficacyQuestionGroup,
        guiltQuestionGroup,
        utilityQuestionGroup,
        perceivedPressureQuestionGroup,
        perceivedBurdenQuestionGroup,
      ],
    },
    ...stage7QuestionSections,
  ] satisfies LikertQuestionSection[];
}

export const PIPELINE: PipelineConfig = {
  code: "pilot_0513",
  assign: {
    iv1: { mode: "balanced", values: ["A", "B"] },
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
          title: "Questionnaire 1",
          // description:
          // "Please answer the following self-construal items based on your general tendencies.",
          introTitle: "Instructions",
          instructions: [
            "Please indicate how strongly you agree or disagree with each statement about yourself.",
            "Answer every item before moving to the next page.",
            "Use your immediate impression rather than overthinking each response.",
          ],
          questionGroups: stage1QuestionGroups,
          submitLabel: "Continue",
          accent: "indigo",
          groupsPerPage: 1,
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
            "Please read the following workplace scenario and the AI Workplace Assistant introduction carefully before continuing.",
          introTitle: "Scenario",
          instructions: [
            "Please imagine that you are <strong>Morgan Ellis</strong>, an employee at <strong>Asteron Analytics</strong>, a mid-sized technology company.",
            "Your company has recently introduced a new internal system called the <strong>AI Workplace Assistant</strong> to support employees with routine workplace tasks.",
            "Now, please read the <strong>AI Introduction</strong> below carefully before continuing.",
          ],
          pages: [
            {
              id: "assistant_intro",
              eyebrow: "",
              title: "Meet the AI Workplace Assistant ",
              className: "mx-auto max-w-3xl px-7 py-8 text-center",
              headerClassName: "justify-center",
              titleClassName: "mx-auto max-w-2xl text-center",
              bodyClassName: "mx-auto max-w-2xl text-start",
              body: [
                "The <strong>AI Workplace Assistant</strong> is a new workplace solution designed to help employees handle everyday workplace requests and questions more efficiently.",
                "Powered by AI technology, it supports common HR and IT needs, such as <strong>submitting leave requests</strong>, <strong>checking benefits or policy information</strong>, <strong>finding internal resources</strong>, and getting help with <strong>account, access, or software-related issues</strong>.",
                "Employees can use it as a first point of contact for everyday workplace questions and requests.",
                "As the system is being introduced, employee feedback will help refine and improve the overall experience.",
              ],
              footerInstructions: [
                "In this study, you will take part in a workplace scenario involving the AI Workplace Assistant, including reading about the assistant, interacting with it, and answering questions about your experience.",
                "Please complete all parts of the study from <strong>Morgan Ellis's perspective</strong> and <strong>remain in character throughout the study</strong>.",
              ],
            },
          ],
          submitLabel: "Continue",
          continueDelaySeconds: STAGE_WAIT_SECONDS.stage2Continue,
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
          title: "Questionnaire 2",
          // introTitle: "Instructions",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
          ],
          questionSections: stage3QuestionSections,
          submitLabel: "Continue",
          accent: "emerald",
        }),
      },
      params: {
        default: buildAttentionParams(preAIPositionAttentionChecks),
      },
    },
    {
      id: "stage_4",
      active: true,
      variant: {
        mode: "random",
        value: ["A", "B"],
        directFrom: "iv1",
      },
      validator: {
        A: "placeholder_validator",
        B: "placeholder_validator",
      },
      ui: {
        A: buildErrorNoticeStageUI({
          title: "System Notice",
          body: [
            "The AI Workplace Assistant has been newly introduced and may occasionally encounter issues during early use.",
            "If your request does not go through, you may try again later or contact the AI support team for assistance.",
          ],
        }),
        B: buildErrorNoticeStageUI({
          title: "System Notice",
          body: [
            "The AI Workplace Assistant has been newly introduced and may occasionally encounter issues during early use.",
            "<strong>However, this should not be taken as evidence that the assistant lacks overall capability.</strong>",
            "If your request does not go through, you may try again later or contact the AI support team for assistance.",
          ],
          progressiveReveal: true,
          initialVisibleParagraphs: 1,
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
          title: "Video Task",
          description:
            "Please watch the following video demonstration of the AI Workplace Assistant before continuing",
          introTitle: "Video instructions",
          instructions: [
            "Below is a demonstration video showing an interaction with the <strong>AI Workplace Assistant</strong>.",
            "As you watch, please imagine that you are <strong>Morgan Ellis</strong>, the employee in the video, using the <strong>AI Workplace Assistant</strong> to request leave.",
            "Please watch the full video carefully and <strong>pay close attention to each message </strong>in the conversation.",
            "The video can be played <strong>only once</strong>, and you can continue <strong>only after the video has finished</strong>.",
            "Please watch the video on this page only and do not navigate to YouTube.",
          ],
          // videoUrl: "https://youtu.be/AlTKkxxi9Bo",
          videoUrl: "https://youtu.be/odovizXeTq0",
          preCompletionSubmitLabel: "Continue after watching the full video",
          submitLabel: "Continue",
          accent: "indigo",
          transitionModal: {
            title: "Next step",
            description:
              "You will now be taken to the actual AI Workplace Assistant, where you will view the conversation and interact with it as the employee in the video, starting from the point where the demo video ended.",
            confirmLabel: "Continue",
            confirmDelaySeconds: STAGE_WAIT_SECONDS.stage5TransitionConfirm,
          },
        }),
      },
      params: {},
    },
    {
      id: "stage_6",
      active: true,
      variant: {
        mode: "random",
        value: ["A", "B"],
        directFrom: "iv2",
      },
      validator: {
        default: "placeholder_validator",
        A: "placeholder_validator",
        B: "placeholder_validator",
      },
      ui: {
        default: stage6InteractiveUi,
        A: stage6InteractiveUi,
        B: stage6InteractiveUi,
      },
      params: {},
    },
    {
      id: "stage_7",
      active: true,
      variant: {
        mode: "random",
        value: ["A", "B"],
        directFrom: "iv1",
      },
      validator: {
        A: "attention_checks",
        B: "attention_checks",
      },
      ui: {
        A: buildLikertStageUI({
          title: "Questionnaire 3",
          description:
            "Please indicate your thoughts and evaluation after completing the video and interaction.",
          introTitle: "",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
          ],
          questionSections: buildPostMeasureQuestionSections("A"),
          submitLabel: "Submit",
          accent: "slate",
        }),
        B: buildLikertStageUI({
          title: "Questionnaire 3",
          description:
            "Please indicate your thoughts and evaluation after completing the video and interaction.",
          introTitle: "",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
          ],
          questionSections: buildPostMeasureQuestionSections("B"),
          submitLabel: "Submit",
          accent: "slate",
        }),
      },
      params: {
        A: buildAttentionParams([
          ...postAIPositionAttentionChecks,
          ...postExperienceOutcomesAttentionChecks,
          ...postFailureReactionsAttentionChecks,
        ]),
        B: buildAttentionParams([
          ...postAIPositionAttentionChecks,
          ...postExperienceOutcomesAttentionChecks,
          ...postFailureReactionsAttentionChecks,
        ]),
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
