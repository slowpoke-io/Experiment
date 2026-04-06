import type { JsonObject, ValidatorFn } from "@/lib/types";

type CheckDefinition = {
  key: string;
  expected: unknown;
};

export const placeholder_validator: ValidatorFn = () => {
  return {
    passed: true,
    verdict: { kind: "placeholder_validator" },
  };
};

function findAnswerValue(answers: JsonObject, key: string) {
  const directValue = answers[key];
  if (directValue !== undefined) {
    return directValue;
  }

  const responseMap = answers.responses;
  if (
    typeof responseMap === "object" &&
    responseMap !== null &&
    !Array.isArray(responseMap) &&
    key in responseMap
  ) {
    return (responseMap as Record<string, unknown>)[key];
  }

  const likertAnswers = answers.likertAnswers;
  if (Array.isArray(likertAnswers)) {
    const match = likertAnswers.find((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        item.id === key &&
        "response" in item
      );
    });

    if (match && typeof match === "object" && match !== null && "response" in match) {
      return match.response;
    }
  }

  const choiceAnswers = answers.choiceAnswers;
  if (Array.isArray(choiceAnswers)) {
    const match = choiceAnswers.find((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        item.id === key &&
        "response" in item
      );
    });

    if (match && typeof match === "object" && match !== null && "response" in match) {
      return match.response;
    }
  }

  const sliderAnswers = answers.sliderAnswers;
  if (Array.isArray(sliderAnswers)) {
    const match = sliderAnswers.find((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        item.id === key &&
        "response" in item
      );
    });

    if (match && typeof match === "object" && match !== null && "response" in match) {
      return match.response;
    }
  }

  const textAnswers = answers.textAnswers;
  if (Array.isArray(textAnswers)) {
    const match = textAnswers.find((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        item.id === key &&
        "response" in item
      );
    });

    if (match && typeof match === "object" && match !== null && "response" in match) {
      return match.response;
    }
  }

  return undefined;
}

export const attention_checks: ValidatorFn = (_ctx, answers, params) => {
  const checks = params?.checks;

  if (!Array.isArray(checks) || checks.length === 0) {
    throw new Error("checks missing");
  }

  const results = (checks as CheckDefinition[]).map((check) => {
    const actual = findAnswerValue(answers, check.key);
    const isCorrect =
      actual !== undefined &&
      JSON.stringify(actual) === JSON.stringify(check.expected);

    return {
      key: check.key,
      expected: check.expected,
      actual: actual ?? null,
      isCorrect,
    };
  });

  return {
    passed: results.every((result) => result.isCorrect),
    verdict: {
      kind: "attention_checks",
      results,
    } satisfies JsonObject,
  };
};

export const VALIDATORS: Record<string, ValidatorFn> = {
  placeholder_validator,
  attention_checks,
};
