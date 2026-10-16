"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Toggle } from "@/components/ui";
import { SIGNED_IN_DEVICES } from "@/data/admin";

const PASSWORD_FIELDS = [
  { key: "current", label: "Current password", autoComplete: "current-password" },
  { key: "next", label: "New password", autoComplete: "new-password" },
  { key: "confirm", label: "Confirm new password", autoComplete: "new-password" },
] as const;

type PasswordKey = (typeof PASSWORD_FIELDS)[number]["key"];

export function SecuritySettings({ onMessage }: { onMessage: (message: string) => void }) {
  const [passwords, setPasswords] = useState<Record<PasswordKey, string>>({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!passwords.current) return setError("Enter your current password.");
    if (passwords.next.length < 8) return setError("New password needs at least 8 characters.");
    if (passwords.next !== passwords.confirm) return setError("The new passwords do not match.");
    setPasswords({ current: "", next: "", confirm: "" });
    onMessage("Password updated.");
  };

  return (
    <div className="stack stack--16">
      <form className="stack stack--12 security-form" onSubmit={changePassword}>
        <span className="text-strong">Change password</span>
        {PASSWORD_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`pw-${f.key}`}>
            <Input
              id={`pw-${f.key}`}
              type="password"
              autoComplete={f.autoComplete}
              value={passwords[f.key]}
              onChange={(e) => {
                setPasswords({ ...passwords, [f.key]: e.target.value });
                setError("");
              }}
            />
          </Field>
        ))}
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="u-self-start u-strong">
          Update password
        </Button>
      </form>

      <div className="inset security-row">
        <div className="stack stack--2 u-grow">
          <span className="text-strong">Two-step verification</span>
          <span className="text-small">Ask for a code from your phone when signing in on a new device.</span>
        </div>
        <Toggle
          label="Two-step verification"
          checked={twoFactor}
          onChange={(on) => {
            setTwoFactor(on);
            onMessage(on ? "Two-step verification turned on." : "Two-step verification turned off.");
          }}
        />
      </div>

      <div className="stack stack--6 security-devices">
        <span className="text-strong">Signed-in devices</span>
        {SIGNED_IN_DEVICES.map((d) => (
          <div className="list-row list-row--nowrap" key={d.device}>
            <span className="u-grow">
              <span className="u-strong">{d.device}</span> <span className="u-muted">· {d.where}</span>
            </span>
            <span className={d.current ? "text-small u-strong u-green" : "text-small u-strong"}>{d.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
