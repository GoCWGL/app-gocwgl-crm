"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import { emailError } from "../lib/validation";

type ForgotFormProps = {
  initialEmail: string;
  /** Called with the address the reset link was sent to. */
  onSent: (email: string) => void;
  onBack: () => void;
};

export function ForgotForm({ initialEmail, onSent, onBack }: ForgotFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const error = emailError(email);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error) return setTried(true);
    setTried(false);
    setSent(true);
    onSent(email.trim());
  };

  return (
    <>
      <form className="stack stack--16" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="fg-email" strongLabel error={tried && error}>
          <input
            id="fg-email"
            className="input auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={tried && !!error}
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit">
          {sent ? "Send again" : "Send reset link"}
        </button>
      </form>
      <button type="button" className="auth-switch__link auth-back" onClick={onBack}>
        ← Back to sign in
      </button>
    </>
  );
}
