"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as auth from "@/utils/api/auth";
import type { SessionResponse } from "@/utils/api/models";
import { setSession, signOut } from "@/utils/auth/session";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Store a fresh session from any sign-in endpoint. */
export function acceptSession(session: SessionResponse) {
  setSession(session);
  return session;
}

export const useLogin = () => useApiMutation(auth.login);
export const useLoginMfa = () => useApiMutation((v: { mfaToken?: string | null; code: string }) => auth.loginMfa(v).then(acceptSession));
export const useRegister = () => useApiMutation(auth.register);
export const useVerifyEmail = () => useApiMutation((v: { email: string; code: string }) => auth.verifyEmail(v).then(acceptSession));
export const useResendVerification = () => useApiMutation(auth.resendVerification);
export const useForgotPassword = () => useApiMutation(auth.forgotPassword);
export const useResetPassword = () => useApiMutation(auth.resetPassword);
export const usePreviewInvitation = (token: string | null) =>
  useQuery({ queryKey: ["invitation", token], queryFn: () => auth.previewInvitation(token!), enabled: !!token, retry: false });
export const useAcceptInvitation = () =>
  useApiMutation((v: { token: string; fullName: string; password: string }) => auth.acceptInvitation(v).then(acceptSession));

/** Sign out, then drop every cached query so the next account starts clean. */
export function useSignOut() {
  const qc = useQueryClient();
  return useApiMutation(async () => {
    await signOut();
    qc.clear();
  });
}

// ------------------------------------------------------------------ Security settings
export const useSessions = () => useQuery({ queryKey: qk.sessions, queryFn: auth.listSessions });
export const useRevokeSession = () => useApiMutation(auth.revokeSession, { invalidate: [qk.sessions] });
export const useLogoutAll = () => useApiMutation(auth.logoutAll);
export const useChangePassword = () => useApiMutation(auth.changePassword, { invalidate: [qk.sessions] });
export const useMfaStatus = () => useQuery({ queryKey: qk.mfa, queryFn: auth.mfaStatus });
export const useStartTotp = () => useApiMutation(auth.startTotp);
export const useConfirmTotp = () => useApiMutation(auth.confirmTotp, { invalidate: [qk.mfa, qk.me] });
export const useDisableTotp = () => useApiMutation(auth.disableTotp, { invalidate: [qk.mfa, qk.me] });
export const useRegenerateRecoveryCodes = () => useApiMutation(auth.regenerateRecoveryCodes, { invalidate: [qk.mfa] });
