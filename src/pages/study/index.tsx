import { useEffect, useMemo, useState } from "react";

import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { AccessDeniedPanel } from "@/components/AccessDeniedPanel";
import { RedirectModal } from "@/components/RedirectModal";
import {
  PIPELINE,
  findStageById,
} from "@/lib/pipeline";
import {
  buildConsentPath,
  buildConsentSessionKey,
  buildSearchString,
  buildStudyStagePath,
  extractParticipantQuery,
} from "@/lib/participant-routing";
import type {
  ApiErrorResponse,
  FailedResponse,
  ParticipantApiResponse,
  StageResponse,
} from "@/lib/types";

type StudyEntryPageProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
};

type RedirectModalState = {
  open: boolean;
  title: string;
  description: string;
  buttonLabel: string;
  redirectUrl: string;
  tone: "success" | "warning";
};

function isStageResponse(
  payload: ParticipantApiResponse,
): payload is StageResponse {
  return "stage" in payload;
}

function isFailedResponse(
  payload: ParticipantApiResponse,
): payload is FailedResponse {
  return "failed" in payload && payload.failed;
}

function getApiErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return null;
}

function describeFailure(payload: FailedResponse) {
  const reason = payload.failed_reason;
  if (!reason) {
    return "The study could not continue under the quality-control rules for this session.";
  }

  if (reason.reason === "timeout") {
    return "This session timed out because it remained inactive beyond the allowed limit. Click the button below to return to Prolific.";
  }

  if (reason.kind === "attention_checks") {
    return "At least one required attention-check item was answered incorrectly. Click the button below to return to Prolific.";
  }

  return "This session did not meet the study requirements. Click the button below to return to Prolific.";
}

export const getServerSideProps: GetServerSideProps<StudyEntryPageProps> = async ({
  query,
}) => {
  const { prolificId, sharedQuery } = extractParticipantQuery(query);

  return {
    props: {
      prolificId,
      sharedQuery,
    },
  };
};

export default function StudyEntryPage({
  prolificId,
  sharedQuery,
}: StudyEntryPageProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<RedirectModalState>({
    open: false,
    title: "",
    description: "",
    buttonLabel: "",
    redirectUrl: "",
    tone: "success",
  });

  const searchString = useMemo(() => {
    return buildSearchString(prolificId, sharedQuery);
  }, [prolificId, sharedQuery]);

  useEffect(() => {
    let cancelled = false;

    async function resolveCurrentStage() {
      if (!prolificId) {
        setErrorMessage(null);
        return;
      }

      const consentKey = buildConsentSessionKey(prolificId, PIPELINE.code);
      const consentGranted = window.sessionStorage.getItem(consentKey) === "true";

      if (!consentGranted) {
        await router.replace(buildConsentPath(prolificId, sharedQuery));
        return;
      }

      try {
        const response = await fetch(`/api/init${searchString}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prolificId }),
        });

        const payload = (await response.json()) as
          | ParticipantApiResponse
          | ApiErrorResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error(
            getApiErrorMessage(payload) ?? "Unable to initialize the experiment.",
          );
        }

        if ("completed" in payload && payload.completed) {
          setModalState({
            open: true,
            title: "Study complete",
            description:
              "You have finished all study stages. Click the button below to return to Prolific and complete your submission.",
            buttonLabel: "Return to Prolific",
            redirectUrl: payload.redirectUrl,
            tone: "success",
          });
          return;
        }

        if (isFailedResponse(payload)) {
          setModalState({
            open: true,
            title: "Study ended early",
            description: describeFailure(payload),
            buttonLabel: "Return to Prolific",
            redirectUrl: payload.redirectUrl,
            tone: "warning",
          });
          return;
        }

        if (!isStageResponse(payload)) {
          throw new Error("Unexpected response shape returned by the API.");
        }

        if (!findStageById(payload.stage.id)) {
          throw new Error("The current stage could not be found in the pipeline.");
        }

        await router.replace(
          buildStudyStagePath(payload.stage.id, prolificId, sharedQuery),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unexpected initialization error.";
        setErrorMessage(message);
      }
    }

    void resolveCurrentStage();

    return () => {
      cancelled = true;
    };
  }, [prolificId, router, searchString, sharedQuery]);

  return (
    <>
      <Head>
        <title>Loading Study | Experiment Study</title>
        <meta
          name="description"
          content="Automatically routing the participant to the correct current study stage."
        />
      </Head>

      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        {!prolificId ? (
          <AccessDeniedPanel />
        ) : errorMessage ? (
          <div className="panel">
            <h2 className="text-2xl font-semibold text-slate-950">
              Study unavailable
            </h2>
            <p className="body-copy mt-3">{errorMessage}</p>
          </div>
        ) : (
          <div className="flex h-screen flex-col items-center justify-center gap-5">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-950" />
            <p className="text-lg font-semibold tracking-[0.02em] text-slate-900">
              Loading
            </p>
          </div>
        )}
      </div>

      <RedirectModal
        open={modalState.open}
        title={modalState.title}
        description={modalState.description}
        buttonLabel={modalState.buttonLabel}
        tone={modalState.tone}
        onConfirm={() => {
          window.location.href = modalState.redirectUrl;
        }}
      />
    </>
  );
}
