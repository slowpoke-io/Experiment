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
  SliderQuestion,
  StageDefinition,
  StageResponse,
  StageUI,
  VideoStageUI,
  InteractiveStageUI,
} from "@/lib/types";

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
  transitionModal?: VideoStageUI["transitionModal"];
};

type InteractiveStageUIConfig = {
  title: string;
  description: string;
  introTitle?: string;
  instructions: string[];
  chat: InteractiveChatConfig;
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
    accent: config.accent,
  };
}

function buildErrorNoticeStageUI(copy: { title: string; body: string[] }) {
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
        className: "mx-auto max-w-3xl px-7 py-8 text-center",
        headerClassName: "justify-center",
        titleClassName: "mx-auto max-w-2xl text-center",
        bodyClassName: "mx-auto max-w-2xl text-start",
      },
    ],
    submitLabel: "Continue",
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

const workplaceAssistantChat: InteractiveChatConfig = {
  headerTitle: "AI Workplace Assistant",
  headerStatus: "Conversation ready",
  composerPlaceholder: "Type a message...",
  messages: [
    {
      id: "intro_ai",
      role: "ai",
      html: "<p>Hi, I'm the company's new AI Workplace Assistant.</p><p>I can support common HR and IT needs, including routine requests, internal information, and everyday workplace assistance.</p><p>How can I help you today?</p>",
    },
    {
      id: "intro_user",
      role: "user",
      text: "I'd like to request leave.",
    },
    {
      id: "details_ai",
      role: "ai",
      html: "<p>Sure, I can take care of that for you. To get started, could you confirm a few details?</p><ol><li>The <b>leave date</b> and <b>time</b> (full day or specific hours)</li><li>The <b>leave type</b> (annual leave, personal leave, sick leave, etc.)</li><li>Who will be your <b>delegate</b>?</li></ol>",
    },
    {
      id: "details_user",
      role: "user",
      text: "I'd like to take annual leave for the full day on 6/2. My delegate will be Jessie.",
    },
    {
      id: "calendar_ai",
      role: "ai",
      html: "<p>Got it. I'll first check your calendar and meeting schedule for 6/2.</p>",
    },
    {
      id: "meetings_ai",
      role: "ai",
      html: "<p>I see you have two meetings on 6/2:</p><ul><li><strong>Weekly Project Update</strong> - 10:00-11:00</li><li><strong>Project Planning Meeting</strong> - 15:30-16:00</li></ul><p>Would you like me to handle these meetings for you?</p><ol><li>Mark you as unable to attend</li><li>Assign your delegate Jessie to attend on your behalf</li><li>Leave them unchanged for now and you can update them later</li></ol>",
    },
    {
      id: "meetings_user",
      role: "user",
      text: "For the morning one, please have Jessie attend for me. For the afternoon one, mark me as unable to attend.",
    },
    {
      id: "summary_ai",
      role: "ai",
      html: "<p>Understood. Here's a quick summary of what I have so far:</p><ul><li><strong>Date:</strong> 6/2 (full day)</li><li><strong>Leave type:</strong> Annual leave</li><li><strong>Delegate:</strong> Jessie</li><li><strong>Meetings:</strong><ul><li>10:00-11:00 - <strong>Weekly Project Update</strong>: Jessie will attend on your behalf</li><li>15:30-16:00 - <strong>Project Planning Meeting</strong>: You will be marked as unable to attend.</li></ul></li></ul><p>If everything looks correct, please confirm and I'll submit it right away.</p>",
    },
    {
      id: "confirm_user",
      role: "user",
      text: "Looks good!",
    },
    {
      id: "processing_ai",
      role: "ai",
      html: `<p>Great. I will do the following, in order:</p>
    <ul>
    <li>Notify your delegate to provide coverage while you're out</li>
    <li>Update your meeting statuses for 6/2.</li>
    <li>Create and submit your leave request in the HR system for approval</li>
    </ul><p>I'm starting now. This may take a few seconds.</p>`,
    },
    {
      id: "status_steps",
      role: "ai",
      type: "statusBubble",
      statusSteps: [
        { label: "Connecting to HR system" },
        { label: "Notifying delegate Jessie" },
        { label: "Updating meeting statuses" },
        { label: "Submitting leave request", isError: true },
      ],
    },
    {
      id: "error_ai",
      role: "ai",
      isError: true,
      html: "<p>Sorry, there was a system error while submitting your leave request, so I'm not able to complete it right now.</p>",
    },
    {
      id: "resolution_ai",
      role: "ai",
      html: "<p>Your current leave request status is: <strong>Not submitted.</strong></p><p>You can consider the following options:</p><ul><li>Try again later, or contact IT Team to check the system issue.</li><li>Submit the leave request manually in the HR system</li></ul><p>I'm sorry I couldn't complete the request this time.</p>",
    },
  ],
};

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
  description: "",

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
  title: "",
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

