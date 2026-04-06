import type { JsonObject } from "@/lib/types";

function toSentenceCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

export function describeFailureReason(reason?: JsonObject | null) {
  if (!reason) {
    return "Reason: study requirements were not met.";
  }

  if (reason.reason === "timeout") {
    return "Reason: the session timed out.";
  }

  if (reason.kind === "attention_checks") {
    return "Reason: one or more attention checks were answered incorrectly.";
  }

  if (typeof reason.reason === "string" && reason.reason.trim()) {
    return `Reason: ${toSentenceCase(reason.reason)}.`;
  }

  if (typeof reason.kind === "string" && reason.kind.trim()) {
    return `Reason: ${toSentenceCase(reason.kind)}.`;
  }

  return "Reason: study requirements were not met.";
}

export function buildFailureModalDescription() {
  return "This study session cannot continue.";
}

export function buildFailureModalNote(reason?: JsonObject | null) {
  return describeFailureReason(reason);
}
