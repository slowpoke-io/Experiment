import crypto from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ABANDON_TIMEOUT_MINUTES,
  getParticipantStages,
  PIPELINE,
  nowIso,
} from "@/lib/pipeline";
import type {
  AssignmentMode,
  JsonObject,
  ProgressRecord,
  StageDefinition,
} from "@/lib/types";

type QueryValue = string | string[] | undefined;

type StratifyBy =
  | { column: "iv1" | "iv2"; value: string | undefined }
  | { stageVariant: string; value: string | undefined }
  | null;

function normalize(value: QueryValue) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function findRequestedAssignmentValue(
  query: Record<string, QueryValue>,
  key: "iv1" | "iv2",
  allowedValues: string[],
) {
  const requestedValue = normalize(query[key]);
  if (!requestedValue) {
    return null;
  }

  const matchedValue =
    allowedValues.find((candidate) => normalize(candidate) === requestedValue) ??
    null;

  if (!matchedValue) {
    throw new Error(
      `Invalid ${key} override: ${String(
        Array.isArray(query[key]) ? query[key][0] : query[key],
      )}`,
    );
  }

  return matchedValue;
}

function randomPick<T>(values: T[]) {
  return values[crypto.randomInt(0, values.length)];
}

function getLeastFrequent(counts: Record<string, number>) {
  const minimum = Math.min(...Object.values(counts));
  return Object.keys(counts).filter((key) => counts[key] === minimum);
}

function buildIvCellKey(iv1: string, iv2: string) {
  return `${iv1}::${iv2}`;
}

async function pickBalancedValue(
  column: "iv1" | "iv2",
  mode: AssignmentMode,
  values: string[],
) {
  if (mode !== "balanced") {
    return randomPick(values);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("progress")
    .select(column)
    .eq("pipeline_code", PIPELINE.code)
    .eq("failed", false);

  if (error) {
    throw error;
  }

  const counts = Object.fromEntries(values.map((value) => [value, 0]));

  for (const row of data ?? []) {
    const assignedValue = (row as Record<string, unknown>)[column];
    if (typeof assignedValue === "string" && assignedValue in counts) {
      counts[assignedValue] += 1;
    }
  }

  return randomPick(getLeastFrequent(counts));
}

async function pickBalancedIvPair(iv1Values: string[], iv2Values: string[]) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("progress")
    .select("iv1, iv2")
    .eq("pipeline_code", PIPELINE.code)
    .eq("failed", false);

  if (error) {
    throw error;
  }

  const counts = Object.fromEntries(
    iv1Values.flatMap((iv1) =>
      iv2Values.map((iv2) => [buildIvCellKey(iv1, iv2), 0] as const),
    ),
  );

  for (const row of data ?? []) {
    if (typeof row.iv1 !== "string" || typeof row.iv2 !== "string") {
      continue;
    }

    const key = buildIvCellKey(row.iv1, row.iv2);
    if (key in counts) {
      counts[key] += 1;
    }
  }

  const selectedKey = randomPick(getLeastFrequent(counts));
  const [iv1, iv2] = selectedKey.split("::");

  if (!iv1 || !iv2) {
    throw new Error("Unable to determine balanced IV assignment");
  }

  return { iv1, iv2 };
}

export async function cleanupAbandoned() {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - ABANDON_TIMEOUT_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("progress")
    .select("pipeline_code, prolific_id, started_at")
    .eq("pipeline_code", PIPELINE.code)
    .eq("completed", false)
    .eq("failed", false)
    .lt("updated_at", cutoff);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const startedAt =
      typeof row.started_at === "string" ? new Date(row.started_at) : null;
    const totalSeconds =
      startedAt && !Number.isNaN(startedAt.getTime())
        ? Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000))
        : null;

    const { error: updateError } = await supabase
      .from("progress")
      .update({
        failed: true,
        failed_reason: {
          reason: "timeout",
          cutoff_minutes: ABANDON_TIMEOUT_MINUTES,
          ...(totalSeconds !== null ? { total_seconds: totalSeconds } : {}),
        },
        ...(totalSeconds !== null ? { total_seconds: totalSeconds } : {}),
        updated_at: nowIso(),
      })
      .eq("pipeline_code", row.pipeline_code)
      .eq("prolific_id", row.prolific_id);

    if (updateError) {
      throw updateError;
    }
  }
}

