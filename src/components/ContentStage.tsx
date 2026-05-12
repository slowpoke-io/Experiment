import { useEffect, useState } from "react";

import { StageInstructions } from "@/components/StageInstructions";
import { testModeDelaySeconds } from "@/lib/test-mode";
import { StageCard } from "@/components/StageCard";
import type { ContentStageUI, StageResponse } from "@/lib/types";

type ContentStageProps = {
  data: StageResponse;
  ui: ContentStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

export function ContentStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: ContentStageProps) {
  function getInitialRevealCount(pageIndex: number) {
    const targetPage = ui.pages[pageIndex];
    return targetPage?.progressiveReveal ? 0 : (targetPage?.body.length ?? 0);
  }

  const [currentPage, setCurrentPage] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    testModeDelaySeconds(ui.continueDelaySeconds),
  );
  const [revealedParagraphCount, setRevealedParagraphCount] = useState(
    getInitialRevealCount(0),
  );
  const page = ui.pages[currentPage];
  const totalPages = ui.pages.length;
  const allParagraphsRevealed =
    revealedParagraphCount >= (page?.body.length ?? 0);
  const nextLockedByProgressiveReveal =
    Boolean(page?.progressiveReveal) && !allParagraphsRevealed;

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

  async function handleNext() {
    if (currentPage < totalPages - 1) {
      setSecondsRemaining(testModeDelaySeconds(ui.continueDelaySeconds));
      setCurrentPage((previous) => previous + 1);
      setRevealedParagraphCount(getInitialRevealCount(currentPage + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await onSubmit({
      responses: {
        acknowledged: true,
        viewedPageIds: ui.pages.map((item) => item.id),
      },
    });
  }

  function handlePrevious() {
    if (currentPage === 0) {
      return;
    }

    setSecondsRemaining(testModeDelaySeconds(ui.continueDelaySeconds));
    setCurrentPage((previous) => previous - 1);
    setRevealedParagraphCount(getInitialRevealCount(currentPage - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRevealNextParagraph() {
    if (!page?.progressiveReveal || allParagraphsRevealed) {
      return;
    }

    setRevealedParagraphCount((previous) =>
      Math.min(previous + 1, page.body.length),
    );
  }

  return (
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

      <div
        className={[
          "space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm",
          page.className ?? "",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-start justify-between gap-4",
            page.headerClassName ?? "",
          ].join(" ")}
        >
          <h3
            className={[
              "text-2xl font-semibold tracking-tight text-slate-950",
              page.titleClassName ?? "",
            ].join(" ")}
          >
            {page.title}
          </h3>
          {page.eyebrow ? (
            <span
              className={["eyebrow shrink-0", page.eyebrowClassName ?? ""].join(
                " ",
              )}
            >
              {page.eyebrow}
            </span>
          ) : totalPages > 1 ? (
            <span className="eyebrow shrink-0">
              Page {currentPage + 1} of {totalPages}
            </span>
          ) : null}
        </div>
        {totalPages > 1 ? (
          <div className="text-right text-sm font-medium text-slate-500">
            {currentPage + 1} / {totalPages}
          </div>
        ) : null}
        <div
          className={["body-copy space-y-3.5", page.bodyClassName ?? ""].join(
            " ",
          )}
        >
          {page.body
            .slice(0, page.progressiveReveal ? revealedParagraphCount : page.body.length)
            .map((paragraph, index) => (
            <div
              key={`${page.id}-body-${index}`}
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
            ))}
          {page.progressiveReveal && !allParagraphsRevealed ? (
            <button
              type="button"
              onClick={handleRevealNextParagraph}
              disabled={disabled}
              className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Click to see the next message
            </button>
          ) : null}
        </div>
      </div>

      {page.footerInstructions?.length ? (
        <StageInstructions
          title="Before you continue"
          instructions={page.footerInstructions}
        />
      ) : null}

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 0 || disabled}
            className="secondary-button w-full sm:w-auto"
          >
            ← {ui.previousLabel ?? "Previous"}
          </button>

          <div className="text-center text-sm text-slate-600">
            {nextLockedByProgressiveReveal
              ? "Reveal each point on this page before continuing."
              : "Continue after reading the current page."}
          </div>

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={
              disabled || secondsRemaining > 0 || nextLockedByProgressiveReveal
            }
            className="primary-button w-full sm:w-auto"
          >
            {disabled
              ? "Submitting..."
              : nextLockedByProgressiveReveal
                ? "Reveal all points to continue"
              : secondsRemaining > 0
                ? `Continue in ${secondsRemaining}s`
                : currentPage === totalPages - 1
                  ? (ui.submitLabel ?? "Continue")
                  : `${ui.nextLabel ?? "Next page"} →`}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </StageCard>
  );
}
