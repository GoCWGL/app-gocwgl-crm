"use client";

import { useState } from "react";
import { Button, Field, FormError, Input, LoadState, Select } from "@/components/ui";
import { bpsPct, PAYOUT_METHODS, TAX_CLASSES, taxClassLabel } from "@/data/shareholders";
import type { PayoutProfileIn, PayoutProfileOut } from "@/utils/api/models";
import { usePayoutProfile, useRevealPayoutProfile, useSavePayoutProfile } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { FormModal } from "./shared";

/** A shareholder's tax type, TIN and payout account: masked until revealed (each look is on the audit log). */
export function PayoutProfileCard({ stakeholderId, name }: { stakeholderId: string; name: string }) {
  const query = usePayoutProfile(stakeholderId);
  const reveal = useRevealPayoutProfile();
  const [editing, setEditing] = useState(false);
  const p = query.data;
  const r = reveal.data;
  const account = r ? [r.bankName, r.accountNumber, r.swift, r.email].filter(Boolean).join(" · ") : "";
  return (
    <div className="stack stack--8">
      <div className="cluster cluster--between">
        <span className="kicker">TAX & PAYOUT</span>
        <span className="cluster">
          {p && (p.tinMasked || p.summary) && (
            <Button size="sm" variant="outline" disabled={reveal.isPending} onClick={() => (r ? reveal.reset() : reveal.mutate(stakeholderId))}>
              {r ? "Hide" : "Show full details"}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={!p} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </span>
      </div>
      <FormError error={reveal.error} />
      <LoadState query={query} inline>
        {p && (
          <dl className="sh-facts">
            <div>
              <dt>Tax type</dt>
              <dd>{p.taxClass === "custom" ? `Custom rate (${bpsPct(p.customTaxBps ?? 0)})` : taxClassLabel(p.taxClass)}</dd>
            </div>
            <div>
              <dt>TIN</dt>
              <dd>{r ? r.tin || "—" : p.tinMasked || "Missing"}</dd>
            </div>
            <div>
              <dt>Paid to</dt>
              <dd>{(r && account) || p.summary || "Not set"}</dd>
            </div>
            <div>
              <dt>Name on account</dt>
              <dd>{p.holderName || "—"}</dd>
            </div>
          </dl>
        )}
      </LoadState>
      {editing && p && (
        <PayoutProfileModal
          stakeholderId={stakeholderId}
          name={name}
          profile={p}
          onClose={() => {
            setEditing(false);
            reveal.reset();
          }}
        />
      )}
    </div>
  );
}

function PayoutProfileModal({ stakeholderId, name, profile: p, onClose }: { stakeholderId: string; name: string; profile: PayoutProfileOut; onClose: () => void }) {
  const save = useSavePayoutProfile();
  const { notify } = useAdmin();
  const [taxClass, setTaxClass] = useState<NonNullable<PayoutProfileIn["taxClass"]>>(p.taxClass as NonNullable<PayoutProfileIn["taxClass"]>);
  const [rate, setRate] = useState(p.customTaxBps == null ? "" : String(p.customTaxBps / 100));
  const [tin, setTin] = useState("");
  const [method, setMethod] = useState<NonNullable<PayoutProfileIn["method"]>>(p.method as NonNullable<PayoutProfileIn["method"]>);
  const [holderName, setHolder] = useState(p.holderName || name);
  const [acct, setAcct] = useState({ bankName: "", accountNumber: "", swift: "", email: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof acct, v: string) => setAcct((x) => ({ ...x, [k]: v }));
  const kept = p.method === method && !!p.summary;
  const typed = Object.values(acct).some((v) => v.trim());
  const keepHint = kept ? `Saved: ${p.summary}. Leave empty to keep it.` : undefined;

  const submit = () => {
    const bps = Math.round(Number(rate) * 100);
    if (taxClass === "custom" && (rate.trim() === "" || !(bps >= 0 && bps <= 10_000))) return setError("Enter a custom rate from 0 to 100.");
    if (tin.trim() && !/^[A-Za-z0-9][A-Za-z0-9 -]{4,29}$/.test(tin.trim())) return setError("Enter the TIN using numbers, letters and dashes.");
    if (method && !holderName.trim()) return setError("Enter the name on the account.");
    const needs = { bank: acct.bankName.trim() && acct.accountNumber.trim(), wise: acct.email.trim(), gcash: acct.accountNumber.trim() }[method as "bank" | "wise" | "gcash"];
    const hasAccount = method === "bank" || method === "wise" || method === "gcash";
    if (hasAccount && (typed || !kept) && !needs) return setError("Enter the account details.");
    const body: PayoutProfileIn = {
      taxClass,
      customTaxBps: taxClass === "custom" ? bps : null,
      ...(tin.trim() && { tin: tin.trim() }),
      method,
      holderName: method ? holderName.trim() : "",
      ...(hasAccount &&
        typed && {
          account: {
            bankName: method === "bank" ? acct.bankName.trim() : "",
            accountNumber: method === "wise" ? "" : acct.accountNumber.trim(),
            swift: method === "bank" ? acct.swift.trim() : "",
            email: method === "wise" ? acct.email.trim() : "",
          },
        }),
    };
    save.mutate({ id: stakeholderId, body }, { onSuccess: () => (notify("Tax and payout details saved."), onClose()) });
  };
  return (
    <FormModal
      id="pp-title"
      kicker="TAX & PAYOUT"
      title={name}
      subtitle="The TIN and account are stored encrypted and shown masked."
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Tax type" htmlFor="pp-tax" hint="Sets the tax withheld on cash dividends. Confirm it with your accountant.">
          <Select id="pp-tax" value={taxClass} options={TAX_CLASSES} onChange={(e) => setTaxClass(e.target.value as typeof taxClass)} />
        </Field>
        {taxClass === "custom" && (
          <Field label="Custom rate %" htmlFor="pp-rate" required>
            <Input id="pp-rate" type="number" min={0} max={100} step="0.01" mono value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        )}
        <Field label="TIN" htmlFor="pp-tin" hint={p.tinMasked ? `Saved: ${p.tinMasked}. Leave empty to keep it.` : undefined}>
          <Input id="pp-tin" mono autoComplete="off" maxLength={30} value={tin} placeholder="000-000-000-000" onChange={(e) => setTin(e.target.value)} />
        </Field>
        <Field label="Payout method" htmlFor="pp-method">
          <Select id="pp-method" value={method} options={PAYOUT_METHODS} onChange={(e) => setMethod(e.target.value as typeof method)} />
        </Field>
        {method && (
          <Field label="Name on account" htmlFor="pp-holder" required>
            <Input id="pp-holder" autoComplete="off" maxLength={120} value={holderName} onChange={(e) => setHolder(e.target.value)} />
          </Field>
        )}
        {method === "bank" && (
          <>
            <Field label="Bank" htmlFor="pp-bank" hint={keepHint}>
              <Input id="pp-bank" autoComplete="off" maxLength={120} value={acct.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </Field>
            <Field label="Account number" htmlFor="pp-acct">
              <Input id="pp-acct" mono autoComplete="off" maxLength={40} value={acct.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
            </Field>
            <Field label="SWIFT / BIC" htmlFor="pp-swift" hint="For transfers abroad.">
              <Input id="pp-swift" mono autoComplete="off" maxLength={11} value={acct.swift} onChange={(e) => set("swift", e.target.value)} />
            </Field>
          </>
        )}
        {method === "wise" && (
          <Field label="Wise email" htmlFor="pp-email" hint={keepHint}>
            <Input id="pp-email" type="email" autoComplete="off" value={acct.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        )}
        {method === "gcash" && (
          <Field label="GCash number" htmlFor="pp-gcash" hint={keepHint}>
            <Input id="pp-gcash" mono autoComplete="off" maxLength={40} value={acct.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
          </Field>
        )}
      </div>
    </FormModal>
  );
}
