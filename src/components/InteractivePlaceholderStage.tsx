import { useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { AIWorkplaceChat } from "@/components/AIWorkplaceChat";
import { StageInstructions } from "@/components/StageInstructions";
import type { InteractiveStageUI, StageResponse } from "@/lib/types";

type InteractivePlaceholderStageProps = {
  data: StageResponse;
  ui: InteractiveStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

function AssistantIcon() {
  return (
    <div className="flex h-13 w-13 items-center justify-center">
      <Image
        src="/chat-bot-header.webp"
        alt="AI assistant"
        className="h-13 w-13 object-contain"
        width={52}
        height={52}
        priority
      />
    </div>
  );
}

export function InteractivePlaceholderStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: InteractivePlaceholderStageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [submitDelayRemaining, setSubmitDelayRemaining] = useState(0);

  const popupCopy = useMemo(() => {
    return ui.popupByIv2[data.iv2] ?? Object.values(ui.popupByIv2)[0];
  }, [data.iv2, ui.popupByIv2]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSubmitDelayRemaining(ui.feedbackPrompt.submitDelaySeconds ?? 0);
      setModalOpen(true);
    }, ui.popupDelaySeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [ui.feedbackPrompt.submitDelaySeconds, ui.popupDelaySeconds]);

  useEffect(() => {
    if (!modalOpen || modalSubmitting || submitDelayRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSubmitDelayRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [modalOpen, modalSubmitting, submitDelayRemaining]);

  async function handleSubmitFeedback() {
    const trimmedFeedback = feedback.trim();
    const modalDecision = trimmedFeedback ? "yes" : "no";

    setModalSubmitting(true);
    const ok = await onSubmit({
      modalDecision,
      feedback: trimmedFeedback || null,
      triggeredByIv2: data.iv2,
    });

    if (!ok) {
      setModalSubmitting(false);
    }
  }

  return (
    <>
      <div className="relative h-svh w-full overflow-hidden">
        {ui.introTitle ? (
          <div className="absolute left-5 top-5 z-30 w-[min(42rem,calc(100%-2.5rem))]">
            <StageInstructions
              title={ui.introTitle}
              instructions={ui.instructions}
            />
          </div>
        ) : null}
        <AIWorkplaceChat chat={ui.chat} />

        {errorMessage ? (
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
            {errorMessage}
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 pointer-events-none">
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="modal-card pointer-events-auto relative">
            {modalSubmitting ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-5">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-950" />
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold tracking-[0.02em] text-slate-950">
                    Submitting
                  </p>
                  <p className="body-copy-compact">
                    {feedback.trim()
                      ? "Sending your feedback and moving to the next stage."
                      : "Recording your response and moving to the next stage."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <AssistantIcon />
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {popupCopy.initialTitle}
                    </h2>
                  </div>
                  <div className="body-copy space-y-3">
                    {popupCopy.initialBody.map((paragraph, index) => (
                      <div
                        key={`${popupCopy.initialTitle}-${index}`}
                        dangerouslySetInnerHTML={{ __html: paragraph }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-5 rounded-[1.75rem] border border-indigo-100 bg-white px-5 py-5 shadow-sm">
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {ui.feedbackPrompt.title}
                    </h2>
                    <div className="body-copy space-y-3">
                      {ui.feedbackPrompt.body.map((paragraph, index) => (
                        <div
                          key={`${ui.feedbackPrompt.title}-${index}`}
                          dangerouslySetInnerHTML={{ __html: paragraph }}
                        />
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="block min-h-48 w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-indigo-200/70"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder={ui.feedbackPrompt.placeholder}
                    disabled={disabled || modalSubmitting}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSubmitFeedback()}
                      disabled={
                        disabled || modalSubmitting || submitDelayRemaining > 0
                      }
                      className="primary-button w-full sm:w-auto"
                    >
                      {modalSubmitting || disabled
                        ? "Submitting..."
                        : submitDelayRemaining > 0
                          ? `${ui.feedbackPrompt.submitLabel} in ${submitDelayRemaining}s`
                          : ui.feedbackPrompt.submitLabel}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
