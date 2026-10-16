"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import type { VerifyReason } from "../types";

type VerifyFormProps = {
  reason: VerifyReason;
  onVerified: () => void;
  onResend: () => void;
  onBack: () => void;
};

/** 6-digit code step: email confirmation after sign-up, or an admin's 2-step check. */
export function VerifyForm({ reason, onVerified, onResend, onBack }: VerifyFormProps) {
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  const error = code.length !== 6 ? "Enter all 6 digits." : "";
  const isSignup = reason === "signup";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error) return setTried(true);
    onVerified();
  };

  return (
    <>
      <form className="stack stack--16" onSubmit={submit} noValidate>
        <Field
          label={isSignup ? "Verification code" : "Authenticator code"}
          htmlFor="vf-code"
          strongLabel
          error={tried && error}
          hint="Demo: any 6 digits work."
        >
          <input
            id="vf-code"
            className="input auth-input auth-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={tried && !!error}
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit">
          {isSignup ? "Verify email" : "Verify and sign in"}
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
            onClick={() => {
              setCode("");
              setTried(false);
              onResend();
            }}
          >
            Resend code
          </button>
        )}
      </div>
    </>
  );
}
