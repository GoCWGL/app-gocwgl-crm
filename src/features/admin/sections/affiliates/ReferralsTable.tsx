"use client";

import { useState } from "react";
import { Badge, FormError } from "@/components/ui";
import { BONUS_STATUS, CRM_PACKAGE_LABELS, CRM_PROGRESS, formatReferralCode, payoutMethodLabel } from "@/data/affiliates";
import type { ReferralOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useDeleteReferral, useMarkBonusPaid, useUndoBonusPaid } from "@/utils/hooks/useAffiliates";
import { isSuperAdmin } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { EditReferralModal, PayoutDetailsModal } from "./ReferralModals";

/**
 * Referrals with where each new client is with their CRM and the referrer's bonus, plus the bonus actions
 * (owners and admins). Used on the Referrals tab and in an affiliate’s account (`hideReferrer`).
 */
export function ReferralsTable({ referrals, canManage, hideReferrer }: { referrals: ReferralOut[]; canManage: boolean; hideReferrer?: boolean }) {
  const { update } = useAdmin();
  // Removing a referral changes who referred whom: super admins only (the API enforces it too).
  const canRemove = isSuperAdmin(useMe().data);
  const [editing, setEditing] = useState<ReferralOut | null>(null);
  const [confirmRemove, setConfirmRemove] = useState("");
  const [payoutOf, setPayoutOf] = useState<ReferralOut | null>(null);
  const markPaid = useMarkBonusPaid();
  const undoPaid = useUndoBonusPaid();
  const remove = useDeleteReferral();
  const rowBusy = (id: string) => [markPaid, undoPaid, remove].some((m) => m.isPending && m.variables === id);

  return (
    <>
      <FormError error={markPaid.error ?? undoPaid.error ?? remove.error} />
      <div className="table-scroll">
        <table className="data-table data-table--plain referral-table">
          <thead>
            <tr>
              <th>New client (referred)</th>
              <th>{hideReferrer ? "Signed up with" : "Referrer · gets the bonus"}</th>
              <th>Joined</th>
              <th>New client’s CRM</th>
              <th>{hideReferrer ? "Their bonus" : "Referrer’s bonus"}</th>
              <th>Bonus to referrer</th>
              {canManage && <th className="data-table__actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => {
              const crm = CRM_PROGRESS[r.crm];
              const bonus = BONUS_STATUS[r.bonusStatus];
              const referred = r.referred.name || r.referred.email;
              const busy = rowBusy(r.id);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="stack stack--2">
                      <span className="u-strong u-ink">{referred}</span>
                      <span className="text-small">{[r.referred.company, r.referred.email].filter(Boolean).join(" · ")}</span>
                    </div>
                  </td>
                  {hideReferrer ? (
                    <td className="data-table__mono">{r.code ? formatReferralCode(r.code) : "Linked by the team"}</td>
                  ) : (
                    <td>
                      <div className="stack stack--2">
                        <span className="u-strong u-ink">{r.referrer.name || r.referrer.email}</span>
                        <span className="text-small data-table__mono">
                          {r.code ? formatReferralCode(r.code) : "Linked by the team"}
                        </span>
                        <span className="text-small">
                          {r.referrerPayout
                            ? `${payoutMethodLabel(r.referrerPayout.method)} · ${r.referrerPayout.summary}`
                            : "No payout details yet"}
                        </span>
                      </div>
                    </td>
                  )}
                  <td>{formatShort(r.joinedAt)}</td>
                  <td>
                    <Badge tone={crm.tone} dot>
                      {crm.label}
                    </Badge>
                    <span className="text-small referral-table__sub">
                      {[r.crmPackage && CRM_PACKAGE_LABELS[r.crmPackage], r.crmPaidAt && formatShort(r.crmPaidAt)].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="data-table__mono">
                    {r.bonusCents === null ? "—" : formatCents(r.bonusCents)}
                    {r.bonusCents === null && <span className="text-small referral-table__sub">Set by CRM package</span>}
                    {r.customBonus && r.bonusStatus !== "paid" && <span className="text-small referral-table__sub">Own amount</span>}
                  </td>
                  <td>
                    <Badge tone={bonus.tone} dot>
                      {bonus.label}
                    </Badge>
                    {r.bonusPaidAt && <span className="text-small referral-table__sub">{formatShort(r.bonusPaidAt)}</span>}
                  </td>
                  {canManage && (
                    <td className="data-table__actions">
                      {r.bonusStatus === "earned" && (
                        <button
                          type="button"
                          className="row-action row-action--green"
                          disabled={busy}
                          onClick={() =>
                            markPaid.mutate(r.id, {
                              onSuccess: () => update({ toast: `${formatCents(r.bonusCents ?? 0)} bonus marked paid to ${r.referrer.name || r.referrer.email}.` }),
                            })
                          }
                        >
                          {markPaid.isPending && markPaid.variables === r.id ? "Saving…" : "Mark bonus paid"}
                        </button>
                      )}
                      {r.bonusStatus === "paid" && (
                        <button type="button" className="row-action" disabled={busy} onClick={() => undoPaid.mutate(r.id)}>
                          Undo payout
                        </button>
                      )}
                      {r.referrerPayout && (
                        <button type="button" className="row-action row-action--cyan" onClick={() => setPayoutOf(r)}>
                          Payout details
                        </button>
                      )}
                      <button type="button" className="row-action" disabled={busy} onClick={() => setEditing(r)}>
                        {r.bonusStatus === "paid" ? "Note" : "Edit bonus"}
                      </button>
                      {!canRemove ? null : confirmRemove === r.id ? (
                        <>
                          <button
                            type="button"
                            className="row-action row-action--danger"
                            disabled={busy}
                            onClick={() => remove.mutate(r.id, { onSuccess: () => setConfirmRemove("") })}
                          >
                            Yes, remove
                          </button>
                          <button type="button" className="row-action" onClick={() => setConfirmRemove("")}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="row-action row-action--danger"
                          aria-label={`Remove the referral of ${referred}`}
                          disabled={busy}
                          onClick={() => setConfirmRemove(r.id)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <EditReferralModal referral={editing} onClose={() => setEditing(null)} />
      {payoutOf && <PayoutDetailsModal referral={payoutOf} onClose={() => setPayoutOf(null)} />}
    </>
  );
}