export async function balancedPick(
  stageId: string,
  variants: string[],
  stratifyBy: StratifyBy = null,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("progress")
    .select("stage_variants, iv1, iv2")
    .eq("pipeline_code", PIPELINE.code)
    .eq("failed", false);

  if (error) {
    throw error;
  }

  const counts = Object.fromEntries(variants.map((variant) => [variant, 0]));

  for (const row of data ?? []) {
    if (stratifyBy) {
      const actual = "column" in stratifyBy
        ? row[stratifyBy.column]
        : row.stage_variants?.[stratifyBy.stageVariant];

      if (actual !== stratifyBy.value) {
        continue;
      }
    }

    const variant = row.stage_variants?.[stageId];
    if (typeof variant === "string" && variant in counts) {
      counts[variant] += 1;
    }
  }

  return randomPick(getLeastFrequent(counts));
}

export async function assignIV(query: Record<string, QueryValue> = {}) {
  const requestedIv1 = findRequestedAssignmentValue(
    query,
    "iv1",
    PIPELINE.assign.iv1.values,
  );
  const requestedIv2 = findRequestedAssignmentValue(
    query,
    "iv2",
    PIPELINE.assign.iv2.values,
  );

  if (requestedIv1 && requestedIv2) {
    return { iv1: requestedIv1, iv2: requestedIv2 };
  }

  if (
    PIPELINE.assign.iv1.mode === "balanced" &&
    PIPELINE.assign.iv2.mode === "balanced"
  ) {
    const pickedPair = await pickBalancedIvPair(
      PIPELINE.assign.iv1.values,
      PIPELINE.assign.iv2.values,
    );

    return {
      iv1: requestedIv1 ?? pickedPair.iv1,
      iv2: requestedIv2 ?? pickedPair.iv2,
    };
  }

  const [iv1, iv2] = await Promise.all([
    requestedIv1
      ? Promise.resolve(requestedIv1)
      : pickBalancedValue(
          "iv1",
          PIPELINE.assign.iv1.mode,
          PIPELINE.assign.iv1.values,
        ),
    requestedIv2
      ? Promise.resolve(requestedIv2)
      : pickBalancedValue(
          "iv2",
          PIPELINE.assign.iv2.mode,
          PIPELINE.assign.iv2.values,
        ),
  ]);

  return { iv1, iv2 };
}

async function pickVariant(
  stage: StageDefinition,
  query: Record<string, QueryValue>,
  stratifyBy: StratifyBy,
  progress: Partial<ProgressRecord>,
) {
  const { variant } = stage;
  const allVariants = variant.value;
  let variantId: string | null = null;

  if (variant.queryKey) {
    const requestedVariant = normalize(query[variant.queryKey]);
    if (requestedVariant) {
      variantId =
        allVariants.find((candidate) => normalize(candidate) === requestedVariant) ??
        null;
    }
  }

  if (variantId) {
    return variantId;
  }

  if (variant.directFrom) {
    const sourceValue = progress[variant.directFrom];
    if (typeof sourceValue === "string" && allVariants.includes(sourceValue)) {
      return sourceValue;
    }

    throw new Error(
      `direct variant source ${variant.directFrom} is not available for ${stage.id}`,
    );
  }

  if (variant.mode === "random") {
    return randomPick(allVariants);
  }

  if (variant.mode === "balanced") {
    return balancedPick(stage.id, allVariants, stratifyBy);
  }

  throw new Error(`Unknown variant mode: ${variant.mode}`);
}

export async function resolveAllVariants(
  prolificId: string,
  existingVariants: Record<string, string> = {},
  query: Record<string, QueryValue> = {},
  progress: Partial<ProgressRecord> = {},
) {
  const supabase = getSupabaseAdmin();
  const stageVariants = { ...existingVariants };

  for (const stage of getParticipantStages(progress)) {
    if (stageVariants[stage.id]) {
      if (
        stage.variant.directFrom &&
        !stage.variant.value.includes(stageVariants[stage.id])
      ) {
        const sourceValue = progress[stage.variant.directFrom];

        if (
          typeof sourceValue === "string" &&
          stage.variant.value.includes(sourceValue)
        ) {
          stageVariants[stage.id] = sourceValue;
        }
      }

      continue;
    }

    const stratifyConfig = stage.variant.stratifyBy ?? null;
    let stratifyBy: StratifyBy = null;

    if (stratifyConfig) {
      if ("column" in stratifyConfig) {
        stratifyBy = {
          column: stratifyConfig.column,
          value: progress[stratifyConfig.column],
        };
      } else {
        stratifyBy = {
          stageVariant: stratifyConfig.stageVariant,
          value: stageVariants[stratifyConfig.stageVariant],
        };
      }
    }

    stageVariants[stage.id] = await pickVariant(
      stage,
      query,
      stratifyBy,
      progress,
    );
  }

  const { error } = await supabase
    .from("progress")
    .update({
      stage_variants: stageVariants,
      updated_at: nowIso(),
    } satisfies JsonObject)
    .eq("pipeline_code", PIPELINE.code)
    .eq("prolific_id", prolificId);

  if (error) {
    throw error;
  }

  return stageVariants;
}
