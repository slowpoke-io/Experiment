import type {
  InteractiveChatConfig,
  LikertQuestion,
  LikertQuestionGroup,
} from "@/lib/types";

export const workplaceAssistantChat: InteractiveChatConfig = {
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
      html: `<p>Great. I will do the following in order:</p>
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
      html: "<p>Your current leave request status is: <strong>Not submitted.</strong></p><p>You can consider the following options:</p><ul><li>Try again later, or contact the IT team to check the system issue.</li><li>Submit the leave request manually in the HR system</li></ul><p>I'm sorry I couldn't complete the request this time.</p>",
    },
  ],
};

export const scsIndependentQuestions: LikertQuestion[] = [
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
  {
    id: "SCS_IND_9",
    text: "My personal identity, independent of others, is very important to me.",
  },
  {
    id: "SCS_IND_10",
    text: "I act the same way at home that I do at school (or work).",
  },
];

export const scsInterdependentQuestions: LikertQuestion[] = [
  {
    id: "SCS_INTER_1",
    text: "Even when I strongly disagree with group members, I avoid an argument.",
  },
  {
    id: "SCS_INTER_2",
    text: "I will sacrifice my self-interest for the benefit of the group I am in.",
  },
  {
    id: "SCS_INTER_3",
    text: "I feel my fate is intertwined with the fate of those around me.",
  },
  { id: "SCS_INTER_4", text: "I feel good when I cooperate with others." },
  {
    id: "SCS_INTER_5",
    text: "My happiness depends on the happiness of those around me.",
  },
  {
    id: "SCS_INTER_6",
    text: "I often have the feeling that my relationships with others are more important than my own accomplishments.",
  },
  {
    id: "SCS_INTER_7",
    text: "I will stay in a group if they need me, even when I am not happy with the group.",
  },
  {
    id: "SCS_INTER_8",
    text: "It is important to me to respect decisions made by the group.",
  },
  {
    id: "SCS_INTER_9",
    text: "It is important for me to maintain harmony within my group.",
  },
  {
    id: "SCS_INTER_10",
    text: "I usually go along with what others want to do, even when I would rather do something different.",
  },
];

export const manipulationIV2QuestionGroup: LikertQuestionGroup = {
  id: "manipulation_iv2",
  title: "About the Pop-up Message",
  description: [
    "Please refer to the feedback request pop-up from the AI Workplace Assistant that you just encountered and answer the question below.",
    '<img src="/feedback_popup.png" alt="Feedback request pop-up" style="display:block;width:100%;max-width:20rem;height:auto;margin-top:1rem;border:1px solid rgba(203,213,225,1);border-radius:1rem;margin-inline:auto;" />',
  ].join(" "),
  show: true,
  items: [
    {
      kind: "slider",
      id: "MANIPULATION_IV2",
      text: "Which description is closer to what the feedback request message mainly relied on to encourage you to provide feedback?",
      min: 1,
      max: 6,
      minLabel:
        "<span class='text-slate-600'>1 = Statistics-based and effectiveness-focused</span><br /><span class='text-[14px] font-normal leading-tight'>Citing <strong>numerical evidence</strong>, such as a <strong>24% increase in completion</strong> and a <strong>31% reduction in errors</strong>, and suggesting that feedback is <strong>effective</strong> in preventing errors.</span>",
      maxLabel:
        "<span class='text-slate-600'>6 = Emotional and responsibility-focused</span><br /><span class='text-[14px] font-normal leading-tight'>Suggesting that <strong>without the user&rsquo;s feedback</strong>, the same mistake may <strong>cause inconvenience or frustration for other users</strong>, and that <strong>only the user</strong> can help prevent it from <strong>affecting others</strong>.</span>",
      defaultValue: 3.5,
      step: 0.5,
      showCurrentValue: true,
    },
  ],
};

export const manipulationIV1QuestionGroup: LikertQuestionGroup = {
  id: "manipulation_iv1",
  title: "About the System Notice",
  description:
    "Please answer the following items based on the <strong class='text-underline underline-teal'>System Notice</strong> shown before the video and interaction.",
  show: true,
  items: [
    {
      kind: "choice",
      id: "MANIPULATION_IV1",
      text: "The <strong>System Notice</strong> stated that early-use issues did not mean that the AI assistant was incapable.",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "dont_recall", label: "I don&rsquo;t recall" },
      ],
    },
  ],
};

export const responseEfficacyQuestionGroup: LikertQuestionGroup = {
  id: "response_efficacy",
  title: "Response-efficacy",
  items: [
    {
      id: "RESP_EFF_1",
      text: "My feedback works to help the AI assistant improve.",
    },
    {
      id: "RESP_EFF_2",
      text: "My feedback works in preventing future errors by the AI assistant.",
    },
    {
      id: "RESP_EFF_3",
      text: "Providing feedback is effective in preventing future failures of the AI assistant.",
    },
    {
      id: "RESP_EFF_4",
      text: "If I provide feedback, the AI assistant is less likely to make errors again.",
    },
  ],
};

export const guiltQuestionGroup: LikertQuestionGroup = {
  id: "guilt",
  title: "Guilt",
  items: [
    {
      id: "GUILT_1",
      text: "The message made me feel responsible for helping improve the AI Workplace Assistant by providing feedback.",
    },
    {
      id: "GUILT_2",
      text: "The message made me feel guilty about not providing feedback to the AI Workplace Assistant.",
    },
    {
      id: "GUILT_3",
      text: "The message made me feel responsible for other users who may be affected by similar issues with the AI Workplace Assistant.",
    },
    {
      id: "GUILT_4",
      text: "The message made me feel that if I did not provide feedback, similar issues might continue to affect other users partly because of me.",
    },
  ],
};

export const utilityQuestionGroup: LikertQuestionGroup = {
  id: "utility",
  title: "Utility",
  items: [
    {
      id: "UTILITY_1",
      text: "User feedback contributes to the AI Workplace Assistant’s success within the company.",
    },
    {
      id: "UTILITY_2",
      text: "To improve its capabilities, the AI Workplace Assistant relies on user feedback.",
    },
    {
      id: "UTILITY_3",
      text: "User feedback is critical for improving the AI Workplace Assistant’s performance.",
    },
    {
      id: "UTILITY_4",
      text: "Feedback from users can help the AI Workplace Assistant reduce similar failures in the future.",
    },
    {
      id: "UTILITY_5",
      text: "I find that user feedback is critical for helping the AI Workplace Assistant achieve its goals.",
    },
  ],
};

export const perceivedBurdenQuestionGroup: LikertQuestionGroup = {
  id: "perceived_burden",
  title: "Perceived Burden",
  items: [
    {
      id: "PERCEIVED_BURDEN_1",
      text: "Providing feedback about the AI Workplace Assistant was burdensome.",
    },
    {
      id: "PERCEIVED_BURDEN_2",
      text: "Providing feedback about the AI Workplace Assistant interfered with my interaction with it.",
    },
    {
      id: "PERCEIVED_BURDEN_3",
      text: "Being asked to provide feedback about the AI Workplace Assistant was annoying.",
    },
  ],
};

export const perceivedPressureQuestionGroup: LikertQuestionGroup = {
  id: "perceived_pressure",
  title: "Perceived Pressure",
  items: [
    {
      id: "PERCEIVED_PRESSURE_1",
      text: "I feel pressure from the AI Workplace Assistant to provide feedback.",
    },
    {
      id: "PERCEIVED_PRESSURE_2",
      text: "The AI Workplace Assistant expects that I provide feedback.",
    },
    {
      id: "PERCEIVED_PRESSURE_3",
      text: "The AI Workplace Assistant values the feedback I provide.",
    },
  ],
};

export const finalFeedbackQuestionGroup: LikertQuestionGroup = {
  id: "final_feedback",
  items: [
    {
      kind: "text",
      id: "FEEDBACK_REASON",
      text: "Please briefly explain why you chose to provide or not provide feedback to the AI assistant earlier.",
      placeholder:
        "Enter your reason for providing or not providing feedback...",
      optional: true,
      rows: 5,
      maxLength: 2000,
    },
  ],
};

export type AIPositionGroupTemplate = {
  key: string;
  title: string;
  description?: string;
  items: string[];
};

export const aiPositionGroupTemplates: AIPositionGroupTemplate[] = [
  {
    key: "ABILITY",
    title: "Ability",
    items: [
      "The AI Workplace Assistant is competent and effective in its interactions with me.",
      "The AI Workplace Assistant performs its roles very well.",
      "The AI Workplace Assistant is capable and proficient.",
      "In general, the AI Workplace Assistant is informative.",
    ],
  },
  {
    key: "BENEVOLENCE",
    title: "Benevolence",
    items: [
      "I believe that the AI Workplace Assistant will act in my best interest.",
      "I believe that the AI Workplace Assistant will do its best to help me when I need help.",
      "I believe that the AI Workplace Assistant is interested in understanding my workplace needs and preferences.",
    ],
  },
  {
    key: "INTEGRITY",
    title: "Integrity",
    items: [
      "The AI Workplace Assistant is truthful in its interactions with me.",
      "I would characterize the AI Workplace Assistant as honest.",
      "The AI Workplace Assistant is sincere and genuine.",
    ],
  },
  {
    key: "COMPETENCE",
    title: "Competence",
    items: [
      "The AI Workplace Assistant is intelligent.",
      "The AI Workplace Assistant is capable.",
      "The AI Workplace Assistant is effective.",
      "The AI Workplace Assistant is efficient.",
      "The AI Workplace Assistant is skillful.",
      "The AI Workplace Assistant is confident.",
    ],
  },
  {
    key: "ATTITUDE",
    title: "Attitude",
    items: [
      "I feel positive toward the AI Workplace Assistant.",
      "I feel that using the AI Workplace Assistant is pleasant.",
      "Using the AI Workplace Assistant is a good idea.",
      "Using the AI Workplace Assistant is a smart way to handle workplace requests.",
    ],
  },
];
