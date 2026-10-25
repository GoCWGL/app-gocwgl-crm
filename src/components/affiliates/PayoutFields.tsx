"use client";

import { Field, Input, SegmentedControl } from "@/components/ui";
import { PAYOUT_METHODS, payoutMethodLabel } from "@/data/affiliates";
import type { PayoutIn, PayoutMethod } from "@/utils/api/models";

/** Payout details as typed (the portal's Affiliate page, and the team entering them for a client). */
export type PayoutDraft = {
  method: PayoutMethod;
  holderName: string;
  email: string;
  /** Wise only, optional. */
  paymentLink: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swift: string;
  country: string;
};

export const EMPTY_PAYOUT: PayoutDraft = {
  method: "wise",
  holderName: "",
  email: "",
  paymentLink: "",
  bankName: "",
  accountNumber: "",
  routingNumber: "",
  swift: "",
  country: "",
};

export function payoutBody(d: PayoutDraft): PayoutIn {
  const details =
    d.method === "bank"
      ? { bankName: d.bankName, accountNumber: d.accountNumber, routingNumber: d.routingNumber || null, swift: d.swift || null, country: d.country || null }
      : d.method === "wise"
        ? { email: d.email, paymentLink: d.paymentLink.trim() || null }
        : { email: d.email };
  return { method: d.method, holderName: d.holderName, details };
}

/** What's missing before it can be saved ("" when complete). */
export function payoutProblem(d: PayoutDraft): string {
  if (!d.holderName.trim()) return "Enter the name on the account.";
  if (d.method !== "bank") {
    if (!d.email.includes("@")) return `Enter the email on the ${payoutMethodLabel(d.method)} account.`;
    const link = d.paymentLink.trim();
    return d.method === "wise" && link && !/^(https:\/\/)?([\w-]+\.)*wise\.com\//i.test(link)
      ? "Enter the Wise payment link, starting with https://wise.com/."
      : "";
  }
  if (!d.bankName.trim() || !d.accountNumber.trim()) return "Enter the bank name and account number.";
  return d.routingNumber.trim() || d.swift.trim() ? "" : "Enter a routing number or a SWIFT / BIC code.";
}

/** Wise, PayPal or bank transfer, and that method's fields. Card numbers are never asked for. */
export function PayoutFields({ draft, onChange, idPrefix = "po" }: { draft: PayoutDraft; onChange: (patch: Partial<PayoutDraft>) => void; idPrefix?: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <>
      <SegmentedControl
        kind="radio"
        variant="soft"
        label="How to receive the bonus"
        value={draft.method}
        onChange={(method) => onChange({ method })}
        options={PAYOUT_METHODS}
      />
      <div className="form-grid">
        <Field label="Name on the account" htmlFor={id("name")} strongLabel>
          <Input id={id("name")} autoComplete="name" value={draft.holderName} onChange={(e) => onChange({ holderName: e.target.value })} />
        </Field>
        {draft.method !== "bank" ? (
          <>
            <Field label={`${payoutMethodLabel(draft.method)} email`} htmlFor={id("email")} strongLabel>
              <Input id={id("email")} type="email" autoComplete="email" value={draft.email} onChange={(e) => onChange({ email: e.target.value })} />
            </Field>
            {draft.method === "wise" && (
              <Field label="Wise payment link (optional)" htmlFor={id("link")} hint="So we can pay you straight from your link, e.g. https://wise.com/pay/me/yourname">
                <Input
                  id={id("link")}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://wise.com/pay/me/…"
                  value={draft.paymentLink}
                  onChange={(e) => onChange({ paymentLink: e.target.value })}
                />
              </Field>
            )}
          </>
        ) : (
          <>
            <Field label="Bank name" htmlFor={id("bank")} strongLabel>
              <Input id={id("bank")} value={draft.bankName} onChange={(e) => onChange({ bankName: e.target.value })} />
            </Field>
            <Field label="Account number / IBAN" htmlFor={id("acct")} strongLabel>
              <Input id={id("acct")} mono autoComplete="off" value={draft.accountNumber} onChange={(e) => onChange({ accountNumber: e.target.value })} />
            </Field>
            <Field label="Routing number (US)" htmlFor={id("routing")}>
              <Input id={id("routing")} mono autoComplete="off" value={draft.routingNumber} onChange={(e) => onChange({ routingNumber: e.target.value })} />
            </Field>
            <Field label="SWIFT / BIC (outside the US)" htmlFor={id("swift")}>
              <Input id={id("swift")} mono autoComplete="off" value={draft.swift} onChange={(e) => onChange({ swift: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Bank country" htmlFor={id("country")}>
              <Input id={id("country")} autoComplete="country-name" value={draft.country} onChange={(e) => onChange({ country: e.target.value })} />
            </Field>
          </>
        )}
      </div>
    </>
  );
}