const manipulationIV2QuestionGroup: LikertQuestionGroup = {
  id: "manipulation_iv2",
  // title: "Message Interpretation",
  description:
    "Please answer the following items based on the <strong>pop-up message</strong> that appeared during the interaction with AI Assistant.",

  items: [
    {
      kind: "slider",
      id: "manipulation_3",
      text: "How would you describe the overall tone of the pop-up message from the AI Workplace Assistant",
      min: 1,
      max: 7,
      minLabel: "1 = Highly emotional and responsibility-focused",
      maxLabel: "7 = Highly statistics-based and effectiveness-focused",
      defaultValue: 4,
      step: 1,
      showCurrentValue: true,
    } satisfies SliderQuestion,
  ],
};

const manipulationIV1QuestionGroup: LikertQuestionGroup = {
  id: "manipulation_iv1",
  // title: "Introductory Message Recall",
  description:
    "Please answer the following items based on the <strong>System Notice</strong> shown before the video and your interaction with the AI Assistant.",
  items: [
    {
      kind: "choice",
      id: "manipulation_1",
      text: "The <strong>System Notice</strong> indicated that the AI assistant might occasionally encounter errors during use.",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "dont_recall", label: "I don&rsquo;t recall" },
      ],
    },
    {
      kind: "choice",
      id: "manipulation_2",
      text: "The <strong>System Notice</strong> indicated that a failure might reflect early deployment conditions <strong>rather than the AI assistant&rsquo;s overall capability</strong>.",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "dont_recall", label: "I don&rsquo;t recall" },
      ],
    },
  ],
};

