"use client";

import { useState, type FormEvent } from "react";
import { Checkbox, Field } from "@/components/ui";
import { SSO_PROVIDERS } from "@/data/auth";
import { toneClass } from "@/lib/tones";
import { startOAuth, type LoginResult } from "@/utils/api/auth";
import type { SessionResponse } from "@/utils/api/models";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useLogin } from "@/utils/hooks/useAuth";
import { emailError } from "../lib/validation";
import { PasswordInput } from "@/components/ui";

type LoginFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  /** Password accepted and no 2-step check needed. */
  onSignedIn: (session: SessionResponse) => void;
  /** Password accepted; the account has 2-step turned on. */
  onMfaRequired: (mfaToken: string) => void;
  /** The email isn't confirmed yet; the API just sent a new code. */
  onEmailNotVerified: (email: string, message: string) => void;
  onForgot: () => void;
  onSignup: () => void;
};

export function LoginForm({ email, onEmailChange, onSignedIn, onMfaRequired, onEmailNotVerified, onForgot, onSignup }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [tried, setTried] = useState(false);
  const [ssoError, setSsoError] = useState("");
  const login = useLogin();

  const apiFields = fieldErrors(login.error);
  const emailErr = emailError(email) || apiFields.email || "";
  const passwordErr = !password ? "Enter your password." : apiFields.password || "";
  // Any other failure (wrong password, locked out, too many tries) shows the API's message under the password.
  const generalErr =
    login.error && !apiFields.email && !apiFields.password && !hasCode(login.error, "email_not_verified")
      ? errorMessage(login.error)
      : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (emailError(email) || !password) return;
    login.mutate(
      { email: email.trim(), password, remember },
      {
        onSuccess: (result: LoginResult) => {
          if (result.status === "mfa_required") onMfaRequired(result.mfaToken);
          else onSignedIn(result as SessionResponse);
        },
        onError: (error) => {
          if (hasCode(error, "email_not_verified")) onEmailNotVerified(email.trim(), errorMessage(error));
        },
      },
    );
  };

  // SSO is a full-page navigation: the API sends the browser to the provider and back to /login?oauth=…
  const signInWithProvider = (provider: "google" | "microsoft") => {
    setSsoError("");
    startOAuth(provider, remember).catch((err) => setSsoError(errorMessage(err)));
  };

  const showEmailErr = tried && !!emailErr;
  const showPasswordErr = tried && !!(passwordErr || generalErr);

  return (
    <>
      <form className="stack stack--12" onSubmit={submit} noValidate>
        <div className="auth-sso">
          {SSO_PROVIDERS.map((p) => (
            <button key={p.id} type="button" className="auth-sso__button" onClick={() => signInWithProvider(p.id)}>
              <span className={`auth-sso__mark ${toneClass(p.tone)}`} aria-hidden="true">
                {p.mark}
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {ssoError && (
          <span className="field__error" role="alert">
            {ssoError}
          </span>
        )}

        <div className="auth-divider" aria-hidden="true">
          OR WITH EMAIL
        </div>

        <Field label="Email" htmlFor="li-email" strongLabel error={showEmailErr && emailErr}>
          <input
            id="li-email"
            className="input auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            aria-invalid={showEmailErr}
          />
        </Field>

        <div className="field">
          <div className="auth-label-row">
            <label className="field__label field__label--strong" htmlFor="li-pw">
              Password
            </label>
            <button type="button" className="btn btn--link" onClick={onForgot}>
              Forgot password?
            </button>
          </div>
          <PasswordInput
            className="auth-input"
            id="li-pw"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (login.isError) login.reset();
            }}
            aria-invalid={showPasswordErr}
          />
          {showPasswordErr && (
            <span className="field__error" role="alert">
              {passwordErr || generalErr}
            </span>
          )}
        </div>

        <Checkbox
          brand
          className="auth-check"
          label="Keep me signed in for 30 days"
          checked={remember}
          onChange={() => setRemember((v) => !v)}
        />

        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        New client?{" "}
        <button type="button" className="auth-switch__link" onClick={onSignup}>
          Create an account
        </button>
      </p>
    </>
  );
}
