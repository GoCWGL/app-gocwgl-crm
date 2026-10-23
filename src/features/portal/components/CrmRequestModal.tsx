"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, Textarea, buttonClass } from "@/components/ui";
import { CRM_BOOKING_URL, CRM_PACKAGES, type CrmPackageKey } from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import { useCreateCrmRequest } from "@/utils/hooks/useDelivery";

const PACKAGE_KEYS = Object.keys(CRM_PACKAGES) as CrmPackageKey[];

/** Fill in → check it over → saved (the booking page opens in a new tab, or a link to it if the browser blocked that). */
type Step = "edit" | "review" | "saved";

/**
 * "Request a CRM": which package, what to call it and what it's for. After the client confirms, it's saved for the team
 * (Build progress › CRM requests) and the CRM discovery call opens in a new tab with the same details in the booking note,
 * so the client stays in their portal and sees the request there.
 */
export function CrmRequestModal({ onClose, onRequested }: { onClose: () => void; onRequested: () => void }) {
  const create = useCreateCrmRequest();
  const [step, setStep] = useState<Step>("edit");
  const [pkg, setPkg] = useState<CrmPackageKey>("simple");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [tried, setTried] = useState(false);
  const p = CRM_PACKAGES[pkg];

  // Only the package and the client's own answers go in the link (never their name or email); they add those on the booking page.
  const booking = new URL(CRM_BOOKING_URL);
  booking.search = new URLSearchParams({ package: pkg, notes: `Package: ${p.label}\nCRM name: ${name.trim()}\nGoal: ${goal.trim()}` }).toString();

  const review = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return setTried(true);
    setStep("review");
  };

  const confirm = () => {
    // Open the tab during the click: browsers block tabs opened after the request comes back.
    const tab = window.open("", "_blank");
    create.mutate(
      { package: pkg, name: name.trim(), goal: goal.trim() },
      {
        onSuccess: () => {
          if (!tab) return setStep("saved");
          tab.opener = null;
          tab.location.href = booking.toString();
          onRequested();
        },
        onError: () => tab?.close(),
      },
    );
  };

  const footer =
    step === "edit" ? (
      <>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          Review request
        </Button>
      </>
    ) : step === "review" ? (
      <>
        <Button onClick={() => setStep("edit")} disabled={create.isPending}>
          Back to edit
        </Button>
        <Button variant="primary" onClick={confirm} disabled={create.isPending}>
          {create.isPending ? "Sending…" : "Confirm & book a call ↗"}
        </Button>
      </>
    ) : (
      <>
        <Button onClick={onRequested}>Done</Button>
        <a className={buttonClass({ variant: "primary" })} href={booking.toString()} target="_blank" rel="noopener noreferrer" onClick={onRequested}>
          Book your call ↗
        </a>
      </>
    );

  return (
    <Modal
      open
      onClose={step === "saved" ? onRequested : onClose}
      onSubmit={step === "edit" ? review : undefined}
      titleId="crm-req-title"
      kicker={step === "edit" ? "CRM BUILDS" : step === "review" ? "CHECK YOUR REQUEST" : "REQUEST SENT"}
      title={step === "saved" ? "Now book your call" : "Request a CRM"}
      subtitle={
        step === "edit"
          ? "Tell us what you need, then book your discovery call. Nothing is billed until you approve the plan and quote."
          : step === "review"
            ? "Make sure this is right. Confirming sends it to your team and opens the booking page in a new tab."
            : "Your team has your request. Your browser blocked the new tab, so use the button below to pick a time."
      }
      width={620}
      media={
        <IconTile tone="purple" size="lg">
          <Icon name={step === "edit" ? "users" : "check"} size={18} />
        </IconTile>
      }
      footer={footer}
    >
      {step === "edit" ? (
        <>
          <span className="kicker">01 · WHICH CRM</span>
          <div className="option-grid" role="radiogroup" aria-label="CRM package">
            {PACKAGE_KEYS.map((key) => {
              const option = CRM_PACKAGES[key];
              return (
                <button key={key} type="button" role="radio" aria-checked={pkg === key} className="option-card" onClick={() => setPkg(key)}>
                  <span className="option-card__head">
                    {option.label} · {formatCents(option.priceCents)}
                  </span>
                  <span className="option-card__desc">
                    {option.tagline} {option.timeline}.
                  </span>
                </button>
              );
            })}
          </div>

          <span className="kicker">02 · ABOUT IT</span>
          <Field label="Name of the CRM" htmlFor="crm-req-name" required hint="What you’d like to call it, e.g. “Acme Client Hub”.">
            <Input
              id="crm-req-name"
              maxLength={100}
              value={name}
              aria-invalid={tried && !name.trim()}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Client Hub"
            />
          </Field>
          <Field label="Goal" htmlFor="crm-req-goal" required hint="What should it help you do? Your team reads this before the call.">
            <Textarea
              id="crm-req-goal"
              rows={4}
              maxLength={1500}
              value={goal}
              aria-invalid={tried && !goal.trim()}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Track every lead from our ads to a booked job, and send follow-ups automatically."
            />
          </Field>

          {tried && (!name.trim() || !goal.trim()) && (
            <p className="text-error" role="alert">
              Please add {[!name.trim() && "a name", !goal.trim() && "a goal"].filter(Boolean).join(" and ")}.
            </p>
          )}
        </>
      ) : (
        <dl className="inset crm-request-review">
          <dt className="kicker kicker--sm kicker--muted">CRM</dt>
          <dd className="text-strong">
            {p.label} · {formatCents(p.priceCents)} <span className="text-small">({p.timeline})</span>
          </dd>
          <dt className="kicker kicker--sm kicker--muted">NAME</dt>
          <dd className="text-strong">{name.trim()}</dd>
          <dt className="kicker kicker--sm kicker--muted">GOAL</dt>
          <dd className="text-body u-ink crm-request-review__goal">{goal.trim()}</dd>
        </dl>
      )}
      <FormError error={create.error} />
    </Modal>
  );
}
