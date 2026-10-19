"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import type { SessionResponse } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useLoginMfa, useResendVerification, useVerifyEmail } from "@/utils/hooks/useAuth";
import type { VerifyReason } from "../types";

type VerifyFormProps = {
  reason: VerifyReason;
  /** The address being confirmed (sign-up). */
  email: string;
  /** From POST /auth/login; null after Google / Microsoft sign-in (the challenge is in a cookie). */
  mfaToken: string | null;
  onVerified: (session: SessionResponse) => void;
  onResent: (message: string) => void;
  onBack: () => void;
};

/** Code step: email confirmation after sign-up, or the 2-step check (app code or a recovery code). */
export function VerifyForm({ reason, email, mfaToken, onVerified, onResent, onBack }: VerifyFormProps) {
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  const isSignup = reason === "signup";
  const verifyEmail = useVerifyEmail();
  const loginMfa = useLoginMfa();
  const resend = useResendVerification();
  const pending = verifyEmail.isPending || loginMfa.isPending;
  const apiError = isSignup ? verifyEmail.error : loginMfa.error;

  // 6-digit code; a 2-step check also accepts a recovery code such as "abcde-fghjk".
  const isRecovery = !isSignup && /[a-z-]/i.test(code);
  const localError = isRecovery
    ? code.replace(/-/g, "").length < 10
      ? "Enter the whole recovery code."
      : ""
    : code.length !== 6
      ? "Enter all 6 digits."
      : "";
  const error = localError || (apiError ? fieldErrors(apiError).code || errorMessage(apiError) : "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (localError) return;
    if (isSignup) verifyEmail.mutate({ email, code }, { onSuccess: onVerified });
    else loginMfa.mutate({ mfaToken, code: code.trim().toLowerCase() }, { onSuccess: onVerified });
  };

  const onChange = (value: string) => {
    verifyEmail.reset();
    loginMfa.reset();
    setCode(isSignup ? value.replace(/\D/g, "").slice(0, 6) : value.replace(/[^0-9a-z-]/gi, "").slice(0, 16));
  };

  return (
    <>
      <form className="stack stack--16" onSubmit={submit} noValidate>
        <Field
          label={isSignup ? "Verification code" : "Authenticator code"}
          htmlFor="vf-code"
          strongLabel
          error={tried && error}
          hint={isSignup ? undefined : "Lost your phone? Enter one of your recovery codes instead."}
        >
          <input
            id="vf-code"
            className="input auth-input auth-code"
            inputMode={isSignup ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={isSignup ? 6 : 16}
            placeholder="••••••"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={tried && !!error}
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={pending}>
          {pending ? "Checking…" : isSignup ? "Verify email" : "Verify and sign in"}
        </button>
      </form>

      <div className="cluster cluster--between">
        <button type="button" className="auth-switch__link" onClick={onBack}>
          ← Back
        </button>
        {isSignup && (
          <button
            type="button"
            className="auth-switch__link"
            disabled={resend.isPending}
            onClick={() => {
              setCode("");
              setTried(false);
              resend.mutate(email, {
                onSuccess: (r) => onResent(r?.message || `New code sent to ${email}.`),
                onError: (err) => onResent(errorMessage(err)),
              });
            }}
          >
            {resend.isPending ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>
    </>
  );
}
