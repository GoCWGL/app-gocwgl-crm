"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconButton, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import {
  FUNNEL_ADDONS,
  FUNNEL_TYPES,
  PAYMENT_CARD,
  RUSH_PRICE,
  type CustomLink,
  type FunnelTypeKey,
} from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import { cn, formatMoney, isUrl, newId, normalizeUrl } from "@/lib/utils";
import { getSavedLinks } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

type ExtraLink = { id: number; label: string; url: string; touched: boolean };

type Draft = {
  type: FunnelTypeKey;
  name: string;
  goal: string;
  offer: string;
  audience: string;
  notes: string;
  addons: Record<string, boolean>;
  speed: "standard" | "rush";
  pay: "now" | "invoice";
  agree: boolean;
  links: Record<string, boolean>;
  extra: ExtraLink[];
  saveToAccount: boolean;
};

export function FunnelRequestDrawer() {
  const { state, update } = usePortal();
  if (!state.funnelRequestOpen) return null;
  return <FunnelRequestForm onClose={() => update({ funnelRequestOpen: false })} />;
}

function FunnelRequestForm({ onClose }: { onClose: () => void }) {
  const { state, update } = usePortal();
  const savedLinks = getSavedLinks(state);
  const [error, setError] = useState("");
  const [draft, setDraftState] = useState<Draft>(() => ({
    type: "booking",
    name: "",
    goal: "",
    offer: "",
    audience: "",
    notes: "",
    addons: {},
    speed: "standard",
    pay: "now",
    agree: false,
    links: Object.fromEntries(savedLinks.map((l) => [l.key, true])),
    extra: [],
    saveToAccount: true,
  }));

  const set = (patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
    setError("");
  };
  const setExtra = (id: number, patch: Partial<ExtraLink>) =>
    set({ extra: draft.extra.map((x) => (x.id === id ? { ...x, ...patch } : x)) });

  const type = FUNNEL_TYPES.find((t) => t.key === draft.type)!;
  const isQuote = draft.type === "custom";
  const lines: Array<[string, number]> = [
    [`${type.label} build`, type.price],
    ...FUNNEL_ADDONS.filter((a) => draft.addons[a.key]).map((a): [string, number] => [a.label, a.price]),
    ...(draft.speed === "rush" ? [["Rush delivery", RUSH_PRICE] as [string, number]] : []),
  ];
  const total = lines.reduce((n, [, amount]) => n + amount, 0);
  const totalText = isQuote ? "Quote" : formatMoney(total);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.goal.trim()) return setError("Please add a funnel name and its main goal.");

    const extra = draft.extra.map((x) => ({ ...x, url: normalizeUrl(x.url) }));
    if (extra.some((x) => (x.url && !isUrl(x.url)) || (x.label.trim() && !x.url))) {
      set({ extra: extra.map((x) => ({ ...x, touched: true })) });
      setError("One of the extra links is not a full web address.");
      return;
    }
    if (!isQuote && !draft.agree) return setError("Please confirm the additional charge to continue.");

    const links = [
      ...savedLinks.filter((l) => draft.links[l.key]).map((l) => ({ label: l.label, url: l.url })),
      ...extra.filter((x) => x.url).map((x) => ({ label: x.label.trim() || x.url.replace(/^https?:\/\//, ""), url: x.url })),
    ];
    const accountLinks: CustomLink[] = draft.saveToAccount
      ? extra.filter((x) => x.url).map((x) => ({ id: newId(), label: x.label.trim(), url: x.url, touched: true }))
      : [];
    const base = {
      id: newId(),
      name: draft.name.trim(),
      type: type.label,
      goal: draft.goal.trim(),
      url: "",
      price: total,
      links,
      steps: type.steps.map((s): [string, number] => [s, 0]),
    };

    if (isQuote) {
      update((s) => ({
        customLinks: [...s.customLinks, ...accountLinks],
        funnels: [{ ...base, status: "quote", note: "We received your request. Expect a quote within 1 business day." }, ...s.funnels],
        funnelRequestOpen: false,
        toast: "Request sent. Your GoCWGL team will send a quote soon.",
      }));
      return;
    }

    const paid = draft.pay === "now";
    update((s) => {
      const invoiceNo = "INV-" + (1004 + s.invoices.length);
      return {
        funnels: [
          {
            ...base,
            status: paid ? "queued" : "pay",
            invoice: invoiceNo,
            note: paid
              ? "Paid — thank you! Your team will start the build within 2 business days."
              : `Invoice ${invoiceNo} for ${formatMoney(total)} is in your Billing. The build starts once it is paid.`,
          },
          ...s.funnels,
        ],
        invoices: [
          { no: invoiceNo, desc: `New funnel: ${base.name}`, amount: total, due: paid ? TODAY_SHORT : "Oct 21", status: paid ? "Paid" : "Open" },
          ...s.invoices,
        ],
        tickets: [
          {
            code: "REQ-" + (215 + s.tickets.length),
            type: "New funnel",
            title: base.name,
            date: TODAY_SHORT,
            priority: draft.speed === "rush" ? "High" : "Medium",
            status: "New",
          },
          ...s.tickets,
        ],
        customLinks: [...s.customLinks, ...accountLinks],
        funnelRequestOpen: false,
        toast: paid
          ? `Paid ${formatMoney(total)}. Your new funnel is queued for build.`
          : `Request sent. Invoice ${invoiceNo} for ${formatMoney(total)} is in Billing.`,
      };
    });
  };

  const missingName = !!error && !draft.name.trim();
  const missingGoal = !!error && !draft.goal.trim();

  return (
    <Modal
      open
      variant="drawer"
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="fq-title"
      kicker="NEW FUNNEL"
      title="Request a new funnel"
      media={
        <IconTile brand size="lg">
          <Icon name="funnel" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-muted">
            Total <strong className="u-mono u-ink">{totalText}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isQuote ? "Request a quote" : draft.pay === "now" ? `Pay ${formatMoney(total)} & submit` : "Submit & send invoice"}
          </Button>
        </>
      }
    >
      {/* 01 — type */}
      <div className="stack stack--8">
        <span className="kicker">01 · WHAT KIND OF FUNNEL?</span>
        <div className="option-grid">
          {FUNNEL_TYPES.map((t) => (
            <button key={t.key} type="button" className="option-card" aria-pressed={draft.type === t.key} onClick={() => set({ type: t.key })}>
              <span className="option-card__head">
                <span>{t.label}</span>
                <span className="option-card__price">{t.price ? `from ${formatMoney(t.price)}` : "Quote"}</span>
              </span>
              <span className="option-card__desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 02 — details */}
      <div className="stack stack--10">
        <span className="kicker">02 · TELL US ABOUT IT</span>
        <Field label="Funnel name" htmlFor="fq-name" required>
          <Input
            id="fq-name"
            value={draft.name}
            aria-invalid={missingName}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Corporate wellness workshops"
          />
        </Field>
        <Field label="Main goal" htmlFor="fq-goal" required>
          <Input
            id="fq-goal"
            value={draft.goal}
            aria-invalid={missingGoal}
            onChange={(e) => set({ goal: e.target.value })}
            placeholder="e.g. Get local companies to book a team workshop"
          />
        </Field>
        <div className="form-grid">
          <Field label="Offer or hook" htmlFor="fq-offer">
            <Input id="fq-offer" value={draft.offer} onChange={(e) => set({ offer: e.target.value })} placeholder="e.g. Free 30-min demo session" />
          </Field>
          <Field label="Who is it for?" htmlFor="fq-aud">
            <Input id="fq-aud" value={draft.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="e.g. HR managers, 20–200 staff" />
          </Field>
        </div>
        <Field label="Anything else? Links to pages you like, wording, deadlines…" htmlFor="fq-notes">
          <Textarea id="fq-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>

      {/* 03 — links */}
      <div className="stack stack--10">
        <span className="kicker">03 · SOCIAL MEDIA &amp; LINKS ON THIS FUNNEL</span>
        <span className="text-small">
          Pick which of your links to show on the funnel pages and emails, or add links just for this funnel.
        </span>
        {savedLinks.length > 0 ? (
          <>
            <div className="cluster cluster--6">
              {savedLinks.map((l) => {
                const on = !!draft.links[l.key];
                return (
                  <button
                    key={l.key}
                    type="button"
                    className="chip tone-cyan"
                    aria-pressed={on}
                    title={l.url}
                    onClick={() => set({ links: { ...draft.links, [l.key]: !on } })}
                  >
                    <span aria-hidden="true">{on ? "✓" : "+"}</span>
                    {l.label}
                  </button>
                );
              })}
            </div>
            <div className="cluster">
              <button type="button" className="btn btn--link" onClick={() => set({ links: Object.fromEntries(savedLinks.map((l) => [l.key, true])) })}>
                Select all
              </button>
              <button type="button" className="btn btn--link" onClick={() => set({ links: {} })}>
                None
              </button>
            </div>
          </>
        ) : (
          <div className="inset text-small">
            You haven’t saved any social links yet. Add them under Account › Social media &amp; links, or add links just for
            this funnel below.
          </div>
        )}
        {draft.extra.map((x) => {
          const bad = x.touched && !!x.url.trim() && !isUrl(x.url);
          return (
            <div className="extra-link" key={x.id}>
              <Input
                size="sm"
                className="extra-link__label"
                aria-label="Link label"
                value={x.label}
                onChange={(e) => setExtra(x.id, { label: e.target.value })}
                placeholder="Label, e.g. Event tickets"
              />
              <Field className="extra-link__url" error={bad && "Enter a full web address"}>
                <Input
                  size="sm"
                  mono
                  type="url"
                  aria-label="Link address"
                  spellCheck={false}
                  aria-invalid={bad}
                  value={x.url}
                  onChange={(e) => setExtra(x.id, { url: e.target.value })}
                  onBlur={() => setExtra(x.id, { url: normalizeUrl(x.url), touched: true })}
                  placeholder="https://"
                />
              </Field>
              <IconButton label="Remove link" danger onClick={() => set({ extra: draft.extra.filter((y) => y.id !== x.id) })}>
                ×
              </IconButton>
            </div>
          );
        })}
        <Button variant="dashed" size="sm" onClick={() => set({ extra: [...draft.extra, { id: newId(), label: "", url: "", touched: false }] })}>
          + Add a link just for this funnel
        </Button>
        <Checkbox
          brand
          label="Also save new links to my account"
          checked={draft.saveToAccount}
          onChange={() => set({ saveToAccount: !draft.saveToAccount })}
        />
      </div>

      {/* 04 — extras */}
      <div className="stack stack--8">
        <span className="kicker">04 · EXTRAS</span>
        {FUNNEL_ADDONS.map((a) => {
          const on = !!draft.addons[a.key];
          return (
            <label key={a.key} className={cn("option-card option-card--row", on && "option-card--on")}>
              <input
                type="checkbox"
                className="option-card__check"
                checked={on}
                onChange={() => set({ addons: { ...draft.addons, [a.key]: !on } })}
              />
              <span className="stack stack--2 u-grow">
                <span className="text-strong">{a.label}</span>
                <span className="text-small">{a.desc}</span>
              </span>
              <span className="option-card__price">+{formatMoney(a.price)}</span>
            </label>
          );
        })}
        <Field label="Delivery" htmlFor="fq-speed">
          <Select id="fq-speed" value={draft.speed} onChange={(e) => set({ speed: e.target.value as Draft["speed"] })}>
            <option value="standard">Standard · about 2 weeks</option>
            <option value="rush">Rush · about 1 week (+{formatMoney(RUSH_PRICE)})</option>
          </Select>
        </Field>
      </div>

      {/* 05 — billing */}
      <div className="billing-summary">
        <span className="kicker kicker--brand">05 · ADDITIONAL BILLING</span>
        {(isQuote ? [["Custom funnel", "Quote"]] : lines.map(([l, n]) => [l, formatMoney(n)])).map(([label, amount]) => (
          <div className="billing-summary__line" key={label}>
            <span>{label}</span>
            <span className="u-mono u-strong">{amount}</span>
          </div>
        ))}
        <div className="billing-summary__total">
          <span className="text-strong">One-time total</span>
          <span className="billing-summary__amount">{totalText}</span>
        </div>
        <span className="text-small">
          {isQuote
            ? "Your team will review your request and send a fixed quote within 1 business day. Nothing is charged until you accept it."
            : "This is a one-time fee for the build, added to your Billing as a separate invoice. Your monthly plan stays the same. Hosting and reporting for the new funnel are included."}
        </span>
        {!isQuote && (
          <>
            <div className="cluster cluster--6" role="radiogroup" aria-label="How to pay">
              {(
                [
                  ["now", "Pay now", `Charge ${PAYMENT_CARD} and start the build right away`],
                  ["invoice", "Send me an invoice", "Pay within 7 days. The build starts once it is paid."],
                ] as const
              ).map(([key, label, desc]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={draft.pay === key}
                  className="option-card pay-option"
                  onClick={() => set({ pay: key })}
                >
                  <span className="text-strong">{label}</span>
                  <span className="text-small">{desc}</span>
                </button>
              ))}
            </div>
            <Checkbox
              brand
              label={`I understand this is an additional one-time charge of ${totalText}, separate from my monthly plan.`}
              checked={draft.agree}
              onChange={() => set({ agree: !draft.agree })}
            />
          </>
        )}
      </div>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
