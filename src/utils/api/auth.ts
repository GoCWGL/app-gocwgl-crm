import { ApiError } from "@/utils/errors";
import { apiUrl, del, get, post } from "./client";
import type {
  AcceptedResponse,
  DeviceSessionOut,
  InvitationPreview,
  MfaRequiredResponse,
  MfaStatusOut,
  RecoveryCodesOut,
  RegisterRequest,
  SessionResponse,
  TotpSetupOut,
  User,
} from "./models";

export type LoginResult = SessionResponse | MfaRequiredResponse;
export type OAuthProvider = "google" | "microsoft";

// ------------------------------------------------------------------ Sign in / up
export const login = (body: {
  email: string;
  password: string;
  remember: boolean;
  /** Cloudflare Turnstile token (when the bot check is on). */
  captchaToken?: string | null;
  /** Honeypot: always empty for people. */
  website?: string;
}) =>
  post<LoginResult>("/auth/login", body);

/** `mfaToken` is omitted after Google / Microsoft sign-in (it travels in a cookie). */
export const loginMfa = (body: { mfaToken?: string | null; code: string }) =>
  post<SessionResponse>("/auth/login/mfa", body.mfaToken ? body : { code: body.code });

export const register = (body: RegisterRequest) => post<AcceptedResponse>("/auth/register", body);
export const verifyEmail = (body: { email: string; code: string }) => post<SessionResponse>("/auth/email/verify", body);
export const resendVerification = (email: string) => post<AcceptedResponse>("/auth/email/resend", { email });
export const forgotPassword = (email: string) => post<AcceptedResponse>("/auth/password/forgot", { email });
export const resetPassword = (body: { token: string; newPassword: string }) => post<void>("/auth/password/reset", body);
export const me = () => get<User>("/auth/me");

/** Full-page navigation (not fetch): the API redirects to the provider and back to /login?oauth=… */
export const oauthAuthorizeUrl = (provider: OAuthProvider, remember = true) =>
  apiUrl(`/auth/oauth/${provider}/authorize`, { remember });

/**
 * Start Google / Microsoft sign-in. The sign-in itself is a full-page navigation; a quick
 * no-follow request first catches 502 `oauth_not_configured` (and 429) so the page can show the
 * API's message instead of sending the browser to a raw error.
 */
export async function startOAuth(provider: OAuthProvider, remember = true): Promise<void> {
  const url = oauthAuthorizeUrl(provider, remember);
  const res = await fetch(url, { redirect: "manual", credentials: "include" }).catch(() => null);
  if (res && res.type !== "opaqueredirect" && res.status !== 0 && !res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? "oauth_failed", body?.error?.message ?? "Sign-in with this provider isn’t available right now.");
  }
  window.location.assign(url);
}

// ------------------------------------------------------------------ Invitations
export const previewInvitation = (token: string) => post<InvitationPreview>("/invitations/preview", { token });
export const acceptInvitation = (body: { token: string; fullName: string; password: string }) =>
  post<SessionResponse>("/invitations/accept", body);

// ------------------------------------------------------------------ Security
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  post<void>("/auth/password/change", body);
export const logoutAll = () => post<void>("/auth/logout-all");
export const listSessions = () => get<DeviceSessionOut[]>("/auth/sessions");
export const revokeSession = (id: string) => del(`/auth/sessions/${id}`);

export const mfaStatus = () => get<MfaStatusOut>("/auth/mfa");
export const startTotp = (password: string | null) => post<TotpSetupOut>("/auth/mfa/totp/setup", { password });
export const confirmTotp = (code: string) => post<RecoveryCodesOut>("/auth/mfa/totp/confirm", { code });
export const disableTotp = (body: { password: string | null; code: string }) => post<void>("/auth/mfa/totp/disable", body);
export const regenerateRecoveryCodes = (code: string) => post<RecoveryCodesOut>("/auth/mfa/recovery-codes", { code });
