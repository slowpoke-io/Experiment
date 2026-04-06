import { useState } from "react";

import { StageInstructions } from "@/components/StageInstructions";
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
  const [currentPage, setCurrentPage] = useState(0);
  const page = ui.pages[currentPage];
  const totalPages = ui.pages.length;

  async function handleNext() {
    if (currentPage < totalPages - 1) {
      setCurrentPage((previous) => previous + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await onSubmit({
      acknowledged: true,
      viewedPageIds: ui.pages.map((item) => item.id),
    });
  }

  function handlePrevious() {
    if (currentPage === 0) {
      return;
    }

    setCurrentPage((previous) => previous - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <StageInstructions title={ui.introTitle} instructions={ui.instructions} />
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
              className={[
                "eyebrow shrink-0",
                page.eyebrowClassName ?? "",
              ].join(" ")}
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
        <div className={["body-copy space-y-3.5", page.bodyClassName ?? ""].join(" ")}>
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

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
            Continue after reading the current page.
          </div>

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={disabled}
            className="primary-button w-full sm:w-auto"
          >
            {disabled
              ? "Submitting..."
              : currentPage === totalPages - 1
                ? ui.submitLabel ?? "Continue"
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
