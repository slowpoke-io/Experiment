import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PROLIFIC_SUBMISSION_BASE_URL =
  "https://app.prolific.com/submissions/complete";

type ProlificSettingsRow = {
  pipeline_code: string;
  complete_code: string;
  fail_code: string;
  noconsent_code: string;
  study_open: boolean;
};

export type ProlificSettingsUpdate = {
  pipelineCode: string;
  completeCode: string;
  failCode: string;
  noconsentCode: string;
  studyOpen: boolean;
};

export type ProlificSettings = {
  pipelineCode: string;
  completeCode: string;
  failCode: string;
  noconsentCode: string;
  studyOpen: boolean;
  completeUrl: string;
  failUrl: string;
  noconsentUrl: string;
};

function requireCode(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is empty`);
  }
  return normalized;
}

export function buildProlificRedirectUrl(code: string) {
  const url = new URL(PROLIFIC_SUBMISSION_BASE_URL);
  url.searchParams.set("cc", code);
  return url.toString();
}

export async function getProlificSettings(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProlificSettings> {
  const result = await supabase
    .from("prolific_settings")
    .select("pipeline_code, complete_code, fail_code, noconsent_code, study_open")
    .eq("id", 1)
    .single();

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    throw new Error("prolific_settings row 1 not found");
  }

  const row = result.data as ProlificSettingsRow;
  const pipelineCode = requireCode(row.pipeline_code, "pipeline_code");
  const completeCode = requireCode(row.complete_code, "complete_code");
  const failCode = requireCode(row.fail_code, "fail_code");
  const noconsentCode = requireCode(row.noconsent_code, "noconsent_code");

  return {
    pipelineCode,
    completeCode,
    failCode,
    noconsentCode,
    studyOpen: row.study_open,
    completeUrl: buildProlificRedirectUrl(completeCode),
    failUrl: buildProlificRedirectUrl(failCode),
    noconsentUrl: buildProlificRedirectUrl(noconsentCode),
  };
}

export async function updateProlificSettings(
  updates: ProlificSettingsUpdate,
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  const payload = {
    pipeline_code: requireCode(updates.pipelineCode, "pipeline_code"),
    complete_code: requireCode(updates.completeCode, "complete_code"),
    fail_code: requireCode(updates.failCode, "fail_code"),
    noconsent_code: requireCode(updates.noconsentCode, "noconsent_code"),
    study_open: updates.studyOpen,
  };

  const result = await supabase
    .from("prolific_settings")
    .update(payload)
    .eq("id", 1);

  if (result.error) {
    throw result.error;
  }

  return getProlificSettings(supabase);
}
