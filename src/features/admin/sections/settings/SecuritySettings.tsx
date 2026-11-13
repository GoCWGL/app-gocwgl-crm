"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Input, LoadState, Toggle } from "@/components/ui";
import { copyToClipboard, toTextDataUrl } from "@/lib/utils";
import type { DeviceSessionOut } from "@/utils/api/models";
import { useSignOutConfirm } from "@/features/auth/components/SignOutConfirm";
import { formatRelative } from "@/utils/format/dates";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import {
  useChangePassword,
  useConfirmTotp,
  useDisableTotp,
  useMfaStatus,
  useRevokeSession,
  useSessions,
  useStartTotp,
} from "@/utils/hooks/useAuth";

const PASSWORD_FIELDS = [
  { key: "current", label: "Current password", autoComplete: "current-password" },
  { key: "next", label: "New password", autoComplete: "new-password" },
  { key: "confirm", label: "Confirm new password", autoComplete: "new-password" },
] as const;

type PasswordKey = (typeof PASSWORD_FIELDS)[number]["key"];

export function SecuritySettings({ onMessage, promptMfa }: { onMessage: (message: string) => void; promptMfa?: boolean }) {
  return (
    <div className="stack stack--16">
      {promptMfa && (
        <div className="notice notice--warning" role="status">
          Team accounts need 2-step verification. Turn it on below to keep your account safe.
        </div>
      )}
      <PasswordForm onMessage={onMessage} />
      <TwoStep onMessage={onMessage} />
      <Devices onMessage={onMessage} />
    </div>
  );
}

