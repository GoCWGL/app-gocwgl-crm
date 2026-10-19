"use client";

import { ApiError, type ApiErrorBody } from "@/utils/errors";
import { clearSession, getAccessToken, getSession, setSession } from "@/utils/auth/session";
import type { SessionResponse } from "./models";

export { ApiError };

const BASE = "/api";

/** One refresh at a time: refresh tokens are single-use, and a second concurrent refresh signs the device out. */
let refreshing: Promise<boolean> | null = null;

const csrf = () =>
  typeof document === "undefined" ? "" : decodeURIComponent(document.cookie.match(/(?:^|; )gocwgl_csrf=([^;]+)/)?.[1] ?? "");

/** Ask the parent window for a fresh token (used inside the "View as client" iframe). */
let parentTokenRequester: (() => Promise<boolean>) | null = null;
export function setParentTokenRequester(fn: (() => Promise<boolean>) | null) {
  parentTokenRequester = fn;
}

export function refresh(): Promise<boolean> {
  if (getSession().embedded) return parentTokenRequester ? parentTokenRequester() : Promise.resolve(false);
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrf() },
  })
    .then(async (r) => {
      if (!r.ok) {
        clearSession();
        return false;
      }
      const body = (await r.json()) as { data: SessionResponse };
      setSession(body.data);
      return true;
    })
    .catch(() => {
      clearSession();
      return false;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

/** Sign-in endpoints answer 401 for a wrong password or code; that must not trigger a refresh. */
const NO_REFRESH = /^\/(auth\/(login|register|email|password\/(forgot|reset)|refresh|logout$)|invitations\/|public\/)/;

/** Paged list endpoints return `{ data, meta }`; the client turns that into this shape. */
export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

type Json = Record<string, unknown> | unknown[];

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: Json | FormData;
  /** Query string values; undefined, null and "" are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

function authHeaders(path: string, headers: Headers) {
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const { viewAsClientId } = getSession();
  if (viewAsClientId && path.startsWith("/portal/")) headers.set("X-Client-Id", viewAsClientId);
}

async function send(path: string, opts: RequestOptions, retry: boolean): Promise<Response> {
  const { body, query, ...init } = opts;
  const headers = new Headers(init.headers);
  authHeaders(path, headers);
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }
  if (path.startsWith("/auth/logout")) headers.set("X-CSRF-Token", csrf());
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), { ...init, body: payload, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && retry && !NO_REFRESH.test(path) && (await refresh())) return send(path, opts, false);
  return res;
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const e = body?.error ?? { code: "http_error", message: res.statusText || "Request failed." };
  return new ApiError(res.status, e.code, e.message, e.details, Number(res.headers.get("Retry-After")) || undefined);
}

/** Call the API and return the unwrapped `data` (or `{ items, total, limit, offset }` for paged lists). */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await send(path, opts, true);
  if (res.status === 401 && !NO_REFRESH.test(path) && !getSession().embedded) clearSession();
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!body) return undefined as T;
  return (body.meta ? { items: body.data, ...body.meta } : body.data) as T;
}

export const get = <T>(path: string, query?: RequestOptions["query"]) => api<T>(path, { method: "GET", query });
export const post = <T>(path: string, body?: Json | FormData) => api<T>(path, { method: "POST", body });
export const put = <T>(path: string, body?: Json) => api<T>(path, { method: "PUT", body });
export const patch = <T>(path: string, body?: Json) => api<T>(path, { method: "PATCH", body });
export const del = <T = void>(path: string) => api<T>(path, { method: "DELETE" });

/**
 * Downloads need the Authorization header, so a plain <a href> won't work:
 * fetch with the token, then open (or save) a blob URL.
 */
export async function download(path: string, filename?: string): Promise<void> {
  const res = await send(path, { method: "GET" }, true);
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Full-page navigation into the API (OAuth starts here; it must not be a fetch). */
export function apiUrl(path: string, query?: RequestOptions["query"]): string {
  return buildUrl(path, query);
}
