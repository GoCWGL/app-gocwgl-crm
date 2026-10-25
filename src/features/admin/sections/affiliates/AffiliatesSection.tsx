"use client";

import { useMemo, useState } from "react";
import { Badge, Button, FormError, LoadState, SegmentedControl, StatGrid } from "@/components/ui";
import { BONUS_STATUS, CRM_PROGRESS, formatReferralCode } from "@/data/affiliates";
import type { BonusStatus, ReferralOut } from "@/utils/api/models";
import { isStaffAdmin } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useDeleteReferral, useMarkBonusPaid, useReferrals, useUndoBonusPaid } from "@/utils/hooks/useAffiliates";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { EditReferralModal, LinkReferralModal } from "./ReferralModals";
import { ProgramCard } from "./ProgramCard";

type Filter = "all" | BonusStatus;

/** Affiliates: the program's bonus, and every referral with where the new client is and whether the bonus is paid. */
export function AffiliatesSection() {
  const { update } = useAdmin();
  // Bonus amounts and payouts are money: owners and admins only (the API enforces it too).
  const canManage = isStaffAdmin(useMe().data);
  const query = useReferrals();
  const referrals = useMemo(() => query.data ?? [], [query.data]);
  const [filter, setFilter] = useState<Filter>("all");
  const [linkOpen, setLinkOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralOut | null>(null);
  const [confirmRemove, setConfirmRemove] = useState("");
  const markPaid = useMarkBonusPaid();
  const undoPaid = useUndoBonusPaid();
  const remove = useDeleteReferral();
  const rowBusy = (id: string) => [markPaid, undoPaid, remove].some((m) => m.isPending && m.variables === id);

  const sum = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).reduce((t, r) => t + r.bonusCents, 0);
  const count = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).length;
  const affiliates = new Set(referrals.map((r) => r.referrer.id)).size;
  const shown = filter === "all" ? referrals : referrals.filter((r) => r.bonusStatus === filter);

  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: "Referrals", value: referrals.length, tone: "cyan", glyph: "#" },
          { label: "Referring clients", value: affiliates, tone: "purple", glyph: "#" },
          { label: "Bonuses to pay", value: formatCents(sum("earned")), tone: "amber", glyph: "$" },
          { label: "Bonuses paid", value: formatCents(sum("paid")), tone: "green", glyph: "$" },
        ]}
      />

      <ProgramCard canManage={canManage} />

      <section className="card" aria-label="Referrals">
        <div className="section-head">
          <SegmentedControl
            kind="tabs"
            variant="soft"
            label="Filter referrals"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: referrals.length },
              { value: "earned", label: "To pay", count: count("earned") },
              { value: "pending", label: "Pending", count: count("pending") },
              { value: "paid", label: "Paid", count: count("paid") },
            ]}
          />
          {canManage && (
            <Button variant="primary" aria-haspopup="dialog" onClick={() => setLinkOpen(true)}>
              + Link a referral
            </Button>
          )}
        </div>
        <FormError error={markPaid.error ?? undoPaid.error ?? remove.error} />

        <LoadState
          query={query}
          isEmpty={!shown.length}
          empty={
            referrals.length
              ? "No referrals in this view."
              : "No referrals yet. When someone signs up with a client’s referral ID, it shows up here."
          }
        >
          <div className="table-scroll">
            <table className="data-table data-table--plain referral-table">
              <thead>
                <tr>
                  <th>Referred client</th>
                  <th>Referred by</th>
                  <th>Joined</th>
                  <th>CRM</th>
                  <th>Bonus</th>
                  <th>Status</th>
                  {canManage && <th className="data-table__actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
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
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{r.referrer.name || r.referrer.email}</span>
                          <span className="text-small data-table__mono">
                            {r.code ? formatReferralCode(r.code) : "Linked by the team"}
                          </span>
                        </div>
                      </td>
                      <td>{formatShort(r.joinedAt)}</td>
                      <td>
                        <Badge tone={crm.tone} dot>
                          {crm.label}
                        </Badge>
                        {r.crmPaidAt && <span className="text-small referral-table__sub">{formatShort(r.crmPaidAt)}</span>}
                      </td>
                      <td className="data-table__mono">
                        {formatCents(r.bonusCents)}
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
                                  onSuccess: () => update({ toast: `${formatCents(r.bonusCents)} bonus marked paid to ${r.referrer.name || r.referrer.email}.` }),
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
                          <button type="button" className="row-action" disabled={busy} onClick={() => setEditing(r)}>
                            {r.bonusStatus === "paid" ? "Note" : "Edit bonus"}
                          </button>
                          {confirmRemove === r.id ? (
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
        </LoadState>
      </section>

      <LinkReferralModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onLinked={(r) => update({ toast: `${r.referred.name || r.referred.email} is now ${r.referrer.name || r.referrer.email}’s referral.` })}
      />
      <EditReferralModal referral={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
