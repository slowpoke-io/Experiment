import { describe, expect, it } from "vitest";

import { attention_checks } from "@/lib/validators";

describe("validators", () => {
  it("attention_checks reads nested responses and fails incorrect answers", () => {
    const result = attention_checks(
      { iv1: "A", iv2: "B" },
      {
        responses: {
          CHECK_1: 6,
        },
        textAnswers: [
          {
            id: "CHECK_2",
            response: "wrong",
          },
        ],
      },
      {
        checks: [
          { key: "CHECK_1", expected: 6 },
          { key: "CHECK_2", expected: "expected" },
        ],
      },
    );

    expect(result.passed).toBe(false);
    expect(result.verdict).toEqual({
      kind: "attention_checks",
      results: [
        {
          key: "CHECK_1",
          expected: 6,
          actual: 6,
          isCorrect: true,
        },
        {
          key: "CHECK_2",
          expected: "expected",
          actual: "wrong",
          isCorrect: false,
        },
      ],
    });
  });
});
