"use client";

import { useState, type FormEvent } from "react";
import { Checkbox, Field } from "@/components/ui";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CLIENT_EMAIL, SSO_PROVIDERS } from "@/data/auth";
import { toneClass } from "@/lib/tones";
import { emailError, isAdminEmail } from "../lib/validation";
import { PasswordInput } from "./PasswordInput";

type LoginFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  /** Called with the signed-in email once the password is accepted. */
  onAdminSignIn: (email: string) => void;
  onClientSignIn: (email: string) => void;
  onForgot: () => void;
  onSignup: () => void;
};

export function LoginForm({ email, onEmailChange, onAdminSignIn, onClientSignIn, onForgot, onSignup }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [tried, setTried] = useState(false);
  const [wrongPassword, setWrongPassword] = useState("");

  const emailErr = emailError(email);
  const passwordErr = !password
    ? "Enter your password."
    : wrongPassword && wrongPassword === password
      ? "Incorrect password. Try again or reset it."
      : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (emailErr || passwordErr) return setTried(true);
    if (isAdminEmail(email) && password !== DEMO_ADMIN_PASSWORD) {
      setTried(true);
      setWrongPassword(password);
      return;
    }
    if (isAdminEmail(email)) onAdminSignIn(email);
    else onClientSignIn(email);
  };

  // SSO is simulated: it signs in with the typed email, or the demo client.
  const signInWithProvider = () => {
    const chosen = email.trim() || DEMO_CLIENT_EMAIL;
    onEmailChange(chosen);
    if (isAdminEmail(chosen)) onAdminSignIn(chosen);
    else onClientSignIn(chosen);
  };

  const showEmailErr = tried && !!emailErr;
  const showPasswordErr = tried && !!passwordErr;

  return (
    <>
      <form className="stack stack--12" onSubmit={submit} noValidate>
        <div className="auth-sso">
          {SSO_PROVIDERS.map((p) => (
            <button key={p.label} type="button" className="auth-sso__button" onClick={signInWithProvider}>
              <span className={`auth-sso__mark ${toneClass(p.tone)}`} aria-hidden="true">
                {p.mark}
              </span>
              {p.label}
            </button>
          ))}
        </div>

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
            id="li-pw"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={showPasswordErr}
          />
          {showPasswordErr && (
            <span className="field__error" role="alert">
              {passwordErr}
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

        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit">
          Sign in
        </button>
        <span className="auth-demo-hint">
          Demo admin: <span className="mono">{DEMO_ADMIN_EMAIL}</span> · password{" "}
          <span className="mono">{DEMO_ADMIN_PASSWORD}</span>
        </span>
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
