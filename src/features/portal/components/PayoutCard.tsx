"use client";

import { useState, type FormEvent } from "react";
import { EMPTY_PAYOUT, PayoutFields, payoutBody, payoutProblem, type PayoutDraft } from "@/components/affiliates/PayoutFields";
import { Button, FormError, Icon, IconTile } from "@/components/ui";
import { payoutMethodLabel } from "@/data/affiliates";
import type { PayoutOut } from "@/utils/api/models";
import { firstErrorMessage } from "@/utils/errors";
import { useRemoveMyPayout, useSaveMyPayout } from "@/utils/hooks/useAffiliates";
import { usePortal } from "../state/PortalContext";

/**
 * Where the client wants referral bonuses sent: Wise, PayPal or a bank transfer. Saved details come back masked and are
 * re-entered to change them; card numbers are never asked for. Only the portal owner can change them.
 */
export function PayoutCard({ payout, bonuses }: { payout: PayoutOut | null; bonuses: string }) {
  const { readOnly, notify } = usePortal();
  const save = useSaveMyPayout();
  const remove = useRemoveMyPayout();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PayoutDraft>(EMPTY_PAYOUT);
  const [tried, setTried] = useState(false);
  const change = (patch: Partial<PayoutDraft>) => {
    if (save.isError) save.reset();
    setDraft((d) => ({ ...d, ...patch }));
  };
  const problem = payoutProblem(draft);
  const showForm = !readOnly && (editing || !payout);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    save.mutate(payoutBody(draft), {
      onSuccess: () => {
        setEditing(false);
        setTried(false);
        setDraft(EMPTY_PAYOUT);
        notify("Payout details saved.");
      },
    });
  };

  return (
    <section className="card payout-card" aria-labelledby="payout-title">
      <div className="cluster cluster--nowrap payout-card__head">
        <IconTile tone="green" size="md">
          <Icon name="dollar" size={17} />
        </IconTile>
        <div className="stack stack--2 u-grow">
          <span className="text-strong" id="payout-title">
            Where we send your bonus
          </span>
          <span className="text-small">
            We’ll send the money to these details once a client you referred goes ahead with a Simple or Custom CRM build: {bonuses}.
          </span>
        </div>
      </div>

      {payout && !editing && (
        <div className="inset payout-card__saved">
          <div className="stack stack--2 u-grow">
            <span className="kicker kicker--sm kicker--muted">{payoutMethodLabel(payout.method).toUpperCase()}</span>
            <span className="text-strong">{payout.holderName}</span>
            <span className="text-small data-table__mono">{payout.summary}</span>
          </div>
          {!readOnly && (
            <div className="cluster cluster--8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft({ ...EMPTY_PAYOUT, method: payout.method, holderName: payout.holderName });
                  setEditing(true);
                }}
              >
                Change
              </Button>
              <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => notify("Payout details removed.") })}>
                Remove
              </Button>
            </div>
          )}
        </div>
      )}

      {!payout && readOnly && <p className="text-small">No payout details yet. The portal owner can add them.</p>}

      {showForm && (
        <form className="stack stack--12" onSubmit={submit} noValidate>
          <PayoutFields draft={draft} onChange={change} />
          {tried && problem && (
            <span className="field__error" role="alert">
              {problem}
            </span>
          )}
          {save.error ? (
            <span className="field__error" role="alert">
              {firstErrorMessage(save.error)}
            </span>
          ) : null}
          <FormError error={remove.error} />
          <p className="text-small payout-card__secure">
            <Icon name="lock" size={12} strokeWidth={2.2} /> Stored encrypted and only seen by the GoCWGL team when sending your bonus. We never
            ask for card numbers.
          </p>
          <div className="cluster cluster--8">
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save payout details"}
            </Button>
            {payout && (
              <Button
                onClick={() => {
                  setEditing(false);
                  setTried(false);
                  save.reset();
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
