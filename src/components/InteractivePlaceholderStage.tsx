import { useEffect, useMemo, useState } from "react";

import { StageCard } from "@/components/StageCard";
import type { InteractiveStageUI, StageResponse } from "@/lib/types";

type InteractivePlaceholderStageProps = {
  data: StageResponse;
  ui: InteractiveStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

export function InteractivePlaceholderStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: InteractivePlaceholderStageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState<"no" | "yes" | null>(
    null,
  );

  const popupCopy = useMemo(() => {
    return ui.popupByIv2[data.iv2] ?? Object.values(ui.popupByIv2)[0];
  }, [data.iv2, ui.popupByIv2]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setModalOpen(true);
    }, ui.popupDelaySeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [ui.popupDelaySeconds]);

  async function handleNo() {
    setModalSubmitting("no");
    const ok = await onSubmit({
      modalDecision: "no",
      feedback: null,
      triggeredByIv2: data.iv2,
    });

    if (!ok) {
      setModalSubmitting(null);
    }
  }

  async function handleYesSubmit() {
    if (!feedback.trim()) {
      return;
    }

    setModalSubmitting("yes");
    const ok = await onSubmit({
      modalDecision: "yes",
      feedback: feedback.trim(),
      triggeredByIv2: data.iv2,
    });

    if (!ok) {
      setModalSubmitting(null);
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
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-xl font-semibold text-slate-950">
            {ui.introTitle}
          </h3>
          <div className="body-copy mt-4 space-y-3">
            {ui.instructions.map((instruction) => (
              <p key={instruction}>{instruction}</p>
            ))}
          </div>
        </div>
      ) : null}

        <div className="space-y-4 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-7 shadow-sm">
          <span className="eyebrow">Placeholder</span>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            {ui.placeholderTitle}
          </h3>
          <div className="body-copy space-y-3.5">
            {ui.placeholderBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {ui.placeholderHint ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {ui.placeholderHint}
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </StageCard>

      {modalOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            {modalSubmitting ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-5">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-950" />
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold tracking-[0.02em] text-slate-950">
                    Submitting
                  </p>
                  <p className="body-copy-compact">
                    {modalSubmitting === "yes"
                      ? "Sending your feedback and moving to the next stage."
                      : "Recording your response and moving to the next stage."}
                  </p>
                </div>
              </div>
            ) : !feedbackMode ? (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {popupCopy.initialTitle}
                </h2>
                <div className="body-copy space-y-3">
                  {popupCopy.initialBody.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleNo()}
                    disabled={disabled || modalSubmitting !== null}
                    className="secondary-button w-full sm:w-auto"
                  >
                    {modalSubmitting === "no" ? "Submitting..." : popupCopy.noLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackMode(true)}
                    disabled={disabled || modalSubmitting !== null}
                    className="primary-button w-full sm:w-auto"
                  >
                    {popupCopy.yesLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {popupCopy.feedbackTitle}
                  </h2>
                  <div className="body-copy space-y-3">
                    {popupCopy.feedbackBody.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                <textarea
                  className="block min-h-32 w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder={popupCopy.feedbackPlaceholder}
                  disabled={disabled || modalSubmitting !== null}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleYesSubmit()}
                    disabled={!feedback.trim() || disabled || modalSubmitting !== null}
                    className="primary-button w-full sm:w-auto"
                  >
                    {modalSubmitting === "yes" || disabled
                      ? "Submitting..."
                      : popupCopy.feedbackSubmitLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
