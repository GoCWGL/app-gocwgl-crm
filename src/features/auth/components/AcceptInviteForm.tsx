"use client";

import { useState, type FormEvent } from "react";
import { Field, Loading } from "@/components/ui";
import { formatLong } from "@/utils/format/dates";
import type { SessionResponse } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useAcceptInvitation, usePreviewInvitation } from "@/utils/hooks/useAuth";
import { PasswordInput } from "@/components/ui";

type AcceptInviteFormProps = {
  /** From the emailed link: /login?invite=… */
  token: string;
  onAccepted: (session: SessionResponse) => void;
  onBack: () => void;
};

/** Accept an invitation: show who it's for, then set a name and password. */
export function AcceptInviteForm({ token, onAccepted, onBack }: AcceptInviteFormProps) {
  const preview = usePreviewInvitation(token);
  const accept = useAcceptInvitation();
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  if (preview.isPending) return <Loading text="Checking your invitation…" />;
  if (preview.isError) {
    return (
      <>
        <div className="notice notice--warning" role="alert">
          <span className="u-strong" aria-hidden="true">
            !
          </span>
          <span>{errorMessage(preview.error, "This invitation link is no longer valid.")}</span>
        </div>
        <button type="button" className="auth-switch__link auth-back" onClick={onBack}>
          ← Back to sign in
        </button>
      </>
    );
  }

  const invite = preview.data;
  const fullName = name ?? invite.fullName;
  const api = fieldErrors(accept.error);
  const nameErr = !fullName.trim() ? "Enter your full name." : api.fullName || "";
  const passwordErr = password.length < 8 ? "Use at least 8 characters." : api.password || "";
  const generalErr = accept.error && !api.fullName && !api.password ? errorMessage(accept.error) : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!fullName.trim() || password.length < 8) return;
    accept.mutate({ token, fullName: fullName.trim(), password }, { onSuccess: onAccepted });
  };

  return (
    <>
      <div className="notice notice--info" role="status">
        <span className="u-strong" aria-hidden="true">
          i
        </span>
        <span>
          Invitation for <strong>{invite.email}</strong> · expires {formatLong(invite.expiresAt)}
        </span>
      </div>
      <form className="stack stack--12" onSubmit={submit} noValidate>
        <Field label="Full name" htmlFor="ai-name" strongLabel error={tried && nameErr}>
          <input
            id="ai-name"
            className="input auth-input"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={tried && !!nameErr}
          />
        </Field>
        <div className="field">
          <label className="field__label field__label--strong" htmlFor="ai-pw">
            Choose a password
          </label>
          <PasswordInput
            className="auth-input"
            id="ai-pw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              accept.reset();
            }}
            aria-invalid={tried && !!passwordErr}
          />
          {tried && (passwordErr || generalErr) && (
            <span className="field__error" role="alert">
              {passwordErr || generalErr}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn--primary btn--lg btn--block auth-submit" disabled={accept.isPending}>
          {accept.isPending ? "Setting up your account…" : "Accept invitation"}
        </button>
      </form>
      <button type="button" className="auth-switch__link auth-back" onClick={onBack}>
        ← Back to sign in
      </button>
    </>
  );
}
