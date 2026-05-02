export const IS_E2E_TEST_MODE =
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

export function testModeDelaySeconds(seconds?: number) {
  return IS_E2E_TEST_MODE ? 0 : (seconds ?? 0);
}
