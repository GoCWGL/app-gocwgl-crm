"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@/utils/api/models";
// The API client reads the token from this module; the import cycle is only between functions.
import { api, refresh } from "@/utils/api/client";

/**
 * The signed-in session, kept in memory only (never localStorage / sessionStorage).
 * The refresh token lives in an HttpOnly cookie the browser sends to /api/auth/*.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionState = {
  status: SessionStatus;
  accessToken: string | null;
  user: User | null;
  /** "View as client": the contact whose portal a staff member is looking at (sent as X-Client-Id). */
  viewAsClientId: string | null;
  /** True inside the "View as client" iframe: the parent window owns the session and refreshes it. */
  embedded: boolean;
};

let state: SessionState = {
  status: "loading",
  accessToken: null,
  user: null,
  viewAsClientId: null,
  embedded: false,
};

const listeners = new Set<() => void>();

function set(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(): SessionState {
  return state;
}

export function getAccessToken(): string | null {
  return state.accessToken;
}

/** Store a SessionResponse (or anything with an access token and optional user). */
export function setSession(body: { accessToken: string; user?: User | null }) {
  set({ accessToken: body.accessToken, user: body.user ?? state.user, status: "authenticated" });
}

export function setUser(user: User) {
  set({ user });
}

export function clearSession() {
  set({ accessToken: null, user: null, status: "anonymous" });
}

export function setViewAs(contactId: string | null, embedded: boolean) {
  set({ viewAsClientId: contactId, embedded });
}

const SERVER_STATE: SessionState = { ...state };

/** React hook: the current session (re-renders on sign-in, refresh and sign-out). */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, () => SERVER_STATE);
}

// ------------------------------------------------------------------ Role helpers (UX only; the API enforces access)
export function isStaff(user: User | null | undefined): boolean {
  return !!user?.isStaff;
}

/** Staff who can change CRM data (everyone but "viewer"). */
export function canWriteCrm(user: User | null | undefined): boolean {
  return !!user?.isStaff && user.role !== "viewer";
}

/** Super admins and admins: settings, team, domains, payment keys, audit log, jobs. */
export function isStaffAdmin(user: User | null | undefined): boolean {
  return !!user?.isStaff && (user.role === "super_admin" || user.role === "admin");
}

/**
 * Whether this teammate may use a CRM menu (Settings › Team › Menus). No list means every menu; super admins always
 * have every menu. The API enforces the same rule.
 */
export function canUseMenu(user: User | null | undefined, menu: string | null): boolean {
  if (!user?.isStaff) return false;
  if (!menu || user.role === "super_admin" || user.menuAccess == null) return true;
  return user.menuAccess.includes(menu);
}

/** Only a super admin may add, promote, demote or remove admins and super admins (the API enforces it). */
export function isSuperAdmin(user: User | null | undefined): boolean {
  return !!user?.isStaff && user.role === "super_admin";
}

// ------------------------------------------------------------------ Restore and sign out

/** On app load: trade the refresh cookie for an access token. Resolves false when nobody is signed in. */
export async function restoreSession(): Promise<boolean> {
  if (state.status === "authenticated") return true;
  const ok = await refresh();
  if (!ok) clearSession();
  return ok;
}

/** POST /auth/logout (with the CSRF header), then forget the session either way. */
export async function signOut(): Promise<void> {
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } catch {
    // The cookie may already be gone; signing out locally is what matters.
  }
  clearSession();
}
