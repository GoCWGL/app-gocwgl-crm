"use client";

import { useState, type KeyboardEvent } from "react";
import { Badge, Button, Checkbox, Field, Icon, PasswordInput } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { copyToClipboard, generatePassword } from "@/lib/utils";
import type { ContactOut, PortalLoginOut } from "@/utils/api/models";
import { canWriteCrm, isStaffAdmin } from "@/utils/auth/session";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { usePortalLogin, useSendPasswordReset, useSendPortalInvite, useSetContactPassword } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

const STATUS: Record<PortalLoginOut["status"], { label: string; tone: Tone }> = {
  active: { label: "CAN SIGN IN", tone: "green" },
  invited: { label: "INVITE SENT", tone: "amber" },
  disabled: { label: "LOGIN REMOVED", tone: "slate" },
  none: { label: "NO LOGIN YET", tone: "slate" },
  taken: { label: "EMAIL IN USE", tone: "amber" },
};

function statusText(login: PortalLoginOut): string {
  if (login.status === "active") {
    const last = login.lastLoginAt ? `Last signed in ${formatRelative(login.lastLoginAt)}` : "Hasn’t signed in yet";
    return `${last} · password set ${formatShort(login.passwordChangedAt, "—")}`;
  }
  if (login.status === "invited") return `Waiting for them to accept · the invite expires ${formatShort(login.inviteExpiresAt)}`;
  if (login.status === "taken") return `${login.email} is already a team member’s (or another client’s) login.`;
  if (login.status === "disabled") return "Their login was removed. Setting a password turns it back on.";
  return "Set a password for them, or email them an invite to choose their own.";
}

/** The contact's own client-portal login: set their password, email a reset link, or invite them. */
export function PortalLoginCard({ contact: c }: { contact: ContactOut }) {
  const { update } = useAdmin();
  const me = useMe().data;
  const canWrite = canWriteCrm(me);
  const isAdmin = isStaffAdmin(me);
  const login = usePortalLogin(c.id);
  const setPassword = useSetContactPassword();
  const reset = useSendPasswordReset();
  const invite = useSendPortalInvite();

  const [open, setOpen] = useState(false);
  const [password, setPw] = useState("");
  const [notify, setNotify] = useState(true);
  const [copied, setCopied] = useState(false);

  const data = login.data;
  const status = data ? STATUS[data.status] : null;
  const hasLogin = data?.status === "active";
  // The email signs in as someone else: a reset link is still safe (only that inbox can use it), setting a password is not.
  const taken = data?.status === "taken";
  const busy = setPassword.isPending || reset.isPending || invite.isPending;
  const error = setPassword.error ?? reset.error ?? invite.error;

  const clearErrors = () => [setPassword, reset, invite].forEach((m) => m.isError && m.reset());

  const close = () => {
    setOpen(false);
    setPw("");
    setCopied(false);
    setPassword.reset();
  };

  const save = () => {
    if (!password) return;
    setPassword.mutate(
      { id: c.id, password, notify: !hasLogin && notify },
      {
        onSuccess: () => {
          close();
          update({
            toast: hasLogin
              ? `${c.email}’s password was changed and their devices were signed out.`
              : `${c.email} can now sign in to their portal${notify ? " — we emailed them that it’s ready." : "."}`,
          });
        },
      },
    );
  };

  // This card sits inside the profile form: Enter saves the password, not the whole profile.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const generate = () => {
    setPw(generatePassword());
    setCopied(false);
    setPassword.reset();
  };

  if (!canWrite) return null;

  return (
    <div className="inset portal-login">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-cyan" aria-hidden="true">
          <Icon name="lock" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">PORTAL LOGIN</span>
          <span className="text-tiny">{data ? statusText(data) : login.isError ? errorMessage(login.error) : "Checking their login…"}</span>
        </span>
        {status && (
          <Badge tone={status.tone} mono>
            {status.label}
          </Badge>
        )}
      </div>

      {data && !open && (
        <div className="cluster cluster--8">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || taken}
              title={taken ? "This would change the password of the account that already uses this email." : undefined}
              onClick={() => {
                clearErrors();
                setOpen(true);
              }}
            >
              <Icon name="lock" size={13} />
              {hasLogin ? "Set new password" : "Set a password"}
            </Button>
          )}
          {hasLogin || taken ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                clearErrors();
                reset.mutate(c.id, { onSuccess: () => update({ toast: `Password reset link sent to ${c.email}.` }) });
              }}
            >
              <Icon name="mail" size={13} />
              {reset.isPending ? "Sending…" : "Send password reset link"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                clearErrors();
                invite.mutate(c.id, { onSuccess: () => update({ toast: `Portal invite sent to ${c.email}.` }) });
              }}
            >
              <Icon name="mail" size={13} />
              {invite.isPending ? "Sending…" : data.status === "invited" ? "Resend portal invite" : "Email a portal invite"}
            </Button>
          )}
        </div>
      )}

      {taken && !open && (
        <span className="text-tiny">
          To set a password here, give this contact their own email first. A reset link goes to {data.email} and lets that person choose a new
          password.
        </span>
      )}

      {open && (
        <div className="stack stack--8">
          <Field
            label={hasLogin ? "New password" : "Password"}
            htmlFor="pl-password"
            hint={`They sign in with ${c.email}. At least 8 characters.`}
            error={fieldErrors(setPassword.error).password}
          >
            <div className="portal-login__password">
              <PasswordInput
                id="pl-password"
                autoComplete="new-password"
                value={password}
                aria-invalid={setPassword.isError || undefined}
                onKeyDown={onKeyDown}
                onChange={(e) => {
                  setPw(e.target.value);
                  setCopied(false);
                  if (setPassword.isError) setPassword.reset();
                }}
              />
              <Button size="sm" onClick={generate}>
                Generate
              </Button>
              <Button
                size="sm"
                disabled={!password}
                onClick={() => {
                  copyToClipboard(password);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </Field>
          {hasLogin ? (
            <span className="text-tiny">Their current password stops working and they’re signed out on every device. We email them that it changed.</span>
          ) : (
            <Checkbox brand label="Email them that their portal is ready (the password isn’t included)" checked={notify} onChange={() => setNotify(!notify)} />
          )}
          <div className="cluster cluster--8">
            <Button size="sm" onClick={close}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" disabled={!password || setPassword.isPending} onClick={save}>
              {setPassword.isPending ? "Saving…" : hasLogin ? "Save new password" : "Create login"}
            </Button>
          </div>
        </div>
      )}

      {!!error && !fieldErrors(error).password && (
        <p className="text-error text-small" role="alert">
          {errorMessage(error)}
        </p>
      )}
    </div>
  );
}
