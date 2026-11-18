"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, PasswordInput } from "@/components/ui";
import type { UnlockStatus } from "@/utils/api/models";
import { isApiError } from "@/utils/errors";
import { useSendUnlockCode, useUnlockAssets } from "@/utils/hooks/useVaAssets";

/** Thrown into a password view/copy when the VA closes the pop-up instead of confirming. */
class UnlockCancelled extends Error {
  constructor() {
    super("Cancelled");
    this.name = "UnlockCancelled";
  }
}

/**
 * Gate in front of every password view or copy: when this device isn't unlocked, open the "confirm it's you" pop-up
 * and carry on once they confirm. If it locked in the meantime (24 hours away), the server says so and we ask again.
 */
export function useAssetUnlockGate(status: UnlockStatus | undefined) {
  const [open, setOpen] = useState(false);
  const waiting = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);

  const ask = () =>
    new Promise<void>((resolve, reject) => {
      waiting.current?.reject(new UnlockCancelled());
      waiting.current = { resolve, reject };
      setOpen(true);
    });

  /** Runs `fn` once the device is unlocked. */
  const guard = async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (!status?.unlocked) await ask();
    try {
      return await fn();
    } catch (e) {
      if (isApiError(e) && e.code === "assets_locked") {
        await ask();
        return fn();
      }
      throw e;
    }
  };

  const modal =
    open && status ? (
      <UnlockModal
        status={status}
        onUnlocked={() => (setOpen(false), waiting.current?.resolve(), (waiting.current = null))}
        onClose={() => (setOpen(false), waiting.current?.reject(new UnlockCancelled()), (waiting.current = null))}
      />
    ) : null;

  return { guard, ask, modal };
}

/** "Confirm it's you": password (or an emailed code), plus the authenticator code when 2-step verification is on. */
function UnlockModal({ status, onUnlocked, onClose }: { status: UnlockStatus; onUnlocked: () => void; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const unlock = useUnlockAssets();
  const send = useSendUnlockCode();
  const byEmail = status.method === "email";
  const ready = (byEmail ? emailCode.trim().length === 6 : !!password) && (!status.needsMfaCode || mfaCode.trim().length === 6);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    unlock.mutate(
      byEmail ? { emailCode: emailCode.trim(), mfaCode: mfaCode.trim() || null } : { password, mfaCode: mfaCode.trim() || null },
      { onSuccess: (s) => s.unlocked && onUnlocked() },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="asset-unlock"
      kicker="ASSETS · SECURITY CHECK"
      title="Confirm it’s you"
      subtitle={`To view or copy client passwords. You stay unlocked on this device while you’re online; after ${status.locksAfterAwayHours} hours away we’ll ask again.`}
      media={
        <IconTile tone="cyan">
          <Icon name="shield" size={18} />
        </IconTile>
      }
      width={460}
      onSubmit={submit}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!ready || unlock.isPending}>
            {unlock.isPending ? "Checking…" : "Unlock passwords"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        {byEmail ? (
          <Field
            label="Code from your email"
            htmlFor="unlock-email-code"
            hint={codeSent ? "We sent a 6-digit code to your email. It expires in 10 minutes." : "Your account has no password, so we’ll email you a code."}
          >
            <div className="ast-pass">
              <Input
                id="unlock-email-code"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                mono
                autoFocus={codeSent}
              />
              <Button variant="outline" onClick={() => send.mutate(undefined, { onSuccess: () => setCodeSent(true) })} disabled={send.isPending}>
                {send.isPending ? "Sending…" : codeSent ? "Send again" : "Email me a code"}
              </Button>
            </div>
          </Field>
        ) : (
          <Field label="Your GoCWGL password" htmlFor="unlock-password">
            <PasswordInput id="unlock-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
          </Field>
        )}
        {status.needsMfaCode && (
          <Field label="2-step verification code" htmlFor="unlock-mfa" hint="From your authenticator app.">
            <Input
              id="unlock-mfa"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              mono
            />
          </Field>
        )}
        <FormError error={unlock.error ?? send.error} />
      </div>
    </Modal>
  );
}
