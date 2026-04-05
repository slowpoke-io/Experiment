import { useMemo, useState } from "react";

import { StageCard } from "@/components/StageCard";
import type {
  ChoiceQuestion,
  LikertQuestion,
  LikertStageUI,
  StageResponse,
  SurveyQuestion,
} from "@/lib/types";

type LikertSurveyStageProps = {
  data: StageResponse;
  ui: LikertStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

type FlattenedQuestion = SurveyQuestion & {
  groupId: string;
  groupTitle?: string;
};

function flattenQuestions(ui: LikertStageUI): FlattenedQuestion[] {
  return ui.questionGroups.flatMap((group) =>
    group.items.map((question) => ({
      ...question,
      groupId: group.id,
      groupTitle: group.title,
    })),
  );
}

type LikertItemProps = {
  question: FlattenedQuestion & LikertQuestion;
  value: number | undefined;
  questionNumber: number;
  scaleValues: number[];
  scaleLabels: LikertStageUI["scale"]["labels"];
  onChange: (questionId: string, value: number) => void;
};

function LikertItem({
  question,
  value,
  questionNumber,
  scaleValues,
  scaleLabels,
  onChange,
}: LikertItemProps) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
          {questionNumber}
        </span>
        <div className="space-y-2">
          <p className="text-[15px] font-medium leading-7 tracking-[0.01em] text-slate-900 md:text-base">
            {question.text}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>{scaleLabels[scaleValues[0]]}</span>
          <span>{scaleLabels[scaleValues[scaleValues.length - 1]]}</span>
        </div>
        <div
          className="grid gap-1.5 md:gap-2"
          style={{
            gridTemplateColumns: `repeat(${scaleValues.length}, minmax(0, 1fr))`,
          }}
        >
          {scaleValues.map((scaleValue) => {
            const selected = value === scaleValue;
            return (
              <button
                key={scaleValue}
                type="button"
                onClick={() => onChange(question.id, scaleValue)}
                className={[
                  "rounded-xl border px-1 py-3 transition-all hover:bg-slate-50",
                  selected
                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white",
                ].join(" ")}
                aria-pressed={selected}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={[
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      selected ? "border-indigo-600" : "border-slate-300",
                    ].join(" ")}
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    ) : null}
                  </span>
                  <span
                    className={[
                      "text-sm font-semibold",
                      selected ? "text-indigo-700" : "text-slate-700",
                    ].join(" ")}
                  >
                    {scaleValue}
                  </span>
                  <span className="hidden text-[11px] leading-tight text-slate-500 lg:block">
                    {scaleLabels[scaleValue]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ChoiceItemProps = {
  question: FlattenedQuestion & ChoiceQuestion;
  value: string | undefined;
  questionNumber: number;
  onChange: (questionId: string, value: string) => void;
};

function ChoiceItem({
  question,
  value,
  questionNumber,
  onChange,
}: ChoiceItemProps) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
          {questionNumber}
        </span>
        <div className="space-y-2">
          <p className="text-[15px] font-medium leading-6 tracking-[0.01em] text-slate-900 md:text-base">
            {question.text}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {question.options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(question.id, option.value)}
              className={[
                "w-full rounded-[1.5rem] border px-5 py-4 text-left transition-all",
                selected
                  ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
              ].join(" ")}
              aria-pressed={selected}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-indigo-600" : "border-slate-300",
                  ].join(" ")}
                >
                  {selected ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  ) : null}
                </span>
                <div
                  className="text-sm font-semibold text-slate-900"
                  dangerouslySetInnerHTML={{ __html: option.label }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isChoiceQuestion(
  question: FlattenedQuestion,
): question is FlattenedQuestion & ChoiceQuestion {
  return "options" in question && Array.isArray(question.options);
}

export function LikertSurveyStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: LikertSurveyStageProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>(
    {},
  );

  const questions = useMemo(() => flattenQuestions(ui), [ui]);
  const scaleValues = useMemo(() => {
    return Array.from(
      { length: ui.scale.max - ui.scale.min + 1 },
      (_, index) => index + ui.scale.min,
    );
  }, [ui.scale.max, ui.scale.min]);

  const itemsPerPage = ui.display?.itemsPerPage ?? 5;
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentQuestions = questions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const answeredCount = Object.keys(responses).length;
  const progressPercentage =
    questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;

  function handleResponseChange(questionId: string, value: string | number) {
    setResponses((previous) => ({ ...previous, [questionId]: value }));
  }

  function areCurrentPageAnswersFilled() {
    return currentQuestions.every(
      (question) => responses[question.id] !== undefined,
    );
  }

  async function handleNext() {
    if (!areCurrentPageAnswersFilled()) {
      return;
    }

    if (currentPage < totalPages - 1) {
      setCurrentPage((previous) => previous + 1);
      if (ui.display?.enableSmoothScroll !== false) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      }
      return;
    }

    await onSubmit({
      responses,
      likertAnswers: questions
        .filter(
          (question): question is FlattenedQuestion & LikertQuestion =>
            !isChoiceQuestion(question),
        )
        .map((question) => ({
          id: question.id,
          response: responses[question.id],
        })),
      choiceAnswers: questions.filter(isChoiceQuestion).map((question) => ({
        id: question.id,
        response: responses[question.id],
      })),
    });
  }

  function handlePrevious() {
    if (currentPage === 0) {
      return;
    }

    setCurrentPage((previous) => previous - 1);
    if (ui.display?.enableSmoothScroll !== false) {
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
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
        <div className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50/70 p-6">
          <h3 className="text-xl font-semibold text-slate-950">
            {ui.introTitle}
          </h3>
          <div className="body-copy mt-4 space-y-3">
            {ui.instructions.map((instruction) => (
              <p key={instruction}>{instruction}</p>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div
              className="grid gap-2 text-center text-sm"
              style={{
                gridTemplateColumns: `repeat(${scaleValues.length}, minmax(0, 1fr))`,
              }}
            >
              {scaleValues.map((scaleValue) => (
                <div key={scaleValue}>
                  <div className="font-bold text-slate-700">{scaleValue}</div>
                  <div className="text-xs text-slate-600">
                    {ui.scale.labels[scaleValue]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {ui.display?.showProgressBar !== false ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">
              Page {currentPage + 1} of {totalPages}
            </span>
            <span className="text-slate-600">
              {answeredCount} / {questions.length} answered
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-5">
        {currentQuestions.map((question, index) =>
          isChoiceQuestion(question) ? (
            <ChoiceItem
              key={question.id}
              question={question}
              value={
                typeof responses[question.id] === "string"
                  ? (responses[question.id] as string)
                  : undefined
              }
              questionNumber={startIndex + index + 1}
              onChange={handleResponseChange}
            />
          ) : (
            <LikertItem
              key={question.id}
              question={question}
              value={
                typeof responses[question.id] === "number"
                  ? (responses[question.id] as number)
                  : undefined
              }
              questionNumber={startIndex + index + 1}
              scaleValues={scaleValues}
              scaleLabels={ui.scale.labels}
              onChange={handleResponseChange}
            />
          ),
        )}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 0 || disabled}
            className="secondary-button w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← {ui.previousLabel ?? "Previous"}
          </button>

          <div className="text-center text-sm text-slate-600">
            {areCurrentPageAnswersFilled() ? (
              <span className="font-semibold text-emerald-600">
                All questions on this page are answered.
              </span>
            ) : (
              <span>Please answer every item on this page.</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!areCurrentPageAnswersFilled() || disabled}
            className="primary-button w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled
              ? "Submitting..."
              : currentPage === totalPages - 1
                ? (ui.submitLabel ?? "Submit")
                : `${ui.nextLabel ?? "Next"} →`}
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
