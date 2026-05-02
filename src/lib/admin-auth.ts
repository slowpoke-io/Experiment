import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const ADMIN_COOKIE_NAME = "experiment_admin";
const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function requireAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return password;
}

function buildAdminToken() {
  return createHash("sha256")
    .update(`${requireAdminPassword()}|experiment-admin-v1`)
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
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function isAdminAuthorized(request: IncomingMessage) {
  const cookies = parseCookieHeader(request.headers.cookie);
  return cookies[ADMIN_COOKIE_NAME] === buildAdminToken();
}

export function setAdminSession(response: ServerResponse) {
  response.setHeader(
    "Set-Cookie",
    buildCookieHeader(buildAdminToken(), ADMIN_COOKIE_MAX_AGE_SECONDS),
  );
}

export function clearAdminSession(response: ServerResponse) {
  response.setHeader("Set-Cookie", buildCookieHeader("", 0));
}

export function validateAdminPassword(password: string) {
  return password === requireAdminPassword();
}
