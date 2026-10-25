"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconTile, Input, Toggle } from "@/components/ui";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import { useAffiliateProgram, useUpdateAffiliateProgram } from "@/utils/hooks/useAffiliates";
import { useAdmin } from "../../state/AdminContext";

type Drafts = { simple: string | null; custom: string | null };
const NO_DRAFTS: Drafts = { simple: null, custom: null };

/** The program itself: on or off, and the bonus a client earns when someone they referred pays for a Simple or a Custom CRM. */
export function ProgramCard({ canManage }: { canManage: boolean }) {
  const { update } = useAdmin();
  const program = useAffiliateProgram().data;
  const save = useUpdateAffiliateProgram();
  // Unsaved edits to the amounts; null shows the saved bonus.
  const [drafts, setDrafts] = useState<Drafts>(NO_DRAFTS);
  const simple = drafts.simple ?? (program ? centsToDollars(program.simpleBonusCents) : "");
  const custom = drafts.custom ?? (program ? centsToDollars(program.customBonusCents) : "");
  const changed =
    !!program && (dollarsToCents(simple) !== program.simpleBonusCents || dollarsToCents(custom) !== program.customBonusCents);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    save.mutate(
      { simpleBonusCents: dollarsToCents(simple), customBonusCents: dollarsToCents(custom) },
      {
        onSuccess: (p) => {
          setDrafts(NO_DRAFTS);
          update({
            toast: `Referral bonus: ${formatCents(p.simpleBonusCents, p.currency)} per Simple CRM, ${formatCents(p.customBonusCents, p.currency)} per Custom CRM.`,
          });
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
            Clients get their referral ID on their portal’s Affiliate page once they’re in the Paid subscriber stage of your sales pipeline. Someone who signs
            up with it becomes their referral, and the bonus is earned once that new client pays for a CRM. Clients add where to send it in
            the portal.
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
        <Field label={`Bonus per Simple CRM (${program?.currency ?? "USD"})`} htmlFor="aff-simple">
          <Input
            id="aff-simple"
            inputMode="decimal"
            className="affiliate-program__amount"
            value={simple}
            readOnly={!canManage}
            aria-readonly={!canManage}
            onChange={(e) => setDrafts((d) => ({ ...d, simple: e.target.value }))}
          />
        </Field>
        <Field label={`Bonus per Custom CRM (${program?.currency ?? "USD"})`} htmlFor="aff-custom">
          <Input
            id="aff-custom"
            inputMode="decimal"
            className="affiliate-program__amount"
            value={custom}
            readOnly={!canManage}
            aria-readonly={!canManage}
            onChange={(e) => setDrafts((d) => ({ ...d, custom: e.target.value }))}
          />
        </Field>
        {canManage && (
          <div className="cluster cluster--8">
            <Button type="submit" variant="primary" disabled={!changed || save.isPending}>
              {save.isPending ? "Saving…" : "Save bonuses"}
            </Button>
            {changed && <Button onClick={() => setDrafts(NO_DRAFTS)}>Cancel</Button>}
          </div>
        )}
      </form>
      <p className="text-small">Used for every referral without its own amount. Bonuses already paid keep their amount.</p>
      <FormError error={save.error} />
    </section>
  );
}
