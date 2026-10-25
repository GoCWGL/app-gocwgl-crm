"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Icon, IconTile, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { firstErrorMessage, fieldErrors } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useAddReferrer, useReferredBy } from "@/utils/hooks/useAffiliates";
import { usePortal } from "../state/PortalContext";

/** "1d 23h 05m 12s" until `deadline`, ticking every second ("" once it has passed). */
function useCountdown(deadline: string | null | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  if (!deadline) return "";
  const left = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  if (!left) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(left / 86400);
  const hours = Math.floor((left % 86400) / 3600);
  return `${days ? `${days}d ` : ""}${hours}h ${pad(Math.floor((left % 3600) / 60))}m ${pad(left % 60)}s`;
}

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/**
 * Account settings › "Who referred you?": the client enters the referral ID of whoever referred them, within 48 hours
 * of creating their account, so that person gets their bonus. A countdown sits under the field; once it ends the field
 * is greyed out. After that only a GoCWGL super admin can set it (from the contact's CRM profile).
 */
export function ReferredByCard() {
  const { readOnly, notify } = usePortal();
  const query = useReferredBy();
  const add = useAddReferrer();
  const [code, setCode] = useState("");
  const state = query.data;
  const countdown = useCountdown(state && !state.referrer ? state.deadline : null);

  if (!state) return null;
  // Closed once the server says so or the countdown runs out in this tab.
  const open = state.open && !!countdown;
  const fieldError = fieldErrors(add.error).referralCode;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!open || !code.trim()) return;
    add.mutate(code.trim(), {
      onSuccess: (s) => {
        setCode("");
        notify(`Thanks! ${s.referrer?.name || "Your referrer"} will get their bonus once you go ahead with a CRM build.`);
      },
    });
  };

  return (
    <section className="card referred-by" aria-labelledby="referred-by-title">
      <div className="cluster cluster--nowrap referred-by__head">
        <IconTile tone="amber" size="md">
          <Icon name="userPlus" size={17} />
        </IconTile>
        <div className="stack stack--2 u-grow">
          <span className="text-strong" id="referred-by-title">
            Who referred you?
          </span>
          <span className="text-small">
            If someone referred you to GoCWGL, enter their referral ID so they get their referral bonus. The bonus goes to them, not to you.
          </span>
        </div>
      </div>

      {state.referrer ? (
        <div className="stack stack--6">
          <Field label="Referred by" htmlFor="referred-by-name" strongLabel>
            <Input id="referred-by-name" value={[state.referrer.name, state.referrer.company].filter(Boolean).join(", ")} readOnly aria-readonly="true" />
          </Field>
          <span className="text-small">
            {state.linkedAt && `Added ${formatShort(state.linkedAt)}. `}To change it, contact your GoCWGL team.
          </span>
        </div>
      ) : (
        <form className={cn("stack stack--8 referred-by__form", !open && "referred-by__form--closed")} onSubmit={submit} noValidate>
          <div className="cluster cluster--8 referred-by__row">
            <Field label="Their referral ID" htmlFor="referred-by-code" strongLabel error={fieldError}>
              <Input
                id="referred-by-code"
                mono
                placeholder="K7M2-Q9XA"
                autoComplete="off"
                value={code}
                disabled={!open || readOnly}
                onChange={(e) => {
                  if (add.isError) add.reset();
                  setCode(e.target.value.toUpperCase());
                }}
                aria-invalid={!!fieldError}
                aria-describedby="referred-by-time"
              />
            </Field>
            <Button type="submit" variant="primary" disabled={!open || readOnly || !code.trim() || add.isPending}>
              {add.isPending ? "Adding…" : "Add referrer"}
            </Button>
          </div>

          {open ? (
            <div className="referred-by__time" id="referred-by-time">
              <span className="referred-by__countdown" role="timer" aria-live="off">
                <Icon name="clock" size={14} strokeWidth={2.2} /> {countdown} left
              </span>
              <span className="text-small">
                You can only add a referral ID within 48 hours of creating your account, until {when(state.deadline)}. After that this field
                closes, so ask the person who referred you for their ID and enter it in time.
                {readOnly && " Only the portal owner can add it."}
              </span>
            </div>
          ) : (
            <div className="notice notice--warning" id="referred-by-time" role="note">
              <span>
                {!state.programEnabled ? (
                  "The referral program is paused right now, so a referral ID can’t be added."
                ) : (
                  <>
                    <span className="u-strong">The 48 hours to add a referral ID have ended</span>
                    {state.deadline && ` (closed ${when(state.deadline)})`}. If someone referred you, contact your GoCWGL team.
                  </>
                )}
              </span>
            </div>
          )}

          {add.error && !fieldError ? (
            <span className="field__error" role="alert">
              {firstErrorMessage(add.error)}
            </span>
          ) : null}
        </form>
      )}
    </section>
  );
}
