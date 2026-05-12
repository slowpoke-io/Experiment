import { useEffect, useMemo, useState } from "react";

import { StageInstructions } from "@/components/StageInstructions";
import { StageCard } from "@/components/StageCard";
import { testModeDelaySeconds } from "@/lib/test-mode";
import type {
  ChoiceQuestion,
  LikertQuestion,
  LikertQuestionGroup,
  LikertQuestionSection,
  LikertStageUI,
  SliderQuestion,
  StageResponse,
  SurveyQuestion,
  TextQuestion,
} from "@/lib/types";

const ANSWERS_REQUIRED_FOR_ADVANCE = process.env.NODE_ENV === "production";

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
  groupDescription?: string;
};

type DerivedGroup = LikertQuestionGroup & {
  sectionId?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionPaginate?: boolean;
};

type GroupPage = DerivedGroup[];

function getDerivedGroups(ui: LikertStageUI): DerivedGroup[] {
  if (ui.questionSections?.length) {
    return ui.questionSections.flatMap((section: LikertQuestionSection) =>
      section.groups.map((group) => ({
        ...group,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionDescription: section.description,
        sectionPaginate: section.paginate,
      })),
    );
  }

  return ui.questionGroups.map((group) => ({ ...group }));
}

function flattenQuestions(groups: DerivedGroup[]): FlattenedQuestion[] {
  return groups.flatMap((group) =>
    group.items.map((question) => ({
      ...question,
      groupId: group.id,
      groupTitle: group.title,
      groupDescription: group.description,
    })),
  );
}

