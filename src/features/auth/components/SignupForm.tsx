"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui";
import { cn } from "@/lib/utils";
import { emailError, passwordStrength } from "../lib/validation";
import type { SignupData } from "../types";
import { PasswordInput } from "./PasswordInput";

type SignupFormProps = {
  data: SignupData;
  onChange: (patch: Partial<SignupData>) => void;
  onCreated: () => void;
  onLogin: () => void;
};

type TextFieldKey = "name" | "business" | "email" | "phone" | "invite";

const TEXT_FIELDS: Array<{
  key: TextFieldKey;
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  hint?: string;
  mono?: boolean;
}> = [
  { key: "name", id: "su-name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Aisha Rahman" },
  { key: "business", id: "su-biz", label: "Business name", type: "text", autoComplete: "organization", placeholder: "Rahman Wellness" },
  { key: "email", id: "su-email", label: "Work email", type: "email", autoComplete: "email", placeholder: "you@business.com" },
  { key: "phone", id: "su-phone", label: "Phone (optional)", type: "tel", autoComplete: "tel", placeholder: "+1 555 010 2030" },
  {
    key: "invite",
    id: "su-inv",
    label: "Invite code",
    type: "text",
    autoComplete: "off",
    placeholder: "GO-XXXX",
    hint: "(optional, from your welcome email)",
    mono: true,
  },
];

const STRENGTH_TONES = ["neutral", "red", "amber", "cyan", "green"] as const;

function validate(data: SignupData): Record<TextFieldKey | "password", string> {
  return {
    name: data.name.trim() ? "" : "Enter your full name.",
    business: data.business.trim() ? "" : "Enter your business name.",
    email: emailError(data.email),
    phone: data.phone && data.phone.replace(/\D/g, "").length < 7 ? "That phone number looks too short." : "",
    invite: "",
    password: data.password.length < 8 ? "Use at least 8 characters." : "",
  };
}

export function SignupForm({ data, onChange, onCreated, onLogin }: SignupFormProps) {
  const [tried, setTried] = useState(false);
  const errors = validate(data);
  const strength = passwordStrength(data.password);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(Boolean) || !data.agree) return setTried(true);
    onCreated();
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
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
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
            id="su-pw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
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
            I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </span>
        </label>
        {tried && !data.agree && <span className="field__error">Please accept the terms to continue.</span>}

        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit">
          Create my account
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
