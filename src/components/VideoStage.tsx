import { useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";

import { StageInstructions } from "@/components/StageInstructions";
import { StageCard } from "@/components/StageCard";
import type { StageResponse, VideoStageUI } from "@/lib/types";

const ClientReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-200">
      Loading video player...
    </div>
  ),
});

type VideoStageProps = {
  data: StageResponse;
  ui: VideoStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

export function VideoStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: VideoStageProps) {
  const [hasEnded, setHasEnded] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    ui.continueDelaySeconds ?? 0,
  );
  const isYouTubeEmbed = useMemo(() => {
    return /(?:youtu\.be|youtube(?:-nocookie)?\.com)/i.test(ui.videoUrl);
  }, [ui.videoUrl]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  async function handleContinue() {
    if (!hasEnded || disabled || secondsRemaining > 0) {
      return;
    }

    if (ui.transitionModal) {
      setShowTransitionModal(true);
      return;
    }

    await onSubmit({ videoCompleted: true });
  }

  async function handleConfirmTransition() {
    const submitted = await onSubmit({ videoCompleted: true });
    if (!submitted) {
      setShowTransitionModal(false);
    }
  }

  return (
    <>
      <StageCard
        stageId={data.stage.id}
        stageIndex={data.stage.index}
        totalStages={data.stage.total}
        variant={data.stage.variant}
        iv1={data.iv1}
        iv2={data.iv2}
        ui={ui}
      >
        {ui.introTitle ? (
          <StageInstructions
            title={ui.introTitle}
            instructions={ui.instructions}
          />
        ) : null}

        <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950 shadow-sm">
          <div className="aspect-video">
            <ClientReactPlayer
              src={ui.videoUrl}
              controls={isYouTubeEmbed ? false : true}
              width="100%"
              height="100%"
              playing={false}
              playsInline
              config={
                isYouTubeEmbed
                  ? {
                      youtube: {
                        disablekb: 1,
                        // fs: 0,
                        // rel: 0,
                        // iv_load_policy: 3,
                        // cc_load_policy: 0,
                      },
                    }
                  : undefined
              }
              onEnded={() => setHasEnded(true)}
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="body-copy-compact">
              {hasEnded ? (
                <span className="font-semibold text-emerald-600">
                  Video playback finished. You may continue.
                </span>
              ) : (
                <span>{ui.completionMessage}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!hasEnded || disabled || secondsRemaining > 0}
              className="primary-button w-full sm:w-auto"
            >
              {disabled
                ? "Submitting..."
                : secondsRemaining > 0
                  ? `Continue in ${secondsRemaining}s`
                  : (ui.submitLabel ?? "Continue")}
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </StageCard>

      {showTransitionModal && ui.transitionModal ? (
        <div className="modal-backdrop">
          <div className="modal-card max-w-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {ui.transitionModal.title}
                </h2>
              </div>
              <p className="body-copy">{ui.transitionModal.description}</p>
            </div>
            <div className="flex justify-end">
              <button
                className="primary-button w-full sm:w-auto"
                type="button"
                onClick={() => void handleConfirmTransition()}
                disabled={disabled}
              >
                {disabled ? "Submitting..." : ui.transitionModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