// ------------------------------------------------------------------ Password
function PasswordForm({ onMessage }: { onMessage: (message: string) => void }) {
  const [passwords, setPasswords] = useState<Record<PasswordKey, string>>({ current: "", next: "", confirm: "" });
  // Each problem shows under its own field; anything else under the form.
  const [errors, setErrors] = useState<Partial<Record<PasswordKey | "form", string>>>({});
  const change = useChangePassword();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found: Partial<Record<PasswordKey, string>> = {};
    if (!passwords.current) found.current = "Enter your current password.";
    if (passwords.next.length < 8) found.next = "Use at least 8 characters.";
    if (passwords.confirm !== passwords.next) found.confirm = "This doesn't match the new password.";
    setErrors(found);
    if (Object.keys(found).length) return;
    change.mutate(
      { currentPassword: passwords.current, newPassword: passwords.next },
      {
        onSuccess: () => {
          setPasswords({ current: "", next: "", confirm: "" });
          onMessage("Password updated. Your other devices were signed out.");
        },
        onError: (err) => {
          const f = fieldErrors(err);
          if (f.currentPassword || hasCode(err, "invalid_password")) setErrors({ current: f.currentPassword || errorMessage(err) });
          else if (f.newPassword) setErrors({ next: f.newPassword });
          else setErrors({ form: errorMessage(err) });
        },
      },
    );
  };

  return (
    <form className="stack stack--12 security-form" onSubmit={submit} noValidate>
      <span className="text-strong">Change password</span>
      {PASSWORD_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} htmlFor={`pw-${f.key}`} error={errors[f.key]}>
          <Input
            id={`pw-${f.key}`}
            type="password"
            autoComplete={f.autoComplete}
            aria-invalid={errors[f.key] ? true : undefined}
            value={passwords[f.key]}
            onChange={(e) => {
              setPasswords({ ...passwords, [f.key]: e.target.value });
              setErrors((x) => ({ ...x, [f.key]: undefined, form: undefined }));
            }}
          />
        </Field>
      ))}
      {errors.form && (
        <p className="text-error" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" className="u-self-start u-strong" disabled={change.isPending}>
        {change.isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------ 2-step verification (TOTP)
type Step = { kind: "idle" } | { kind: "password"; action: "enable" | "disable" } | { kind: "scan"; secret: string; uri: string } | { kind: "codes"; codes: string[] };

function TwoStep({ onMessage }: { onMessage: (message: string) => void }) {
  const status = useMfaStatus();
  const start = useStartTotp();
  const confirm = useConfirmTotp();
  const disable = useDisableTotp();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const enabled = !!status.data?.enabled;
  const reset = () => {
    setStep({ kind: "idle" });
    setPassword("");
    setCode("");
    start.reset();
    confirm.reset();
    disable.reset();
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== "password") return;
    if (step.action === "enable") {
      start.mutate(password || null, {
        onSuccess: (r) => {
          setPassword("");
          setStep({ kind: "scan", secret: r.secret, uri: r.otpauthUri });
        },
      });
    } else {
      disable.mutate(
        { password: password || null, code },
        {
          onSuccess: () => {
            reset();
            onMessage("Two-step verification turned off.");
          },
        },
      );
    }
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    confirm.mutate(code, {
      onSuccess: (r) => {
        setCode("");
        setStep({ kind: "codes", codes: r.recoveryCodes });
        onMessage("Two-step verification turned on.");
      },
    });
  };

  return (
    <div className="stack stack--12">
      <div className="inset security-row">
        <div className="stack stack--2 u-grow">
          <span className="text-strong">Two-step verification</span>
          <span className="text-small">
            Ask for a code from your phone when signing in on a new device.
            {enabled && status.data && ` · ${status.data.recoveryCodesLeft} recovery codes left`}
          </span>
        </div>
        <LoadState query={status} inline loadingText="">
          <Toggle
            label="Two-step verification"
            checked={enabled}
            onChange={(on) => {
              reset();
              setStep({ kind: "password", action: on ? "enable" : "disable" });
            }}
          />
        </LoadState>
      </div>

      {step.kind === "password" && (
        <form className="stack stack--12 security-form" onSubmit={submitPassword}>
          <Field label="Confirm your password" htmlFor="mfa-pw" hint="Leave empty if you only sign in with Google or Microsoft.">
            <Input id="mfa-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {step.action === "disable" && (
            <Field label="Code from your authenticator app" htmlFor="mfa-off-code">
              <Input
                id="mfa-off-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                mono
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Field>
          )}
          <FormError error={start.error ?? disable.error} />
          <div className="cluster">
            <Button type="submit" variant="primary" disabled={start.isPending || disable.isPending || (step.action === "disable" && code.length !== 6)}>
              {step.action === "enable" ? "Continue" : "Turn off 2-step"}
            </Button>
            <Button onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {step.kind === "scan" && (
        <form className="stack stack--12 security-form" onSubmit={submitCode}>
          <span className="text-strong">Scan this QR code with your authenticator app</span>
          <QRCodeSVG value={step.uri} size={168} marginSize={2} title="Authenticator QR code" />
          <span className="text-small">
            Can’t scan it? Enter this key instead: <span className="mono u-strong">{step.secret}</span>
          </span>
          <Field label="6-digit code from the app" htmlFor="mfa-code">
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              mono
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <FormError error={confirm.error} />
          <div className="cluster">
            <Button type="submit" variant="primary" disabled={code.length !== 6 || confirm.isPending}>
              {confirm.isPending ? "Checking…" : "Turn on 2-step"}
            </Button>
            <Button onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {step.kind === "codes" && (
        <div className="stack stack--12 security-form">
          <div className="notice notice--warning" role="status">
            Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. They won’t be shown again.
          </div>
          <div className="mono recovery-codes">
            {step.codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="cluster">
            <Button onClick={() => (copyToClipboard(step.codes.join("\n")), onMessage("Recovery codes copied."))}>Copy</Button>
            <a className="btn btn--secondary" href={toTextDataUrl(step.codes.join("\n"))} download="gocwgl-recovery-codes.txt">
              Download
            </a>
            <Button variant="primary" onClick={reset}>
              I saved them
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Signed-in devices
function deviceName(s: DeviceSessionOut): string {
  const ua = s.userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function Devices({ onMessage }: { onMessage: (message: string) => void }) {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const everywhere = useSignOutConfirm({ everywhere: true });

  return (
    <div className="stack stack--6 security-devices">
      <div className="cluster cluster--between">
        <span className="text-strong">Signed-in devices</span>
        <Button
          size="sm"
          variant="danger"
          disabled={everywhere.pending}
          onClick={everywhere.ask}
        >
          Sign out everywhere
        </Button>
        {everywhere.dialog}
      </div>
      <FormError error={revoke.error} />
      <LoadState query={sessions} isEmpty={!sessions.data?.length} empty="No other devices.">
        {sessions.data?.map((d) => (
          <div className="list-row list-row--nowrap" key={d.id}>
            <span className="u-grow">
              <span className="u-strong">{deviceName(d)}</span>{" "}
              <span className="u-muted">
                · {d.current ? "This device" : d.ipAddress} · {d.authMethod}
              </span>
            </span>
            <span className={d.current ? "text-small u-strong u-green" : "text-small u-strong"}>
              {d.current ? "Active now" : formatRelative(d.lastUsedAt)}
            </span>
            {!d.current && (
              <Button
                size="sm"
                variant="danger"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(d.id, { onSuccess: () => onMessage("Device signed out.") })}
              >
                Sign out
              </Button>
            )}
          </div>
        ))}
      </LoadState>
    </div>
  );
}
