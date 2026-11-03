import type { ApiErrorBody, AuthPayload } from "@/types/api";
import { env } from "@/lib/env";
import { clearSessionHint } from "@/lib/session-cookie";

/** Access token lives in memory only — the refresh token is an httpOnly cookie. */
let accessToken: string | null = null;

const REFRESH_PATH = "/api/v1/user/auth/refresh";

/** Their 401 means "wrong credentials", not "dead session" — the login and
 *  register forms surface that error inline; bouncing to /login would eat
 *  it and loop. */
const CREDENTIAL_PATHS = new Set([
  "/api/v1/user/auth/login",
  "/api/v1/user/auth/register",
]);

/** Set once per dead session — a dashboard's queries fail together and each
 *  would otherwise trigger another navigation to /login. A successful
 *  refresh (fresh token) re-arms it. */
let expiredSessionHandled = false;

/** Single-flight refresh: concurrent callers (React effect double-mounts,
 *  parallel requests recovering from the same expired token) share ONE
 *  network call. Without this, two simultaneous rotations of the same
 *  refresh cookie conflict server-side (Mongo transaction P2034) and the
 *  loser would kill the session. */
let refreshInFlight: null | Promise<AuthPayload> = null;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
}

interface RawOutcome<T> {
  body: Envelope<T> | null;
  /** True only when fetch itself threw — the server never answered. */
  networkError: boolean;
  status: number;
}

/**
 * Typed fetch wrapper for the bd/ API. Every request goes through here —
 * components never call fetch directly.
 *
 * - Sends/receives the standard envelope: { success, data } | { success, false, error }
 * - Attaches the in-memory access token as a Bearer header
 * - Uses the httpOnly refresh cookie (credentials: "include") to silently
 *   recover exactly once from an expired access token
 */

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorBody["details"],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, payload?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  /** Multipart upload — the browser sets the Content-Type boundary. */
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  put: <T>(path: string, payload?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  patch: <T>(path: string, payload?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(
  path: string,
  init: RequestInit,
  allowRetry = true,
): Promise<T> {
  const { body, networkError, status } = await rawRequest<T>(path, init);

  if (body?.success && body.data !== undefined) {
    return body.data;
  }

  // Expired access token: silently refresh once via the httpOnly cookie,
  // then replay the original request. A network blip is worth one retry too —
  // but a REAL HTTP answer without our JSON envelope (e.g. Vercel's plain-text
  // 413 FUNCTION_PAYLOAD_TOO_LARGE on oversized uploads) would fail identically
  // on replay, so it is reported as-is instead of pointlessly duplicated.
  if (
    allowRetry &&
    path !== REFRESH_PATH &&
    (networkError || body?.error?.code === "UNAUTHORIZED")
  ) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  if (networkError) {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Could not reach the API. Is the backend running?",
    );
  }

  // Beyond recovery: the request 401'd and the refresh exchange above either
  // failed or produced a token the replay still rejected.
  if (body?.error?.code === "UNAUTHORIZED" && !CREDENTIAL_PATHS.has(path)) {
    handleExpiredSession();
  }

  throw new ApiClientError(
    status,
    body?.error?.code ?? "HTTP_ERROR",
    body?.error?.message ??
      `The API returned HTTP ${status} without an error body.`,
    body?.error?.details,
  );
}

/**
 * The request 401'd AND the refresh exchange could not recover — the session
 * is dead on this device (expired everywhere else, or the browser refuses to
 * store the cross-site refresh cookie, as mobile Safari/Chrome do). Clear
 * the routing-hint cookie so middleware lets the user back to /login, and
 * hard-navigate there with a `next` return path. No-op during SSR and on
 * the auth pages themselves.
 */
function handleExpiredSession(): void {
  if (expiredSessionHandled || typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login" || pathname === "/register") return;
  expiredSessionHandled = true;
  clearSessionHint();
  // Deliberately a hard navigation, not router.push: the session is dead,
  // so every in-memory bit (react-query cache, half-rendered admin panels)
  // must be torn down with a full document reload.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(
    `/login?next=${encodeURIComponent(pathname + search)}`,
  );
}

/** Exchanges the httpOnly refresh cookie for a fresh access token + user. */
export async function refreshSession(): Promise<AuthPayload> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const { body } = await rawRequest<AuthPayload>(REFRESH_PATH, {
      method: "POST",
    });
    if (!body?.success || !body.data) {
      throw new ApiClientError(401, "UNAUTHORIZED", "Session expired");
    }
    accessToken = body.data.accessToken;
    expiredSessionHandled = false;
    return body.data;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function rawRequest<T>(
  path: string,
  init: RequestInit,
): Promise<RawOutcome<T>> {
  const headers = new Headers(init.headers);
  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    // Network failure (backend down, DNS, offline) — surfaces without a body
    // so callers always receive an ApiClientError, never a raw TypeError.
    return { body: null, networkError: true, status: 0 };
  }

  return {
    body: (await response.json().catch(() => null)) as Envelope<T> | null,
    networkError: false,
    status: response.status,
  };
}
