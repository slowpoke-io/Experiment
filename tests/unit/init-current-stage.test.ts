import { describe, expect, it } from "vitest";

import { currentStageHandler } from "@/pages/api/current-stage";
import { initHandler } from "@/pages/api/init";
import {
  createMockReq,
  createMockRes,
  createSupabaseMock,
  expectQuery,
} from "./test-helpers";

const sampleStage = {
  id: "stage_1",
  ui: { default: { title: "Stage 1" } },
};

const activeProgress = {
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

describe("initHandler", () => {
  it("creates a new participant and returns the first stage", async () => {
    let progressLookupCount = 0;
    const supabase = createSupabaseMock((state) => {
      if (state.table === "participants" && state.action === "upsert") {
        return {};
      }

      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "maybeSingle"
      ) {
        progressLookupCount += 1;
        return {
          data: progressLookupCount === 1 ? null : activeProgress,
        };
      }

      if (state.table === "progress" && state.action === "insert") {
        return {};
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "POST",
      body: { prolificId: "p1" },
      query: {},
    });
    const res = createMockRes();

    await initHandler(req as never, res as never, {
      cleanupAbandoned: async () => {},
      getSupabaseAdmin: () => supabase.client as never,
      getProlificSettings: async () => prolificSettings,
      assignIV: async () => ({ iv1: "A", iv2: "B" }),
      resolveAllVariants: async () => ({ stage_1: "default" }),
      participantStageAt: () => sampleStage as never,
      buildStageResponse: (progress, stage, variantId) => ({
        ok: true,
        pipeline: progress.pipeline_code,
        stageId: stage.id,
        variantId,
      }),
      nowIso: () => "2026-05-02T00:00:00.000Z",
      formatApiError: () => "unexpected",
      isUniqueViolation: () => false,
      PIPELINE: { code: "study_v1" } as never,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      pipeline: "study_v1",
      stageId: "stage_1",
      variantId: "default",
    });

    const insertCall = expectQuery(
      supabase.calls,
      (state) => state.table === "progress" && state.action === "insert",
    );
    expect(insertCall.payload).toEqual({
      pipeline_code: "study_v1",
      prolific_id: "p1",
      iv1: "A",
      iv2: "B",
      current_stage_index: 0,
      completed: false,
      failed: false,
      stage_variants: {},
      started_at: "2026-05-02T00:00:00.000Z",
      updated_at: "2026-05-02T00:00:00.000Z",
    });
  });

  it("rejects new participants when the study is closed", async () => {
    const supabase = createSupabaseMock((state) => {
      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "maybeSingle"
      ) {
        return { data: null };
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "POST",
      body: { prolificId: "p1" },
      query: {},
    });
    const res = createMockRes();

    await initHandler(req as never, res as never, {
      cleanupAbandoned: async () => {},
      getSupabaseAdmin: () => supabase.client as never,
      getProlificSettings: async () => ({
        ...prolificSettings,
        studyOpen: false,
      }),
      assignIV: async () => ({ iv1: "A", iv2: "B" }),
      resolveAllVariants: async () => ({ stage_1: "default" }),
      participantStageAt: () => sampleStage as never,
      buildStageResponse: (progress, stage, variantId) => ({
        ok: true,
        pipeline: progress.pipeline_code,
        stageId: stage.id,
        variantId,
      }),
      nowIso: () => "2026-05-02T00:00:00.000Z",
      formatApiError: () => "unexpected",
      isUniqueViolation: () => false,
      PIPELINE: { code: "study_v1" } as never,
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      message: "study is closed",
    });
  });
});

describe("currentStageHandler", () => {
  it("returns the current stage on success", async () => {
    const supabase = createSupabaseMock((state) => {
      if (
        state.table === "progress" &&
        state.action === "select" &&
        state.expect === "single"
      ) {
        return { data: activeProgress };
      }

      throw new Error(`Unexpected query: ${state.table}/${state.action}`);
    });

    const req = createMockReq({
      method: "GET",
      query: { prolificId: "p1" },
    });
    const res = createMockRes();

    await currentStageHandler(req as never, res as never, {
      getSupabaseAdmin: () => supabase.client as never,
      getProlificSettings: async () => prolificSettings,
      participantStageAt: () => sampleStage as never,
      buildStageResponse: (progress, stage, variantId) => ({
        ok: true,
        prolificId: progress.prolific_id,
        stageId: stage.id,
        variantId,
      }),
      PIPELINE: { code: "study_v1" } as never,
    });

    expect(res.body).toEqual({
      ok: true,
      prolificId: "p1",
      stageId: "stage_1",
      variantId: "default",
    });
  });
});
