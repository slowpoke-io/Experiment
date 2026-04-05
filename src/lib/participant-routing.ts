import type { GetServerSidePropsContext } from "next";

type RawQuery = GetServerSidePropsContext["query"];

export type ParticipantQueryProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
};

export function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function extractParticipantQuery(query: RawQuery): ParticipantQueryProps {
  const prolificId = getSingleQueryValue(query.prolific_id)?.trim() ?? null;
  const sharedQuery = Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key !== "prolific_id" && key !== "stageId")
      .map(([key, value]) => [key, getSingleQueryValue(value)])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  return { prolificId, sharedQuery };
}

export function buildSearchString(
  prolificId: string | null,
  sharedQuery: Record<string, string>,
) {
  const params = new URLSearchParams(sharedQuery);
  if (prolificId) {
    params.set("prolific_id", prolificId);
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export function buildConsentPath(
  prolificId: string | null,
  sharedQuery: Record<string, string>,
) {
  return `/consent${buildSearchString(prolificId, sharedQuery)}`;
}

export function buildStudyPath(
  prolificId: string | null,
  sharedQuery: Record<string, string>,
) {
  return `/study${buildSearchString(prolificId, sharedQuery)}`;
}

export function buildStudyStagePath(
  stageId: string,
  prolificId: string | null,
  sharedQuery: Record<string, string>,
) {
  return `/study/${stageId}${buildSearchString(prolificId, sharedQuery)}`;
}

export function buildConsentSessionKey(prolificId: string, pipelineCode: string) {
  return `${pipelineCode}:consent:${prolificId}`;
}
