"use client";

import { useRef, useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import { cn } from "@/lib/utils";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useRegister } from "@/utils/hooks/useAuth";
import { emailError, passwordStrength } from "../lib/validation";
import type { SignupData } from "../types";
import { useBotCheck } from "./useBotCheck";
import { PasswordInput } from "@/components/ui";

type SignupFormProps = {
  data: SignupData;
  onChange: (patch: Partial<SignupData>) => void;
  /** The API accepted the sign-up (always the same answer) and sent a code to the email. */
  onCreated: (message: string) => void;
  onLogin: () => void;
};

type TextFieldKey = "firstName" | "lastName" | "business" | "email" | "phone" | "referral";

const TEXT_FIELDS: Array<{
  key: TextFieldKey;
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  hint?: string;
  mono?: boolean;
  /** Takes the whole row instead of sharing it. */
  full?: boolean;
}> = [
  { key: "firstName", id: "su-first", label: "First name", type: "text", autoComplete: "given-name", placeholder: "Aisha" },
  { key: "lastName", id: "su-last", label: "Last name", type: "text", autoComplete: "family-name", placeholder: "Rahman" },
  { key: "business", id: "su-biz", label: "Business name", type: "text", autoComplete: "organization", placeholder: "Rahman Wellness", full: true },
  { key: "email", id: "su-email", label: "Work email", type: "email", autoComplete: "email", placeholder: "you@business.com", full: true },
  { key: "phone", id: "su-phone", label: "Phone (optional)", type: "tel", autoComplete: "tel", placeholder: "+1 555 010 2030", full: true },
  {
    key: "referral",
    id: "su-ref",
    label: "Referral ID",
    type: "text",
    autoComplete: "off",
    placeholder: "K7M2-Q9XA",
    hint: "(optional, from the client who referred you)",
    mono: true,
    full: true,
  },
];

const STRENGTH_TONES = ["neutral", "red", "amber", "cyan", "green"] as const;

function validate(data: SignupData): Record<TextFieldKey | "password", string> {
  return {
    firstName: data.firstName.trim() ? "" : "Enter your first name.",
    lastName: data.lastName.trim() ? "" : "Enter your last name.",
    business: data.business.trim() ? "" : "Enter your business name.",
    email: emailError(data.email),
    phone: data.phone && data.phone.replace(/\D/g, "").length < 7 ? "That phone number looks too short." : "",
    referral: "",
    password: data.password.length < 8 ? "Use at least 8 characters." : "",
  };
}

export function SignupForm({ data, onChange, onCreated, onLogin }: SignupFormProps) {
  const [tried, setTried] = useState(false);
  const register = useRegister();
  const bot = useBotCheck("register");
  const honeypot = useRef("");
  const local = validate(data);
  const api = fieldErrors(register.error);
  // 422 field errors from the API sit next to the matching fields.
  const errors: Record<TextFieldKey | "password", string> = {
    firstName: local.firstName || api.firstName || api.fullName || "",
    lastName: local.lastName || api.lastName || "",
    business: local.business || api.business || "",
    email: local.email || api.email || "",
    phone: local.phone || api.phone || "",
    referral: local.referral || api.referralCode || "",
    password: local.password || api.password || "",
  };
  const generalError =
    register.error && !Object.keys(api).length ? errorMessage(register.error) : "";
  const strength = passwordStrength(data.password);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(local).some(Boolean) || !data.agree || !bot.ready) return;
    register.mutate(
      {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        business: data.business.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        referralCode: data.referral.trim() || null,
        agree: true,
        captchaToken: bot.token,
        website: honeypot.current,
      },
      // Each bot-check token works once.
      { onSuccess: (r) => onCreated(r?.message ?? ""), onSettled: bot.reset },
    );
  };

  const change = (patch: Partial<SignupData>) => {
    if (register.isError) register.reset();
    onChange(patch);
  };

  return (
    <>
      <form className="stack stack--10" onSubmit={submit} noValidate>
        <div className="form-grid form-grid--narrow">
          {TEXT_FIELDS.map((f) => {
            const error = tried ? errors[f.key] : "";
            return (
              <Field
                key={f.key}
                className={cn(f.full && "form-grid__full")}
                htmlFor={f.id}
                strongLabel
                error={error}
                label={
                  <>
                    {f.label} {f.hint && <span className="auth-label-hint">{f.hint}</span>}
                  </>
                }
              >
                <input
                  id={f.id}
                  className={cn("input auth-input", f.mono && "input--mono")}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  value={data[f.key]}
                  onChange={(e) => change({ [f.key]: e.target.value })}
                  aria-invalid={!!error}
                />
              </Field>
            );
          })}
        </div>

        <div className="field">
          <label className="field__label field__label--strong" htmlFor="su-pw">
            Password
          </label>
          <PasswordInput
            className="auth-input"
            id="su-pw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={data.password}
            onChange={(e) => change({ password: e.target.value })}
            aria-invalid={tried && !!errors.password}
            aria-describedby="su-pw-meter"
          />
          <div className={`strength tone-${STRENGTH_TONES[strength.score]}`} id="su-pw-meter">
            <div className="strength__bars" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("strength__bar", i < strength.score && "strength__bar--on")} />
              ))}
            </div>
            <span className="strength__label">{strength.label}</span>
          </div>
          {tried && errors.password && (
            <span className="field__error" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        <label className="auth-agree">
          <input
            type="checkbox"
            checked={data.agree}
            onChange={() => onChange({ agree: !data.agree })}
            aria-invalid={tried && !data.agree}
          />
          <span>
            {/* New tab, so a half-filled form is not lost. */}
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {tried && !data.agree && <span className="field__error">Please accept the terms to continue.</span>}

        {/* Honeypot: hidden from people; bots fill it in and the API turns them away. */}
        <input
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="website"
          onChange={(e) => (honeypot.current = e.target.value)}
        />

        {bot.widget}
        {tried && !bot.ready && <span className="field__error">{bot.message}</span>}

        {tried && generalError && (
          <span className="field__error" role="alert">
            {generalError}
          </span>
        )}

        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={register.isPending}>
          {register.isPending ? "Creating your account…" : "Create my account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="auth-switch__link" onClick={onLogin}>
          Sign in
        </button>
      </p>
    </>
  );
}
