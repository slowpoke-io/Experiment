import { describe, expect, it } from "vitest";

import { submitHandler } from "@/pages/api/submit";
import {
  createMockReq,
  createMockRes,
  createSupabaseMock,
  expectQuery,
} from "./test-helpers";

const currentStage = {
  id: "stage_1",
  validator: {
    default: "test_validator",
  },
  params: {
    default: {
      test_validator: {
        checks: [{ key: "CHECK_1", expected: 2 }],
      },
    },
  },
};

const nextStage = {
  id: "stage_2",
  validator: {
    default: "test_validator",
  },
  params: {
    default: {},
  },
};

const baseProgress = {
  pipeline_code: "study_v1",
  prolific_id: "p1",
  iv1: "A",
  iv2: "B",
  current_stage_index: 0,
  completed: false,
  failed: false,
  stage_variants: { stage_1: "default" },
  started_at: "2026-05-02T00:00:00.000Z",
  updated_at: "2026-05-02T00:00:00.000Z",
};

const prolificSettings = {
  pipelineCode: "study_v1",
  studyOpen: true,
  completeUrl: "https://complete.test",
  failUrl: "https://fail.test",
  noconsentUrl: "https://noconsent.test",
};

function buildDeps(options: {
  supabase: ReturnType<typeof createSupabaseMock>;
  validatorResult?: { passed: boolean; verdict: Record<string, unknown> };
  participantStages?: Array<typeof currentStage>;
  stage?: typeof currentStage | null;
}) {
  return {
    getSupabaseAdmin: () => options.supabase.client as never,
    getProlificSettings: async () => prolificSettings,
    VALIDATORS: {
      test_validator: () =>
        options.validatorResult ?? {
          passed: true,
          verdict: { kind: "test_validator" },
        },
    },
    getParticipantStages: () =>
      (options.participantStages ?? [currentStage, nextStage]) as never,
    participantStageAt: () =>
      (options.stage === undefined ? currentStage : options.stage) as never,
    nowIso: () => "2026-05-02T00:10:00.000Z",
    PIPELINE: { code: "study_v1" } as never,
  };
}

describe("submitHandler", () => {
  it("records validator failures and locks the participant out", async () => {
    const supabase = createSupabaseMock((state) => {
      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "single"
      ) {
        return { data: baseProgress };
      }

      if (
        state.table === "submissions" &&
        state.action === "select" &&
        state.expect === "maybeSingle"
      ) {
        return { data: null };
      }

      if (state.table === "submissions" && state.action === "insert") {
        return {};
      }

      if (state.table === "progress" && state.action === "update") {
        return {};
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "POST",
      body: {
        prolificId: "p1",
        stageId: "stage_1",
        answers: { CHECK_1: 1 },
        meta: { stageSeconds: 12 },
      },
    });
    const res = createMockRes();

    const originalNow = Date.now;
    Date.now = () => new Date("2026-05-02T00:10:00.000Z").getTime();

    try {
      await submitHandler(
        req as never,
        res as never,
        buildDeps({
          supabase,
          validatorResult: {
            passed: false,
            verdict: { reason: "attention_checks" },
          },
        }),
      );
    } finally {
      Date.now = originalNow;
    }

    expect(res.body).toEqual({
      ok: true,
      passed: false,
      completed: false,
      lockedOut: true,
      nextStageId: null,
      redirectUrl: "https://fail.test",
      verdict: { reason: "attention_checks" },
    });

    const updateCall = expectQuery(
      supabase.calls,
      (state) => state.table === "progress" && state.action === "update",
    );
    expect(updateCall.payload).toEqual({
      failed: true,
      failed_stage_id: "stage_1",
      failed_reason: { reason: "attention_checks" },
      total_seconds: 600,
      updated_at: "2026-05-02T00:10:00.000Z",
    });
  });

  it("advances to the next stage on success", async () => {
    const supabase = createSupabaseMock((state) => {
      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "single"
      ) {
        return { data: baseProgress };
      }

      if (
        state.table === "submissions" &&
        state.action === "select" &&
        state.expect === "maybeSingle"
      ) {
        return { data: null };
      }

      if (state.table === "submissions" && state.action === "insert") {
        return {};
      }

      if (state.table === "progress" && state.action === "update") {
        return {};
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "POST",
      body: {
        prolificId: "p1",
        stageId: "stage_1",
        answers: { CHECK_1: 2 },
        meta: { stageSeconds: 25 },
      },
    });
    const res = createMockRes();

    const originalNow = Date.now;
    Date.now = () => new Date("2026-05-02T00:10:00.000Z").getTime();

    try {
      await submitHandler(req as never, res as never, buildDeps({ supabase }));
    } finally {
      Date.now = originalNow;
    }

    expect(res.body).toEqual({
      ok: true,
      passed: true,
      completed: false,
      nextStageId: "stage_2",
      redirectUrl: null,
      verdict: { kind: "test_validator" },
    });
  });

  it("returns Prolific completion redirect on the final successful stage", async () => {
    const supabase = createSupabaseMock((state) => {
      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "single"
      ) {
        return { data: baseProgress };
      }

      if (
        state.table === "submissions" &&
        state.action === "select" &&
        state.expect === "maybeSingle"
      ) {
        return { data: null };
      }

      if (state.table === "submissions" && state.action === "insert") {
        return {};
      }

      if (state.table === "progress" && state.action === "update") {
        return {};
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "POST",
      body: {
        prolificId: "p1",
        stageId: "stage_1",
        answers: { CHECK_1: 2 },
      },
    });
    const res = createMockRes();

    const originalNow = Date.now;
    Date.now = () => new Date("2026-05-02T00:10:00.000Z").getTime();

    try {
      await submitHandler(
        req as never,
        res as never,
        buildDeps({
          supabase,
          participantStages: [currentStage],
        }),
      );
    } finally {
      Date.now = originalNow;
    }

    expect(res.body).toEqual({
      ok: true,
      passed: true,
      completed: true,
      nextStageId: null,
      redirectUrl: "https://complete.test",
      verdict: { kind: "test_validator" },
    });
  });
});
