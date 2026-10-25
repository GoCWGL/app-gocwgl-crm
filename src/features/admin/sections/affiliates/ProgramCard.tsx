"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconTile, Input, Toggle } from "@/components/ui";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import { useAffiliateProgram, useUpdateAffiliateProgram } from "@/utils/hooks/useAffiliates";
import { useAdmin } from "../../state/AdminContext";

/** The program itself: on or off, and the bonus a client earns when someone they referred pays for a CRM. */
export function ProgramCard({ canManage }: { canManage: boolean }) {
  const { update } = useAdmin();
  const program = useAffiliateProgram().data;
  const save = useUpdateAffiliateProgram();
  // Unsaved edits to the amount; null shows the saved bonus.
  const [draft, setDraft] = useState<string | null>(null);
  const bonus = draft ?? (program ? centsToDollars(program.bonusCents) : "");
  const changed = !!program && draft !== null && dollarsToCents(draft) !== program.bonusCents;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    save.mutate(
      { bonusCents: dollarsToCents(bonus) },
      {
        onSuccess: (p) => {
          setDraft(null);
          update({ toast: `Referral bonus is now ${formatCents(p.bonusCents, p.currency)}.` });
        },
      },
    );
  };

  return (
    <section className="card affiliate-program" aria-label="Affiliate program">
      <div className="cluster cluster--nowrap affiliate-program__head">
        <IconTile tone="amber" size="md">
          <Icon name="gift" size={17} />
        </IconTile>
        <div className="stack stack--2 u-grow">
          <span className="text-strong">Affiliate program</span>
          <span className="text-small">
            Every client has their own referral ID on their portal’s Affiliate page. Someone who signs up with it becomes their referral, and
            the bonus is earned once that new client pays for a CRM.
          </span>
        </div>
        {program &&
          (canManage ? (
            <Toggle
              showLabel
              label={program.enabled ? "On" : "Off"}
              checked={program.enabled}
              onChange={(enabled) =>
                save.mutate(
                  { enabled },
                  { onSuccess: () => update({ toast: enabled ? "Affiliate program is on." : "Affiliate program is paused. New sign-ups won’t be linked to a referrer." }) },
                )
              }
            />
          ) : (
            <Badge tone={program.enabled ? "green" : "neutral"} dot>
              {program.enabled ? "On" : "Paused"}
            </Badge>
          ))}
      </div>

      {program && !program.enabled && (
        <div className="notice notice--warning" role="status">
          Paused: clients still see their referral ID and past referrals, but new sign-ups aren’t linked to a referrer.
        </div>
      )}

      <form className="cluster cluster--8 affiliate-program__form" onSubmit={submit}>
        <Field
          label={`Bonus per paid CRM (${program?.currency ?? "USD"})`}
          htmlFor="aff-bonus"
          hint="Used for every referral without its own amount. Bonuses already paid keep their amount."
        >
          <Input
            id="aff-bonus"
            inputMode="decimal"
            className="affiliate-program__amount"
            value={bonus}
            readOnly={!canManage}
            aria-readonly={!canManage}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        {canManage && (
          <div className="cluster cluster--8 affiliate-program__actions">
            <Button type="submit" variant="primary" disabled={!changed || save.isPending}>
              {save.isPending ? "Saving…" : "Save bonus"}
            </Button>
            {changed && <Button onClick={() => setDraft(null)}>Cancel</Button>}
          </div>
        )}
      </form>
      <FormError error={save.error} />
    </section>
  );
}
