"use client";

import { useMemo, useState } from "react";
import { Button, LoadState, SegmentedControl, StatGrid } from "@/components/ui";
import type { BonusStatus } from "@/utils/api/models";
import { isStaffAdmin, isSuperAdmin } from "@/utils/auth/session";
import { formatCents } from "@/utils/format/money";
import { useAffiliates, useReferrals } from "@/utils/hooks/useAffiliates";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { AffiliateModal } from "./AffiliateModal";
import { AffiliatesTable } from "./AffiliatesTable";
import { ProgramCard } from "./ProgramCard";
import { LinkReferralModal } from "./ReferralModals";
import { ReferralsTable } from "./ReferralsTable";

type View = "affiliates" | "referrals";
type Filter = "all" | BonusStatus;

/**
 * Affiliates: the program's bonuses; every client in the program (Paid subscriber stage), each opening to the clients
 * they referred; and every referral with where the new client is and whether the bonus is paid.
 */
export function AffiliatesSection() {
  const { update } = useAdmin();
  // Bonus amounts, payouts and removing affiliates are owners and admins only (the API enforces it too).
  const me = useMe().data;
  const canManage = isStaffAdmin(me);
  // Who referred whom: super admins only.
  const canLink = isSuperAdmin(me);
  const query = useReferrals();
  const referrals = useMemo(() => query.data ?? [], [query.data]);
  const affiliates = useAffiliates().data ?? [];
  const [view, setView] = useState<View>("affiliates");
  const [filter, setFilter] = useState<Filter>("all");
  const [linkOpen, setLinkOpen] = useState(false);
  const [openId, setOpenId] = useState("");

  const sum = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).reduce((t, r) => t + (r.bonusCents ?? 0), 0);
  const count = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).length;
  const shown = filter === "all" ? referrals : referrals.filter((r) => r.bonusStatus === filter);

  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: "Affiliates", value: affiliates.filter((a) => !a.removedAt).length, tone: "purple", glyph: "#" },
          { label: "Referrals", value: referrals.length, tone: "cyan", glyph: "#" },
          { label: "Bonuses to pay", value: formatCents(sum("earned")), tone: "amber", glyph: "$" },
          { label: "Bonuses paid", value: formatCents(sum("paid")), tone: "green", glyph: "$" },
        ]}
      />

      <ProgramCard canManage={canManage} />

      <section className="card" aria-label="Affiliates and referrals">
        <div className="section-head">
          <SegmentedControl
            kind="tabs"
            variant="soft"
            label="Affiliates views"
            value={view}
            onChange={setView}
            options={[
              { value: "affiliates", label: "Affiliates", count: affiliates.length },
              { value: "referrals", label: "Referrals", count: referrals.length },
            ]}
          />
          {canLink && view === "referrals" && (
            <Button variant="primary" aria-haspopup="dialog" onClick={() => setLinkOpen(true)}>
              + Link a referral
            </Button>
          )}
        </div>

        {view === "affiliates" ? (
          <AffiliatesTable onOpen={(a) => setOpenId(a.id)} />
        ) : (
          <>
            <div className="affiliates-toolbar">
              <SegmentedControl
                size="sm"
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
            </div>
            <LoadState
              query={query}
              isEmpty={!shown.length}
              empty={
                referrals.length
                  ? "No referrals in this view."
                  : "No referrals yet. When someone signs up with a client’s referral ID, it shows up here."
              }
            >
              <ReferralsTable referrals={shown} canManage={canManage} />
            </LoadState>
          </>
        )}
      </section>

      <LinkReferralModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onLinked={(r) => update({ toast: `${r.referred.name || r.referred.email} is now ${r.referrer.name || r.referrer.email}’s referral.` })}
      />
      {openId && <AffiliateModal contactId={openId} canManage={canManage} onClose={() => setOpenId("")} />}
    </div>
  );
}
