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
  const [remember, setRemember] = useState(false);
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
              {p.id === "google" ? (
                <GoogleLogo />
              ) : (
                <span className={`auth-sso__mark ${toneClass(p.tone)}`} aria-hidden="true">
                  {p.mark}
                </span>
              )}
              {p.id === "google" ? "Continue with Google" : p.label}
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

/** Google's multicolour "G", as its sign-in branding guidelines ask for on Google sign-in buttons. */
function GoogleLogo() {
  return (
    <svg className="auth-sso__logo" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
