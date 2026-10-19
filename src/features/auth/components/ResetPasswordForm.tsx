"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useResetPassword } from "@/utils/hooks/useAuth";
import { passwordStrength } from "../lib/validation";
import { PasswordInput } from "./PasswordInput";

const STRENGTH_TONES = ["neutral", "red", "amber", "cyan", "green"] as const;

type ResetPasswordFormProps = {
  /** From the emailed link: /login?reset_token=… */
  token: string;
  onDone: () => void;
  onBack: () => void;
};

/** "Choose a new password" step. Every device is signed out afterwards. */
export function ResetPasswordForm({ token, onDone, onBack }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tried, setTried] = useState(false);
  const reset = useResetPassword();
  const strength = passwordStrength(password);

  const localError =
    password.length < 8 ? "Use at least 8 characters." : password !== confirm ? "The two passwords don’t match." : "";
  const apiError = reset.error ? fieldErrors(reset.error).newPassword || errorMessage(reset.error) : "";
  const error = localError || apiError;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (localError) return;
    reset.mutate({ token, newPassword: password }, { onSuccess: onDone });
  };

  return (
    <>
      <form className="stack stack--12" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label field__label--strong" htmlFor="rp-pw">
            New password
          </label>
          <PasswordInput
            id="rp-pw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              reset.reset();
            }}
            aria-describedby="rp-pw-meter"
          />
          <div className={`strength tone-${STRENGTH_TONES[strength.score]}`} id="rp-pw-meter">
            <div className="strength__bars" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("strength__bar", i < strength.score && "strength__bar--on")} />
              ))}
            </div>
            <span className="strength__label">{strength.label}</span>
          </div>
        </div>
        <div className="field">
          <label className="field__label field__label--strong" htmlFor="rp-pw2">
            Confirm new password
          </label>
          <PasswordInput
            id="rp-pw2"
            autoComplete="new-password"
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={tried && !!error}
          />
          {tried && error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={reset.isPending}>
          {reset.isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
      <button type="button" className="auth-switch__link auth-back" onClick={onBack}>
        ← Back to sign in
      </button>
    </>
  );
}
