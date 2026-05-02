# Key Test Cases

This document lists only the most important test cases for the current study flow.

## Critical Unit Tests

| File | Test case | What it verifies |
| --- | --- | --- |
| `tests/unit/submit-handler.test.ts` | Failed validation path | A participant who fails validation is marked failed and receives the Prolific fail redirect |
| `tests/unit/submit-handler.test.ts` | Successful non-final stage | A valid submission is stored and the participant advances to the next stage |
| `tests/unit/submit-handler.test.ts` | Successful final stage | The last valid submission marks the participant completed and returns the Prolific completion redirect |
| `tests/unit/init-current-stage.test.ts` | New participant initialization | A new participant is assigned IVs, receives stage variants, and is routed to the first stage correctly |
| `tests/unit/init-current-stage.test.ts` | Current stage lookup | The API returns the participant's current unlocked stage with the correct stage metadata |
| `tests/unit/validators.test.ts` | Attention check validation | Attention-check answers are read correctly and a mismatch causes validation failure |

## Critical End-to-End Tests

| File | Test case | What it verifies |
| --- | --- | --- |
| `tests/e2e/study-flow.spec.ts` | Participant can complete the full study flow | The participant can complete consent, stages 1-7, see the final thank-you modal, and then return to Prolific |
| `tests/e2e/study-flow.spec.ts` | Failed submission flow | A failed participant sees the failure modal and can return to the Prolific fail URL |
| `tests/e2e/study-flow.spec.ts` | Consent decline flow | A participant who declines consent is redirected to the no-consent return URL |
