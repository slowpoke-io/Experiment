type ErrorWithFields = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function hasErrorFields(error: unknown): error is ErrorWithFields {
  return typeof error === "object" && error !== null;
}

export function isUniqueViolation(error: unknown) {
  return hasErrorFields(error) && error.code === "23505";
}

export function formatApiError(
  error: unknown,
  fallback = "Unknown error",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (!hasErrorFields(error)) {
    return fallback;
  }

  const message =
    typeof error.message === "string" && error.message.trim()
      ? error.message.trim()
      : null;
  const details =
    typeof error.details === "string" && error.details.trim()
      ? error.details.trim()
      : null;
  const hint =
    typeof error.hint === "string" && error.hint.trim()
      ? error.hint.trim()
      : null;

  return [message, details, hint].filter(Boolean).join(" | ") || fallback;
}
