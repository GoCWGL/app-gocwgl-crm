"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, Textarea, buttonClass } from "@/components/ui";
import { CRM_BOOKING_URL, CRM_PACKAGES, OFFERED_CRM_PACKAGES, type CrmPackageKey } from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import { useCreateCrmRequest } from "@/utils/hooks/useDelivery";
import { PaymentNotes } from "./PayConfirmModal";

const PACKAGE_KEYS = OFFERED_CRM_PACKAGES;

/** Portals a CRM can have (who logs in): the name saved, and who it's for. */
const PORTAL_OPTIONS = [
  { name: "Admin", who: "You and your team" },
  { name: "Clients", who: "Your customers" },
  { name: "Students", who: "Your learners" },
  { name: "Members", who: "Your community" },
  { name: "Partners", who: "Affiliates or vendors" },
];

/** Common menus to tap, so clients don't have to start from a blank list. */
const MENU_SUGGESTIONS = [
  "Dashboard",
  "Contacts",
  "Pipeline",
  "Calendar",
  "Tasks",
  "Email campaigns",
  "Forms",
  "Invoices",
  "Courses",
  "Jobs",
  "Reports",
  "Settings",
];

const MAX_MENUS = 40;
const MAX_PORTALS = 10;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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
  const [pkg, setPkg] = useState<CrmPackageKey>(OFFERED_CRM_PACKAGES[0]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [portals, setPortals] = useState<string[]>(["Admin"]);
  const [menus, setMenus] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const p = CRM_PACKAGES[pkg];

  // Only the package and the client's own answers go in the link (never their name or email); they add those on the booking page.
  const booking = new URL(CRM_BOOKING_URL);
  const notes = [
    `Package: ${p.label}`,
    `CRM name: ${name.trim()}`,
    `Goal: ${goal.trim()}`,
    portals.length ? `Portals: ${portals.join(", ")}` : "",
    menus.length ? `Menus: ${menus.join(", ")}` : "",
  ].filter(Boolean);
  booking.search = new URLSearchParams({ package: pkg, notes: notes.join("\n") }).toString();

  const review = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return setTried(true);
    setStep("review");
  };

  const confirm = () => {
    // Open the tab during the click: browsers block tabs opened after the request comes back.
    const tab = window.open("", "_blank");
    create.mutate(
      { package: pkg, name: name.trim(), goal: goal.trim(), menus, portals },
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

          <span className="kicker">03 · MENUS AND PORTALS (OPTIONAL)</span>
          <div className="crm-req-note">
            <Icon name="sparkle" size={15} />
            <span>
              <strong>Just a starting point.</strong> This helps your team picture your CRM before the call. Nothing here is final:
              we’ll go through the menus and features together on your discovery call and in your blueprint.
            </span>
          </div>

          <Field label={`Portals · ${portals.length}`} hint="Who logs in? Each portal is its own login area with its own menus.">
            <div className="cluster cluster--6" role="group" aria-label="Portals">
              {PORTAL_OPTIONS.map((o) => {
                const on = portals.some((x) => same(x, o.name));
                return (
                  <button
                    key={o.name}
                    type="button"
                    className="chip chip--square crm-req-portal"
                    aria-pressed={on}
                    onClick={() => setPortals(on ? portals.filter((x) => !same(x, o.name)) : [...portals, o.name].slice(0, MAX_PORTALS))}
                  >
                    {on && <Icon name="check" size={13} strokeWidth={2.6} />}
                    <span>
                      {o.name} <small>· {o.who}</small>
                    </span>
                  </button>
                );
              })}
              {portals
                .filter((x) => !PORTAL_OPTIONS.some((o) => same(o.name, x)))
                .map((x) => (
                  <RemovableChip key={x} label={x} onRemove={() => setPortals(portals.filter((y) => y !== x))} />
                ))}
            </div>
            <AddName
              id="crm-req-portal"
              placeholder="Another portal, e.g. Coaches"
              full={portals.length >= MAX_PORTALS}
              onAdd={(n) => !portals.some((x) => same(x, n)) && setPortals([...portals, n])}
            />
          </Field>

          <Field label={`Menus · ${menus.length}`} hint="The main sections you picture in your CRM. Tap a suggestion or type your own.">
            {menus.length > 0 && (
              <div className="cluster cluster--6">
                {menus.map((m) => (
                  <RemovableChip key={m} label={m} onRemove={() => setMenus(menus.filter((x) => x !== m))} />
                ))}
              </div>
            )}
            <AddName
              id="crm-req-menu"
              placeholder="e.g. Properties, Bookings, Commissions"
              full={menus.length >= MAX_MENUS}
              onAdd={(n) => !menus.some((x) => same(x, n)) && setMenus([...menus, n])}
            />
            <div className="cluster cluster--6 crm-req-suggest">
              {MENU_SUGGESTIONS.filter((s) => !menus.some((m) => same(m, s))).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip chip--sm"
                  disabled={menus.length >= MAX_MENUS}
                  onClick={() => setMenus([...menus, s])}
                >
                  <Icon name="plus" size={12} strokeWidth={2.6} />
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {tried && (!name.trim() || !goal.trim()) && (
            <p className="text-error" role="alert">
              Please add {[!name.trim() && "a name", !goal.trim() && "a goal"].filter(Boolean).join(" and ")}.
            </p>
          )}
        </>
      ) : (
        <>
          <dl className="inset crm-request-review">
            <dt className="kicker kicker--sm kicker--muted">CRM</dt>
            <dd className="text-strong">
              {p.label} · {formatCents(p.priceCents)} <span className="text-small">({p.timeline})</span>
            </dd>
            <dt className="kicker kicker--sm kicker--muted">NAME</dt>
            <dd className="text-strong">{name.trim()}</dd>
            <dt className="kicker kicker--sm kicker--muted">GOAL</dt>
            <dd className="text-body u-ink crm-request-review__goal">{goal.trim()}</dd>
            <dt className="kicker kicker--sm kicker--muted">PORTALS</dt>
            <dd className="text-body u-ink">{portals.length ? `${portals.length} · ${portals.join(", ")}` : "Not set yet"}</dd>
            <dt className="kicker kicker--sm kicker--muted">MENUS</dt>
            <dd className="text-body u-ink">{menus.length ? menus.join(", ") : "Not set yet"}</dd>
          </dl>
          <p className="text-small">Menus and portals are a starting point. We’ll finalise them with you on the call.</p>
          {/* Payment comes later (an invoice after the call), but the same rules apply when they pay it. */}
          <PaymentNotes later />
        </>
      )}
      <FormError error={create.error} />
    </Modal>
  );
}

/** A chip for something the client typed, with a button to remove it. */
function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="chip chip--square chip--on crm-req-chip">
      {label}
      <button type="button" className="crm-req-chip__remove" aria-label={`Remove ${label}`} onClick={onRemove}>
        <Icon name="close" size={12} strokeWidth={2.6} />
      </button>
    </span>
  );
}

/** A text box with Add: Enter adds the name too (instead of submitting the whole form). */
function AddName({ id, placeholder, full, onAdd }: { id: string; placeholder: string; full: boolean; onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const n = value.trim().replace(/\s+/g, " ");
    if (!n || full) return;
    onAdd(n);
    setValue("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    add();
  };
  return (
    <div className="cluster cluster--nowrap cluster--6">
      <Input
        id={id}
        size="sm"
        maxLength={60}
        value={value}
        disabled={full}
        placeholder={full ? "That’s the most you can add here" : placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <Button size="sm" variant="outline" disabled={!value.trim() || full} onClick={add}>
        <Icon name="plus" size={13} strokeWidth={2.6} />
        Add
      </Button>
    </div>
  );
}
