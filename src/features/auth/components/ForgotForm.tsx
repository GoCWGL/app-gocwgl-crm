"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import { errorMessage } from "@/utils/errors";
import { useForgotPassword } from "@/utils/hooks/useAuth";
import { emailError } from "../lib/validation";

type ForgotFormProps = {
  initialEmail: string;
  /** Called with the API's answer (the same whether or not the account exists). */
  onSent: (message: string) => void;
  onBack: () => void;
};

export function ForgotForm({ initialEmail, onSent, onBack }: ForgotFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();
  const error = emailError(email) || (forgot.error ? errorMessage(forgot.error) : "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (emailError(email)) return setTried(true);
    setTried(false);
    forgot.mutate(email.trim(), {
      onSuccess: (r) => {
        setSent(true);
        onSent(r?.message || `If ${email.trim()} has an account, a reset link is on its way.`);
      },
      onError: () => setTried(true),
    });
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
            onChange={(e) => {
              setEmail(e.target.value);
              forgot.reset();
            }}
            aria-invalid={tried && !!error}
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={forgot.isPending}>
          {forgot.isPending ? "Sending…" : sent ? "Send again" : "Send reset link"}
        </button>
      </form>
      <button type="button" className="auth-switch__link auth-back" onClick={onBack}>
        ← Back to sign in
      </button>
    </>
  );
}
