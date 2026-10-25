"use client";

import { useState, type FormEvent } from "react";
import { EMPTY_PAYOUT, PayoutFields, payoutBody, payoutProblem, type PayoutDraft } from "@/components/affiliates/PayoutFields";
import { Avatar, Button, Field, Icon, FormError, Input, LoadState, Modal, StatGrid } from "@/components/ui";
import { formatReferralCode, payoutMethodLabel } from "@/data/affiliates";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { AffiliateDetailOut } from "@/utils/api/models";
import { firstErrorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useAffiliate, useRemoveAffiliatePayout, useSetAffiliatePayout, useUpdateAffiliate } from "@/utils/hooks/useAffiliates";
import { useAdmin } from "../../state/AdminContext";
import { ReferralsTable } from "./ReferralsTable";

const WIDE_KEY = "gocwgl.affiliate-modal.wide";

/** Widened or not, remembered in this browser (storage can be unavailable, e.g. in a private window). */
function useWide(): [boolean, (wide: boolean) => void] {
  const [wide, setWide] = useState(() => {
    try {
      return localStorage.getItem(WIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const set = (next: boolean) => {
    setWide(next);
    try {
      localStorage.setItem(WIDE_KEY, next ? "1" : "0");
    } catch {
      // Not remembered; still works for this visit.
    }
  };
  return [wide, set];
}

/** One affiliate's account: their referral ID, payout details and totals, every client they referred, and team actions. */
export function AffiliateModal({ contactId, canManage, onClose }: { contactId: string; canManage: boolean; onClose: () => void }) {
  const { update } = useAdmin();
  const query = useAffiliate(contactId);
  const a = query.data;
  const save = useUpdateAffiliate();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const who = a ? a.name || a.email : "";
  const [wide, setWide] = useWide();

  const setRemoved = (removed: boolean) =>
    save.mutate(
      { contactId, body: { removed } },
      {
        onSuccess: () => {
          setConfirmRemove(false);
          update({ toast: removed ? `${who} was removed from the affiliate program.` : `${who} is an affiliate again.` });
        },
      },
    );

  return (
    <>
      <Modal
        open
        className={cn("affiliate-modal", wide && "affiliate-modal--wide")}
        headerActions={
          <button
            type="button"
            className="icon-btn icon-btn--lg"
            onClick={() => setWide(!wide)}
            aria-pressed={wide}
            aria-label={wide ? "Make narrower" : "Widen"}
            title={wide ? "Make narrower" : "Widen"}
          >
            <Icon name={wide ? "shrink" : "expand"} size={17} />
          </button>
        }
        onClose={onClose}
        titleId="affiliate-title"
        kicker="AFFILIATE"
        title={who || "Affiliate"}
        subtitle={a ? [a.company, a.email].filter(Boolean).join(" · ") : undefined}
        width={880}
        media={a && <Avatar name={who} tone={avatarTone(a.id)} size="md" />}
        footer={
          canManage && a ? (
            <>
              {a.removedAt ? (
                <Button variant="primary" disabled={save.isPending} onClick={() => setRemoved(false)}>
                  Restore to the program
                </Button>
              ) : confirmRemove ? (
                <>
                  <Button variant="danger-solid" disabled={save.isPending} onClick={() => setRemoved(true)}>
                    Yes, remove from the program
                  </Button>
                  <Button onClick={() => setConfirmRemove(false)}>Keep</Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirmRemove(true)}>
                  Remove from the program
                </Button>
              )}
              <span className="u-spacer" />
              <Button onClick={() => update({ editContactId: a.id })}>Edit contact</Button>
              <Button variant="primary" onClick={() => setEditing(true)}>
                Edit affiliate details
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )
        }
      >
        <LoadState query={query}>
          {a && (
            <div className="stack stack--16">
              {a.removedAt && (
                <div className="notice notice--warning" role="status">
                  Removed from the program on {formatShort(a.removedAt)}. Their referral ID no longer works and their Affiliate page is
                  locked. Their referrals and bonuses are kept.
                </div>
              )}
              {confirmRemove && (
                <div className="notice notice--warning" role="status">
                  Removing {who} locks their Affiliate page and stops their referral ID working at sign-up. You can restore them later.
                </div>
              )}

              <dl className="payout-details affiliate-facts">
                <dt>Referral ID</dt>
                <dd className="data-table__mono">{formatReferralCode(a.referralCode)}</dd>
                <dt>Pipeline stage</dt>
                <dd>{a.stage === "paid" ? "Paid subscriber" : a.stage}</dd>
                <dt>Payout</dt>
                <dd>
                  {a.payout ? `${payoutMethodLabel(a.payout.method)} · ${a.payout.holderName} · ${a.payout.summary}` : "Not added yet"}
                </dd>
                {a.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>{a.phone}</dd>
                  </>
                )}
              </dl>

              <StatGrid
                items={[
                  { label: "Referrals", value: a.referralsCount, tone: "cyan", glyph: "#" },
                  { label: "Earned", value: formatCents(a.earnedCents), tone: "amber", glyph: "$" },
                  { label: "Paid to them", value: formatCents(a.paidCents), tone: "green", glyph: "$" },
                  { label: "To pay", value: formatCents(a.owedCents), tone: a.owedCents ? "amber" : "slate", glyph: "$" },
                ]}
              />

              <div className="stack stack--8">
                <span className="text-strong">Clients they referred</span>
                {a.referrals.length ? (
                  <ReferralsTable referrals={a.referrals} canManage={canManage} hideReferrer />
                ) : (
                  <p className="text-small">No referrals yet.</p>
                )}
              </div>
              <FormError error={save.error} />
            </div>
          )}
        </LoadState>
      </Modal>
      {/* Beside the drawer, not inside it, so it opens as a normal dialog on top. */}
      {editing && a && <EditAffiliateModal affiliate={a} onClose={() => setEditing(false)} />}
    </>
  );
}

/** The team changes an affiliate's referral ID and enters or corrects their payout details. */
function EditAffiliateModal({ affiliate: a, onClose }: { affiliate: AffiliateDetailOut; onClose: () => void }) {
  const { update } = useAdmin();
  const saveAffiliate = useUpdateAffiliate();
  const savePayout = useSetAffiliatePayout();
  const removePayout = useRemoveAffiliatePayout();
  const [code, setCode] = useState(a.referralCode);
  // Saved details come back masked, so changing them means entering them again.
  const [changePayout, setChangePayout] = useState(!a.payout);
  const [payout, setPayout] = useState<PayoutDraft>({
    ...EMPTY_PAYOUT,
    ...(a.payout && { method: a.payout.method, holderName: a.payout.holderName }),
  });
  const [tried, setTried] = useState(false);
  const typedPayout = changePayout && (!!a.payout || payout.holderName.trim() !== "" || payout.email !== "" || payout.accountNumber !== "");
  const problem = typedPayout ? payoutProblem(payout) : "";
  const busy = saveAffiliate.isPending || savePayout.isPending || removePayout.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (problem || !code.trim()) return;
    try {
      if (code.trim() !== a.referralCode) await saveAffiliate.mutateAsync({ contactId: a.id, body: { referralCode: code } });
      if (typedPayout) await savePayout.mutateAsync({ contactId: a.id, body: payoutBody(payout) });
      update({ toast: `${a.name || a.email}’s affiliate details saved.` });
      onClose();
    } catch {
      // The error shows under the form.
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="edit-affiliate-title"
      kicker="AFFILIATE"
      title={`Edit ${a.name || a.email}`}
      width={620}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        <Field
          label="Referral ID"
          htmlFor="aff-code"
          strongLabel
          hint="4 to 16 letters and numbers. Changing it stops the old ID working, so tell the client."
          error={tried && !code.trim() ? "Enter a referral ID." : ""}
        >
          <Input id="aff-code" mono value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </Field>

        <div className="stack stack--10">
          <span className="text-strong">Payout details</span>
          {a.payout && !changePayout ? (
            <div className="inset payout-card__saved">
              <span className="text-small">
                {payoutMethodLabel(a.payout.method)} · {a.payout.holderName} · {a.payout.summary}
              </span>
              <div className="cluster cluster--8">
                <Button size="sm" variant="outline" onClick={() => setChangePayout(true)}>
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => removePayout.mutate(a.id, { onSuccess: () => update({ toast: "Payout details removed." }) })}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!a.payout && <p className="text-small">Optional: leave it empty and the client can add it on their Affiliate page.</p>}
              <PayoutFields draft={payout} onChange={(patch) => setPayout((d) => ({ ...d, ...patch }))} idPrefix="aff-po" />
            </>
          )}
          {tried && problem && (
            <span className="field__error" role="alert">
              {problem}
            </span>
          )}
        </div>

        {saveAffiliate.error || savePayout.error || removePayout.error ? (
          <span className="field__error" role="alert">
            {firstErrorMessage(saveAffiliate.error ?? savePayout.error ?? removePayout.error)}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}
