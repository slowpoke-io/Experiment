import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const FOLLOW_UP_COOKIE_NAME = "experiment_follow_up";
const FOLLOW_UP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function requireFollowUpPassword() {
  const password = process.env.FOLLOW_UP_PASSWORD;
  if (!password) {
    throw new Error("FOLLOW_UP_PASSWORD is not set");
  }
  return password;
}

function buildFollowUpToken() {
  return createHash("sha256")
    .update(`${requireFollowUpPassword()}|experiment-follow-up-v1`)
    .digest("hex");
}

function parseCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

function buildCookieHeader(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FOLLOW_UP_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function isFollowUpAuthorized(request: IncomingMessage) {
  const cookies = parseCookieHeader(request.headers.cookie);
  return cookies[FOLLOW_UP_COOKIE_NAME] === buildFollowUpToken();
}

export function setFollowUpSession(response: ServerResponse) {
  response.setHeader(
    "Set-Cookie",
    buildCookieHeader(buildFollowUpToken(), FOLLOW_UP_COOKIE_MAX_AGE_SECONDS),
  );
}

export function clearFollowUpSession(response: ServerResponse) {
  response.setHeader("Set-Cookie", buildCookieHeader("", 0));
}

export function validateFollowUpPassword(password: string) {
  return password === requireFollowUpPassword();
}
