import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type StagePayload = {
  ok: true;
  pipeline: string;
  prolificId: string;
  iv1: string;
  iv2: string;
  stage: {
    id: string;
    variant: string;
    index: number;
    total: number;
    ui: Record<string, unknown>;
  };
};

const stagePayloads: StagePayload[] = [
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_1",
      variant: "default",
      index: 0,
      total: 7,
      ui: {
        kind: "likert",
        screen: "likert_scale",
        title: "Questionnaire 1",
        description: "",
        instructions: [
          "Please indicate how strongly you agree or disagree with each statement about yourself.",
        ],
        introTitle: "Instructions",
        scale: {
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
        },
        display: {
          showProgressBar: true,
          groupsPerPage: 1,
          enableSmoothScroll: true,
        },
        questionGroups: [
          {
            id: "group_1",
            items: [
              {
                id: "Q1",
                text: "I enjoy being unique and different from others.",
              },
            ],
          },
        ],
        nextLabel: "Next page",
        previousLabel: "Previous page",
        submitLabel: "Continue",
        accent: "indigo",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_2",
      variant: "default",
      index: 1,
      total: 7,
      ui: {
        kind: "content",
        screen: "content_pages",
        title: "Scenario Introduction",
        description: "Scenario content",
        introTitle: "Scenario",
        instructions: ["Read the scenario."],
        pages: [
          {
            id: "page_1",
            title: "Meet the AI Workplace Assistant",
            body: ["Scenario introduction body."],
          },
        ],
        submitLabel: "Continue",
        accent: "teal",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_3",
      variant: "default",
      index: 2,
      total: 7,
      ui: {
        kind: "likert",
        screen: "likert_scale",
        title: "Questionnaire 2",
        description: "",
        instructions: ["Use the scale below."],
        introTitle: "Instructions",
        scale: {
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
        },
        display: {
          showProgressBar: true,
          groupsPerPage: 1,
          enableSmoothScroll: true,
        },
        questionSections: [
          {
            id: "section_1",
            title: "About the AI Workplace Assistant",
            description: "Pre-evaluation",
            groups: [
              {
                id: "group_1",
                items: [
                  {
                    id: "PRE_Q1",
                    text: "The AI Workplace Assistant seems capable.",
                  },
                ],
              },
            ],
          },
        ],
        questionGroups: [
          {
            id: "group_1",
            items: [
              {
                id: "PRE_Q1",
                text: "The AI Workplace Assistant seems capable.",
              },
            ],
          },
        ],
        submitLabel: "Continue",
        accent: "emerald",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_4",
      variant: "A",
      index: 3,
      total: 7,
      ui: {
        kind: "content",
        screen: "content_pages",
        title: "Before You Continue",
        description: "System notice",
        instructions: [
          "Please read the following notice carefully before moving on.",
        ],
        pages: [
          {
            id: "error_notice",
            title: "System Notice",
            body: [
              "The AI Workplace Assistant has been newly introduced and may occasionally encounter issues during early use.",
            ],
          },
        ],
        submitLabel: "Continue",
        accent: "amber",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_5",
      variant: "default",
      index: 4,
      total: 7,
      ui: {
        kind: "video",
        screen: "video_player",
        title: "Video Task",
        description: "Watch the video.",
        introTitle: "Video instructions",
        instructions: [
          "The video can be played <strong>only once</strong>, and you can continue <strong>only after the video has finished</strong>.",
        ],
        videoUrl: "https://youtu.be/example",
        preCompletionSubmitLabel: "Continue after watching the full video",
        submitLabel: "Continue",
        transitionModal: {
          title: "Next step",
          description:
            "You will now continue to the actual AI Workplace Assistant.",
          confirmLabel: "Continue",
        },
        accent: "indigo",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_6",
      variant: "default",
      index: 5,
      total: 7,
      ui: {
        kind: "interactive",
        screen: "interactive_placeholder",
        title: "AI Workplace Assistant",
        description: "Interactive stage",
        instructions: [],
        chat: {
          headerTitle: "AI Workplace Assistant",
          headerStatus: "Conversation ready",
          composerPlaceholder: "Type a message...",
          messages: [
            {
              id: "m1",
              role: "ai",
              html: "<p>Hello.</p>",
            },
          ],
        },
        popupDelaySeconds: 0,
        popupByIv2: {
          B: {
            initialTitle: "Please share your feedback",
            initialBody: ["Feedback helps improve the assistant."],
          },
        },
        feedbackPrompt: {
          title: "User Feedback",
          body: ["Please share your feedback."],
          placeholder: "optional",
          submitLabel: "Submit / Next",
        },
        accent: "rust",
      },
    },
  },
  {
    ok: true,
    pipeline: "study_v1",
    prolificId: "p1",
    iv1: "A",
    iv2: "B",
    stage: {
      id: "stage_7",
      variant: "default",
      index: 6,
      total: 7,
      ui: {
        kind: "likert",
        screen: "likert_scale",
        title: "Questionnaire 3",
        description: "Post measures",
        instructions: ["Use the scale below."],
        introTitle: "How to answer",
        scale: {
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
        },
        display: {
          showProgressBar: true,
          groupsPerPage: 1,
          enableSmoothScroll: true,
        },
        questionSections: [
          {
            id: "section_1",
            title: "Post Failure Reactions",
            description: "Post-test section",
            groups: [
              {
                id: "group_1",
                items: [
                  {
                    id: "POST_Q1",
                    text: "I am satisfied with the AI Workplace Assistant.",
                  },
                  {
                    kind: "text",
                    id: "FEEDBACK_REASON",
                    text: "Please briefly explain why you chose to provide or not provide feedback earlier.",
                    optional: true,
                  },
                ],
              },
            ],
          },
        ],
        questionGroups: [
          {
            id: "group_1",
            items: [
              {
                id: "POST_Q1",
                text: "I am satisfied with the AI Workplace Assistant.",
              },
              {
                kind: "text",
                id: "FEEDBACK_REASON",
                text: "Please briefly explain why you chose to provide or not provide feedback earlier.",
                optional: true,
              },
            ],
          },
        ],
        submitLabel: "Submit",
        accent: "slate",
      },
    },
  },
];

async function mockSuccessfulStudyFlow(page: Page) {
  let currentStageIndex = 0;

  await page.route("**/api/init**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stagePayloads[currentStageIndex]),
    });
  });

  await page.route("**/api/submit", async (route) => {
    const isLastStage = currentStageIndex === stagePayloads.length - 1;

    const payload = isLastStage
      ? {
          ok: true,
          passed: true,
          completed: true,
          nextStageId: null,
          redirectUrl: "/prolific-complete",
          verdict: { kind: "mock-success" },
        }
      : {
          ok: true,
          passed: true,
          completed: false,
          nextStageId: stagePayloads[currentStageIndex + 1].stage.id,
          redirectUrl: null,
          verdict: { kind: "mock-success" },
        };

    if (!isLastStage) {
      currentStageIndex += 1;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

test("participant can complete the full study flow", async ({ page }) => {
  await mockSuccessfulStudyFlow(page);

  await page.goto("/?prolific_id=p1");
  await page.getByRole("button", { name: /I Agree/i }).click();

  await expect(page).toHaveURL(/\/study\/stage_1\?prolific_id=p1$/);
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page).toHaveURL(/\/study\/stage_2\?prolific_id=p1$/);
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page).toHaveURL(/\/study\/stage_3\?prolific_id=p1$/);
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page).toHaveURL(/\/study\/stage_4\?prolific_id=p1$/);
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page).toHaveURL(/\/study\/stage_5\?prolific_id=p1$/);
  await expect(
    page.getByText("Video playback finished", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Continue$/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Next step" })).toBeVisible();
  await page
    .getByRole("button", { name: /^Continue$/ })
    .last()
    .click();

  await expect(page).toHaveURL(/\/study\/stage_6\?prolific_id=p1$/);
  await page.getByRole("textbox").fill("Helpful feedback");
  await page.getByRole("button", { name: /Submit \/ Next/i }).click();

  await expect(page).toHaveURL(/\/study\/stage_7\?prolific_id=p1$/);
  await page.getByRole("button", { name: /Submit/i }).click();

  await expect(page.getByText("Study complete")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to Prolific", exact: true })
    .click();
  await expect(page).toHaveURL(/\/prolific-complete$/);
});

test("participant sees the failure modal and can return to Prolific on failed submission", async ({
  page,
}) => {
  await page.route("**/api/init**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stagePayloads[0]),
    });
  });

  await page.route("**/api/submit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        passed: false,
        completed: false,
        lockedOut: true,
        nextStageId: null,
        redirectUrl: "/prolific-fail",
        verdict: {
          kind: "attention_checks",
          results: [],
        },
      }),
    });
  });

  await page.goto("/?prolific_id=p1");
  await page.getByRole("button", { name: /I Agree/i }).click();
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page.getByText("Study Failed")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to Prolific", exact: true })
    .click();
  await expect(page).toHaveURL(/\/prolific-fail$/);
});

test("participant who declines consent is redirected to the no-consent return URL", async ({
  page,
}) => {
  await page.route("**/api/decline-url", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        redirectUrl: "/prolific-no-consent",
      }),
    });
  });

  await page.goto("/?prolific_id=p1");
  await page.getByRole("button", { name: /I Do Not Agree/i }).click();
  await expect(page).toHaveURL(/\/prolific-no-consent$/);
});
