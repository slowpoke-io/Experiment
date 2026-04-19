import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { AccessDeniedPanel } from "@/components/AccessDeniedPanel";
import { PassControl } from "@/components/PassControl";
import { RedirectModal } from "@/components/RedirectModal";
import { StageRenderer } from "@/components/StageRenderer";
import {
  buildFailureModalDescription,
  buildFailureModalNote,
} from "@/lib/failure-copy";
import {
  buildSearchString,
  buildConsentPath,
  buildConsentSessionKey,
  buildStudyStagePath,
  extractParticipantQuery,
} from "@/lib/participant-routing";
import {
  PIPELINE,
  STAGES,
  findStageById,
  getParticipantStages,
} from "@/lib/pipeline";
import type {
  ApiErrorResponse,
  ExperimentState,
  FailedResponse,
  ParticipantApiResponse,
  StageResponse,
  SubmitResponse,
} from "@/lib/types";

type StudyStagePageProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
  requestedStageId: string | null;
};

type RedirectModalState = {
  open: boolean;
  title: string;
  description: string;
  note?: string;
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

export const getServerSideProps: GetServerSideProps<
  StudyStagePageProps
> = async ({ params, query }) => {
  const { prolificId, sharedQuery } = extractParticipantQuery(query);
  const requestedStageId =
    typeof params?.stageId === "string" ? params.stageId : null;

  return {
    props: {
      prolificId,
      sharedQuery,
      requestedStageId,
    },
  };
};

export default function StudyStagePage({
  prolificId,
  sharedQuery,
  requestedStageId,
}: StudyStagePageProps) {
  const router = useRouter();
  const [experimentState, setExperimentState] = useState<ExperimentState>(
    prolificId && requestedStageId ? "idle" : "error",
  );
  const [stageData, setStageData] = useState<StageResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modalState, setModalState] = useState<RedirectModalState>({
    open: false,
    title: "",
    description: "",
    note: undefined,
    buttonLabel: "",
    redirectUrl: "",
    tone: "success",
  });
  const stageStartRef = useRef<number | null>(null);
  const showPassControl = process.env.NODE_ENV !== "production";

  const searchString = useMemo(() => {
    return buildSearchString(prolificId, sharedQuery);
  }, [prolificId, sharedQuery]);

  const availableStages = useMemo(() => {
    const stages = stageData
      ? getParticipantStages({ iv1: stageData.iv1, iv2: stageData.iv2 })
      : STAGES;

    return stages.map((stage) => ({
      id: stage.id,
      title: stage.ui.default?.title ?? stage.id,
    }));
  }, [stageData]);

  const stageExists = requestedStageId
    ? Boolean(findStageById(requestedStageId))
    : false;
  const isInteractiveStage = stageData?.stage.ui?.kind === "interactive";

  const openRedirectModal = useCallback((state: RedirectModalState) => {
    setExperimentState(state.tone === "success" ? "completed" : "failed");
    setModalState(state);
  }, []);

  const redirectToConsent = useCallback(async () => {
    await router.replace(buildConsentPath(prolificId, sharedQuery));
  }, [prolificId, router, sharedQuery]);

  const handleParticipantResponse = useCallback(
    async (payload: ParticipantApiResponse) => {
      if ("completed" in payload && payload.completed) {
        openRedirectModal({
          open: true,
          title: "Study complete",
          description:
            "You have finished all study stages. Click the button below to return to Prolific and complete your submission.",
          note: undefined,
          buttonLabel: "Return to Prolific",
          redirectUrl: payload.redirectUrl,
          tone: "success",
        });
        return;
      }

      if (isFailedResponse(payload)) {
        openRedirectModal({
          open: true,
          title: "Study Failed",
          description: buildFailureModalDescription(),
          note: buildFailureModalNote(payload.failed_reason),
          buttonLabel: "Return to Prolific",
          redirectUrl: payload.redirectUrl,
          tone: "warning",
        });
        return;
      }

      if (!isStageResponse(payload)) {
        setExperimentState("error");
        setErrorMessage("Unexpected response shape returned by the API.");
        return;
      }

      if (requestedStageId && payload.stage.id !== requestedStageId) {
        await router.replace(
          buildStudyStagePath(payload.stage.id, prolificId, sharedQuery),
        );
        return;
      }

      setStageData(payload);
      setExperimentState("ready");
      setErrorMessage(null);
      stageStartRef.current = Date.now();
    },
    [openRedirectModal, prolificId, requestedStageId, router, sharedQuery],
  );

  useEffect(() => {
    if (!prolificId) {
      setExperimentState("error");
      setErrorMessage(null);
      return;
    }

    const consentKey = buildConsentSessionKey(prolificId, PIPELINE.code);
    const consentGranted = window.sessionStorage.getItem(consentKey) === "true";

    if (!consentGranted) {
      void redirectToConsent();
      return;
    }

    setConsentChecked(true);
  }, [prolificId, redirectToConsent]);

  useEffect(() => {
    let cancelled = false;

    async function initializeStage() {
      if (!consentChecked || !prolificId || !requestedStageId) {
        return;
      }

      setExperimentState("loading");
      setErrorMessage(null);

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
            getApiErrorMessage(payload) ??
              "Unable to initialize the experiment.",
          );
        }

        await handleParticipantResponse(payload);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unexpected initialization error.";
        setExperimentState("error");
        setErrorMessage(message);
      }
    }

    void initializeStage();

    return () => {
      cancelled = true;
    };
  }, [
    consentChecked,
    handleParticipantResponse,
    prolificId,
    requestedStageId,
    searchString,
  ]);

  async function handleSubmit(answers: Record<string, unknown>) {
    if (!prolificId || !stageData) {
      return false;
    }

    setExperimentState("submitting");
    setErrorMessage(null);

    try {
      const stageSeconds = stageStartRef.current
        ? Math.round((Date.now() - stageStartRef.current) / 1000)
        : undefined;

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prolificId,
          stageId: stageData.stage.id,
          answers,
          meta: { stageSeconds },
        }),
      });

      const payload = (await response.json()) as
        | SubmitResponse
        | ApiErrorResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          getApiErrorMessage(payload) ?? "Unable to submit answers.",
        );
      }

      if (!payload.passed && payload.redirectUrl) {
        openRedirectModal({
          open: true,
          title: "Study Failed",
          description: buildFailureModalDescription(),
          note: buildFailureModalNote(payload.verdict),
          buttonLabel: "Return to Prolific",
          redirectUrl: payload.redirectUrl,
          tone: "warning",
        });
        return true;
      }

      if (payload.completed && payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
        return true;
      }

      if (payload.nextStageId) {
        setExperimentState("loading");
        await router.push(
          buildStudyStagePath(payload.nextStageId, prolificId, sharedQuery),
        );
        return true;
      }

      setExperimentState("ready");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected submission error.";
      setExperimentState("ready");
      setErrorMessage(message);
      return false;
    }
  }

  return (
    <>
      <Head>
        <title>
          {requestedStageId
            ? `${requestedStageId} | Experiment Study`
            : "Experiment Study"}
        </title>
        <meta
          name="description"
          content="Stage-based experiment flow with informed consent and reusable Likert pages."
        />
      </Head>

      <div
        className={
          isInteractiveStage
            ? "relative flex min-h-svh w-full flex-col"
            : "mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10"
        }
      >
        {showPassControl && prolificId && requestedStageId ? (
          <PassControl
            prolificId={prolificId}
            sharedQuery={sharedQuery}
            currentStageId={requestedStageId}
            stages={availableStages}
          />
        ) : null}

        {!requestedStageId || !stageExists ? (
          <div className="panel">
            <h2 className="text-2xl font-semibold text-slate-950">
              Unknown stage
            </h2>
            <p className="body-copy mt-3">
              The requested stage route does not exist in the current pipeline
              configuration.
            </p>
          </div>
        ) : null}

        {requestedStageId && stageExists ? (
          <>
            {!prolificId ? <AccessDeniedPanel /> : null}

            {prolificId &&
            (!consentChecked || experimentState === "loading") ? (
              <div className="flex h-screen flex-col items-center justify-center gap-5">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-950" />
                <p className="text-lg font-semibold tracking-[0.02em] text-slate-900">
                  Loading
                </p>
              </div>
            ) : null}

            {prolificId && experimentState === "error" ? (
              <div className="panel">
                <h2 className="text-2xl font-semibold text-slate-950">
                  Stage unavailable
                </h2>
                <p className="body-copy mt-3">
                  {errorMessage ??
                    "The current stage could not be loaded for this participant."}
                </p>
              </div>
            ) : null}

            {prolificId &&
            stageData &&
            experimentState !== "error" &&
            experimentState !== "loading" ? (
              <StageRenderer
                data={stageData}
                disabled={experimentState === "submitting"}
                errorMessage={errorMessage}
                onSubmit={handleSubmit}
              />
            ) : null}
          </>
        ) : null}
      </div>

      <RedirectModal
        open={modalState.open}
        title={modalState.title}
        description={modalState.description}
        note={modalState.note}
        buttonLabel={modalState.buttonLabel}
        tone={modalState.tone}
        onConfirm={() => {
          window.location.href = modalState.redirectUrl;
        }}
      />
    </>
  );
}