function buildGroupPages(
  groups: DerivedGroup[],
  groupsPerPage: number,
): GroupPage[] {
  if (groups.length === 0) {
    return [];
  }

  const pages: GroupPage[] = [];
  let currentPage: GroupPage = [];
  let currentSectionId: string | undefined;
  let currentSectionPaginate = true;

  for (const group of groups) {
    const nextSectionId = group.sectionId;
    const nextSectionPaginate = group.sectionPaginate !== false;
    const wouldCrossSection =
      currentPage.length > 0 && currentSectionId !== nextSectionId;
    const reachedPageLimit =
      currentPage.length > 0 &&
      currentSectionPaginate &&
      currentPage.length >= groupsPerPage;

    if (wouldCrossSection || reachedPageLimit) {
      pages.push(currentPage);
      currentPage = [];
      currentSectionId = undefined;
      currentSectionPaginate = true;
    }

    if (currentPage.length === 0) {
      currentSectionId = nextSectionId;
      currentSectionPaginate = nextSectionPaginate;
    }

    currentPage.push(group);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function buildInitialResponses() {
  return {};
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
          <div
            className="text-[15px] font-medium leading-7 tracking-[0.01em] text-slate-900 md:text-base"
            dangerouslySetInnerHTML={{ __html: question.text }}
          />
        </div>
      </div>

      <div>
        {/* <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>{scaleLabels[scaleValues[0]]}</span>
          <span>{scaleLabels[scaleValues[scaleValues.length - 1]]}</span>
        </div> */}
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
  value: string | number | undefined;
  questionNumber: number;
  onChange: (questionId: string, value: string | number) => void;
};

function ChoiceItem({
  question,
  value,
  questionNumber,
  onChange,
}: ChoiceItemProps) {
  if (question.layout === "scale") {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
            {questionNumber}
          </span>
          <div className="space-y-2">
            <div
              className="text-[15px] font-medium leading-7 tracking-[0.01em] text-slate-900 md:text-base"
              dangerouslySetInnerHTML={{ __html: question.text }}
            />
          </div>
        </div>

        <div>
          <div className="mx-3 mb-5 flex items-start justify-between gap-4 text-[16px] text-slate-800">
            <span
              className="max-w-[45%] text-left font-medium leading-snug"
              dangerouslySetInnerHTML={{
                __html: question.minLabel ?? "",
              }}
            />
            <span
              className="max-w-[45%] text-right font-medium leading-snug"
              dangerouslySetInnerHTML={{
                __html: question.maxLabel ?? "",
              }}
            />
          </div>
          <div
            className="grid gap-1.5 md:gap-2"
            style={{
              gridTemplateColumns: `repeat(${question.options.length}, minmax(0, 1fr))`,
            }}
          >
            {question.options.map((option) => {
              const selected = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(question.id, option.value)}
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
                        "text-center text-[11px] font-semibold leading-tight md:text-sm",
                        selected ? "text-indigo-700" : "text-slate-700",
                      ].join(" ")}
                      dangerouslySetInnerHTML={{ __html: option.label }}
                    ></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
          {questionNumber}
        </span>
        <div className="space-y-2">
          <div
            className="text-[15px] font-medium leading-6 tracking-[0.01em] text-slate-900 md:text-base"
            dangerouslySetInnerHTML={{ __html: question.text }}
          />
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

type SliderItemProps = {
  question: FlattenedQuestion & SliderQuestion;
  value: number | undefined;
  questionNumber: number;
  onChange: (questionId: string, value: number) => void;
};

function SliderItem({
  question,
  value,
  questionNumber,
  onChange,
}: SliderItemProps) {
  const hasAnswered = value !== undefined;
  const currentValue = hasAnswered
    ? value
    : (question.defaultValue ?? question.min);
  const tickValues = Array.from(
    { length: question.max - question.min + 1 },
    (_, index) => question.min + index,
  );

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
          {questionNumber}
        </span>
        <div className="space-y-2">
          <div
            className="text-[15px] font-medium leading-6 tracking-[0.01em] text-slate-900 md:text-base"
            dangerouslySetInnerHTML={{ __html: question.text }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 text-[16px] font-medium text-slate-800">
          <span
            className="max-w-[45%] text-left font-medium"
            dangerouslySetInnerHTML={{ __html: question.minLabel }}
          />
          <span
            className="max-w-[45%] text-right font-medium leading-normal"
            dangerouslySetInnerHTML={{ __html: question.maxLabel }}
          />
        </div>

        <div className="px-1">
          <input
            type="range"
            min={question.min}
            max={question.max}
            step={question.step ?? 1}
            value={currentValue}
            onPointerDown={() => {
              if (!hasAnswered) {
                onChange(question.id, currentValue);
              }
            }}
            onChange={(event) =>
              onChange(question.id, Number(event.currentTarget.value))
            }
            className="slider-input h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
          />
        </div>

        <div className="relative h-5 px-1 text-sm font-semibold text-slate-700">
          {tickValues.map((tickValue, index) => {
            const isFirst = index === 0;
            const isLast = index === tickValues.length - 1;
            const leftPercent =
              tickValues.length === 1
                ? 0
                : ((tickValue - question.min) / (question.max - question.min)) *
                  100;

            return (
              <span
                key={`${question.id}-tick-${tickValue}`}
                className={[
                  "absolute top-0",
                  isFirst
                    ? "left-0 translate-x-0 text-left"
                    : isLast
                      ? "left-full -translate-x-full text-right"
                      : "-translate-x-1/2 text-center",
                ].join(" ")}
                style={
                  isFirst || isLast ? undefined : { left: `${leftPercent}%` }
                }
              >
                {tickValue}
              </span>
            );
          })}
        </div>

        {!hasAnswered ? (
          <p className="text-[16px] text-slate-500 text-center">
            Please answer by dragging the slider.
          </p>
        ) : null}
      </div>
    </div>
  );
}

type TextItemProps = {
  question: FlattenedQuestion & TextQuestion;
  value: string | undefined;
  questionNumber: number;
  onChange: (questionId: string, value: string) => void;
};

function TextItem({
  question,
  value,
  questionNumber,
  onChange,
}: TextItemProps) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
          {questionNumber}
        </span>
        <div className="space-y-1">
          <div
            className="text-[15px] font-medium leading-6 tracking-[0.01em] text-slate-900 md:text-base"
            dangerouslySetInnerHTML={{ __html: question.text }}
          />
          {question.optional ? (
            <p className="text-xs text-slate-500">Optional</p>
          ) : null}
        </div>
      </div>

      <textarea
        rows={question.rows ?? 6}
        maxLength={question.maxLength}
        value={value ?? ""}
        onChange={(event) => onChange(question.id, event.currentTarget.value)}
        placeholder={question.placeholder}
        className="min-h-36 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

function isChoiceQuestion(
  question: FlattenedQuestion,
): question is FlattenedQuestion & ChoiceQuestion {
  return "options" in question && Array.isArray(question.options);
}

function isSliderQuestion(
  question: FlattenedQuestion,
): question is FlattenedQuestion & SliderQuestion {
  return question.kind === "slider";
}

function isTextQuestion(
  question: FlattenedQuestion,
): question is FlattenedQuestion & TextQuestion {
  return question.kind === "text";
}

export function LikertSurveyStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: LikertSurveyStageProps) {
  const derivedGroups = useMemo(() => getDerivedGroups(ui), [ui]);
  const questions = useMemo(
    () => flattenQuestions(derivedGroups),
    [derivedGroups],
  );
  const groupsPerPage = ui.display?.groupsPerPage ?? 3;
  const groupPages = useMemo(
    () => buildGroupPages(derivedGroups, groupsPerPage),
    [derivedGroups, groupsPerPage],
  );
  const scaleValues = useMemo(() => {
    return Array.from(
      { length: ui.scale.max - ui.scale.min + 1 },
      (_, index) => index + ui.scale.min,
    );
  }, [ui.scale.max, ui.scale.min]);
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>(
    () => buildInitialResponses(),
  );
  const [secondsRemaining, setSecondsRemaining] = useState(
    testModeDelaySeconds(ui.continueDelaySeconds),
  );

  const totalPages = groupPages.length;
  const currentGroups = groupPages[currentPage] ?? [];
  const currentQuestions = currentGroups.flatMap((group) =>
    group.items.map((question) => ({
      ...question,
      groupId: group.id,
      groupTitle: group.title,
      groupDescription: group.description,
    })),
  );
  const answeredCount = Object.keys(responses).length;
  const progressPercentage =
    questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;

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

  function handleResponseChange(questionId: string, value: string | number) {
    setResponses((previous) => ({ ...previous, [questionId]: value }));
  }

  function areCurrentPageAnswersFilled() {
    return currentQuestions.every((question) => {
      if (isSliderQuestion(question)) {
        return responses[question.id] !== undefined;
      }

      if (isTextQuestion(question)) {
        if (question.optional) {
          return true;
        }

        const responseValue = responses[question.id];
        return (
          typeof responseValue === "string" && responseValue.trim().length > 0
        );
      }

      return responses[question.id] !== undefined;
    });
  }

  const canAdvanceCurrentPage =
    !ANSWERS_REQUIRED_FOR_ADVANCE || areCurrentPageAnswersFilled();

  async function handleNext() {
    if (!canAdvanceCurrentPage) {
      return;
    }

    if (currentPage < totalPages - 1) {
      setSecondsRemaining(testModeDelaySeconds(ui.continueDelaySeconds));
      setCurrentPage((previous) => previous + 1);
      if (ui.display?.enableSmoothScroll !== false) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      }
      return;
    }

    const normalizedResponses = questions.reduce<
      Record<string, string | number>
    >((accumulator, question) => {
      const responseValue = responses[question.id];

      if (
        typeof responseValue === "string" ||
        typeof responseValue === "number"
      ) {
        accumulator[question.id] = responseValue;
        return accumulator;
      }

      if (isTextQuestion(question)) {
        accumulator[question.id] = "";
      }

      return accumulator;
    }, {});

    await onSubmit({
      responses: normalizedResponses,
      likertAnswers: questions
        .filter(
          (question): question is FlattenedQuestion & LikertQuestion =>
            !isChoiceQuestion(question) &&
            !isSliderQuestion(question) &&
            !isTextQuestion(question),
        )
        .map((question) => ({
          id: question.id,
          response: normalizedResponses[question.id],
        })),
      choiceAnswers: questions.filter(isChoiceQuestion).map((question) => ({
        id: question.id,
        response: normalizedResponses[question.id],
      })),
      sliderAnswers: questions.filter(isSliderQuestion).map((question) => ({
        id: question.id,
        response:
          typeof normalizedResponses[question.id] === "number"
            ? normalizedResponses[question.id]
            : (question.defaultValue ?? question.min),
      })),
      textAnswers: questions.filter(isTextQuestion).map((question) => ({
        id: question.id,
        response:
          typeof normalizedResponses[question.id] === "string"
            ? normalizedResponses[question.id]
            : "",
      })),
    });
  }

  function handlePrevious() {
    if (currentPage === 0) {
      return;
    }

    setCurrentPage((previous) => previous - 1);
    setSecondsRemaining(testModeDelaySeconds(ui.continueDelaySeconds));
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
        <StageInstructions
          title={ui.introTitle}
          instructions={ui.instructions}
          tone="indigo"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
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
        </StageInstructions>
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
        {currentGroups.map((group) => {
          const groupStartIndex = questions.findIndex(
            (question) => question.groupId === group.id,
          );
          const flattenedGroupQuestions = group.items.map((question) => ({
            ...question,
            groupId: group.id,
            groupTitle: group.title,
            groupDescription: group.description,
          }));

          return (
            <div key={group.id} className="space-y-3">
              {group.sectionTitle || group.sectionDescription ? (
                currentGroups.findIndex(
                  (candidate) => candidate.sectionId === group.sectionId,
                ) === currentGroups.indexOf(group) ? (
                  <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 px-5 py-4">
                    {group.sectionTitle ? (
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {group.sectionTitle}
                      </h3>
                    ) : null}
                    {group.sectionDescription ? (
                      <div
                        className={
                          group.sectionTitle ? "body-copy mt-2" : "body-copy"
                        }
                        dangerouslySetInnerHTML={{
                          __html: group.sectionDescription,
                        }}
                      />
                    ) : null}
                  </div>
                ) : null
              ) : null}

              {group.show ||
              (process.env.NODE_ENV === "development" &&
                (group.title || group.description)) ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 mt-10">
                  {group.title ? (
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {group.title}
                    </h3>
                  ) : null}
                  {group.description ? (
                    <div
                      className={
                        group.title
                          ? "body-copy mt-2 leading-relaxed"
                          : "body-copy"
                      }
                      dangerouslySetInnerHTML={{
                        __html: group.description,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}

              {flattenedGroupQuestions.map((question, index) =>
                isChoiceQuestion(question) ? (
                  <ChoiceItem
                    key={question.id}
                    question={question}
                    value={
                      typeof responses[question.id] === "string" ||
                      typeof responses[question.id] === "number"
                        ? responses[question.id]
                        : undefined
                    }
                    questionNumber={groupStartIndex + index + 1}
                    onChange={handleResponseChange}
                  />
                ) : isSliderQuestion(question) ? (
                  <SliderItem
                    key={question.id}
                    question={question}
                    value={
                      typeof responses[question.id] === "number"
                        ? (responses[question.id] as number)
                        : undefined
                    }
                    questionNumber={groupStartIndex + index + 1}
                    onChange={handleResponseChange}
                  />
                ) : isTextQuestion(question) ? (
                  <TextItem
                    key={question.id}
                    question={question}
                    value={
                      typeof responses[question.id] === "string"
                        ? (responses[question.id] as string)
                        : undefined
                    }
                    questionNumber={groupStartIndex + index + 1}
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
                    questionNumber={groupStartIndex + index + 1}
                    scaleValues={scaleValues}
                    scaleLabels={ui.scale.labels}
                    onChange={handleResponseChange}
                  />
                ),
              )}
            </div>
          );
        })}
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
            {canAdvanceCurrentPage ? (
              <span className="font-semibold text-emerald-600">
                {ANSWERS_REQUIRED_FOR_ADVANCE
                  ? "All questions on this page are answered."
                  : "Dev mode: you can continue without answering every item."}
              </span>
            ) : (
              <span>Please answer every item on this page.</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={
              !canAdvanceCurrentPage || disabled || secondsRemaining > 0
            }
            className="primary-button w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled
              ? "Submitting..."
              : secondsRemaining > 0
                ? `Continue in ${secondsRemaining}s`
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