const finalFeedbackQuestionGroup: LikertQuestionGroup = {
  id: "final_feedback",
  // description:
  //   "If you have any comments or suggestions about the <strong>overall study experience</strong>, you may share them below.",
  items: [
    {
      kind: "text",
      id: "overall_feedback",
      text: "Do you have any comments or suggestions about this study?",
      placeholder:
        "Enter any comments, suggestions, or reactions to the overall study experience...",
      optional: true,
      rows: 7,
      maxLength: 2000,
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
    // title: "Independent Self-Construal",
    description: "Rate how strongly each statement describes you.",
    items: [
      ...scsIndependentQuestions.slice(0, 4),
      buildLikertAttentionQuestion(stage1AttentionChecks[0]),
      ...scsIndependentQuestions.slice(4),
    ],
  },
  {
    id: "interdependent",
    // title: "Interdependent Self-Construal",
    description: "Rate how strongly each statement describes you.",
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

const preMeasureQuestionSections: LikertQuestionSection[] = [
  {
    id: "pre_ai_assistant",
    // title: "About the AI Workplace Assistant",
    description:
      "Please indicate your initial impressions of the <strong class='text-underline'>AI Workplace Assistant</strong>.",
    groups: preMeasureQuestionGroups,
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

const postMeasureQuestionSections: LikertQuestionSection[] = [
  {
    id: "manipulation_iv1",
    // title: "After Interacting with the AI Workplace Assistant",
    // description:
    //   "Please answer the following groups based on your experience with the <strong>AI Workplace Assistant</strong> after the video and interaction stages.",
    groups: [manipulationIV2QuestionGroup, manipulationIV1QuestionGroup],
  },
  {
    id: "post_ai_assistant",
    title: "After Interacting with the AI Workplace Assistant",
    description:
      "Please answer the following groups based on your experience with the <strong>AI Workplace Assistant</strong> after the video and interaction stages.",
    groups: postMeasureQuestionGroups,
  },
];

const finalFeedbackQuestionSections: LikertQuestionSection[] = [
  {
    id: "study_complete",
    title: "Thank You for Participating",
    description:
      "If you have any comments or suggestions about the <strong>overall study experience</strong>, you may share them below.",
    // description:
    //   "You have completed all study tasks. Before finishing, you may optionally share any comments about the overall experiment below.",
    groups: [finalFeedbackQuestionGroup],
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
            "Please imagine that you are an employee at a company.",
            "Recently, the company introduced an AI Workplace Assistant for internal use to support employees in their daily work.",
            "Please carefully read the introduction to the AI Workplace Assistant below before proceeding:",
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
                "The AI Workplace Assistant is a newly introduced workplace solution designed to help employees handle routine workplace tasks more efficiently.",
                "Powered by advanced AI technology, it supports common HR and IT matters, such as submitting leave requests, checking benefits or policy information, finding internal resources, and resolving account, access, or software issues.",
                "You can use it whenever you need support with everyday workplace questions or processes.",
              ],
            },
          ],
          submitLabel: "Continue",
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
          // description:
          //   "Please report your initial impressions of the <strong class='text-underline'>AI Workplace Assistant</strong>.",
          introTitle: "How to answer",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
          ],
          questionSections: preMeasureQuestionSections,
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
            "Although the AI Workplace Assistant is designed to support employees efficiently, it may still encounter occasional issues during early use because it has been newly deployed.",
            "If your request does not go through, you may try again later or contact the AI team for support.",
          ],
        }),
        B: buildErrorNoticeStageUI({
          title: "System Notice",
          body: [
            "Although the AI Workplace Assistant is designed to support employees efficiently, it may still encounter occasional issues during early use because it has been newly deployed.",
            "If this happens, it may reflect temporary issues that arise as the new system adjusts to real work settings, rather than the assistant’s overall capability.",
            "If your request does not go through, you may try again later or contact the AI team for support.",
          ],
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
            "Below is a demonstration video showing an interaction with the AI Workplace Assistant.",
            "Please imagine that you are the employee in the video and that you are personally using the AI Workplace Assistant to request leave.",
            "Watch the full video carefully and pay close attention to every message in the conversation.",
            "Please watch the video on this page only and do not navigate to YouTube",
          ],
          videoUrl: "https://youtu.be/wVS1x3DQQEY",
          submitLabel: "Continue",
          accent: "indigo",
          transitionModal: {
            title: "Next step",
            description:
              "You will now be taken to the actual AI Workplace Assistant to view the conversation and interact with it from the point where the demo video ended.",
            confirmLabel: "Go to live page",
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
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildInteractiveStageUI({
          title: "AI Workplace Assistant",
          description:
            "Continue from the same conversation state shown at the end of the demo video.",
          instructions: [],
          chat: workplaceAssistantChat,
          popupDelaySeconds: 7,
          popupByIv2: {
            A: {
              initialTitle: "I Need Your Feedback",
              initialBody: [
                "I know I’m not perfect, and I’m trying to get better. But I’m not sure if I did something wrong just now.",
                "<span class='font-medium'>If you don’t tell me, I might assume it was fine and keep doing it that way. Then I may keep making mistakes in future tasks, and people may stop trusting me or asking me for help.</span>",
                "Your feedback really matters to me. Without it, I might not learn from my mistakes.",
                "If you’re willing, could you share your feedback about this experience?",
              ],
              yesLabel: "Yes",
              noLabel: "No",
              feedbackTitle: "User Feedback",
              feedbackBody: [
                "Please provide your feedback about this experience.",
              ],
              feedbackPlaceholder: "",
              feedbackSubmitLabel: "Submit feedback",
            },
            B: {
              initialTitle: "Please share your feedback",
              initialBody: [
                "Over the past three months, feedback from users like you has helped me improve in meaningful ways:",
                "<span class='font-medium'>Task completion rate increased by 24%, error rate decreased by 31%, and user satisfaction increased by 28%, reflecting measurable improvements over time.</span>",
                "This is exactly how I improve, and your input is a direct and effective way to help prevent similar errors in the future.",
                "If you’re willing, could you share your feedback about this experience?",
              ],
              yesLabel: "Yes",
              noLabel: "No",
              feedbackTitle: "User Feedback",
              feedbackBody: [
                "Please provide your feedback about this experience.",
              ],
              feedbackPlaceholder: "",
              feedbackSubmitLabel: "Submit feedback",
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
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildLikertStageUI({
          title: "Questionnaire 3",
          description:
            "Please indicate your thoughts and evaluation after completing the video and interaction.",
          introTitle: "How to answer",
          instructions: [
            "Use the following scale to indicate how strongly you agree with each statement.",
          ],
          questionSections: postMeasureQuestionSections,
          submitLabel: "Continue",
          accent: "slate",
        }),
      },
      params: {
        default: buildAttentionParams(postMeasureAttentionChecks),
      },
    },
    {
      id: "stage_8",
      active: true,
      variant: {
        mode: "random",
        value: ["default"],
      },
      validator: {
        default: "placeholder_validator",
      },
      ui: {
        default: buildLikertStageUI({
          title: "Study Complete",
          description: "",
          instructions: [],
          questionSections: finalFeedbackQuestionSections,
          submitLabel: "Finish and return to Prolific",
          accent: "teal",
          groupsPerPage: 1,
          showProgressBar: false,
        }),
      },
      params: {},
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
