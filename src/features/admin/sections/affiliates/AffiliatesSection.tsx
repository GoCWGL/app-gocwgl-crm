"use client";

import { useMemo, useState } from "react";
import { Button, LoadState, SegmentedControl, StatGrid, Tabs } from "@/components/ui";
import type { BonusStatus } from "@/utils/api/models";
import { isStaffAdmin, isSuperAdmin } from "@/utils/auth/session";
import { formatCents } from "@/utils/format/money";
import { useAffiliates, useReferrals, useVaReferrals } from "@/utils/hooks/useAffiliates";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { AffiliateModal } from "./AffiliateModal";
import { AffiliatesTable } from "./AffiliatesTable";
import { ProgramCard } from "./ProgramCard";
import { LinkReferralModal } from "./ReferralModals";
import { ReferralsTable } from "./ReferralsTable";
import { VaReferralsPanel } from "./VaReferralsPanel";

type View = "affiliates" | "referrals";
type Filter = "all" | BonusStatus;

type ReferralKind = "clients" | "vas";

/** Finance › Referral bonus: client referrals (affiliate program) and VA referrals, one tab each. */
export function ReferralBonusSection() {
  const canManage = isStaffAdmin(useMe().data);
  // In the admin state, so the bell (a claimed bonus) and links (?referrals=vas) can open VA referrals.
  const { state, update } = useAdmin();
  const kind: ReferralKind = state.referralKind;
  const setKind = (referralKind: ReferralKind) => update({ referralKind });
  const clients = useReferrals().data;
  const vas = useVaReferrals().data;
  const toPay = (list: Array<{ bonusStatus: string }> | undefined) => list?.filter((r) => r.bonusStatus === "earned").length ?? 0;
  return (
    <div className="stack stack--16">
      <div className="card card--flat board board--bar-only">
        <div className="board__bar">
          <Tabs<ReferralKind>
            label="Referral bonus"
            value={kind}
            onChange={setKind}
            options={[
              {
                value: "clients",
                label: "Client referrals",
                hint: toPay(clients) ? `${toPay(clients)} bonus${toPay(clients) === 1 ? "" : "es"} to pay` : "Clients who refer clients",
                icon: "users",
                count: clients ? clients.length : "–",
              },
              {
                value: "vas",
                label: "VA referrals",
                hint: toPay(vas) ? `${toPay(vas)} bonus${toPay(vas) === 1 ? "" : "es"} to pay` : "People who refer VAs",
                icon: "briefcase",
                tone: "cyan",
                count: vas ? vas.length : "–",
              },
            ]}
          />
        </div>
      </div>
      {kind === "clients" ? <AffiliatesPage view="referrals" /> : <VaReferralsPanel canManage={canManage} />}
    </div>
  );
}

/** Finance › Affiliates: the clients in the program. */
export function AffiliatesSection() {
  return <AffiliatesPage view="affiliates" />;
}

/**
 * Affiliates: the program's bonuses; every client in the program (Paid subscriber stage), each opening to the clients
 * they referred; and every referral with where the new client is and whether the bonus is paid.
 */
function AffiliatesPage({ view }: { view: View }) {
  const { update } = useAdmin();
  // Bonus amounts, payouts and removing affiliates are owners and admins only (the API enforces it too).
  const me = useMe().data;
  const canManage = isStaffAdmin(me);
  // Who referred whom: super admins only.
  const canLink = isSuperAdmin(me);
  const query = useReferrals();
  const referrals = useMemo(() => query.data ?? [], [query.data]);
  const affiliates = useAffiliates().data ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [linkOpen, setLinkOpen] = useState(false);
  const [openId, setOpenId] = useState("");

  const sum = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).reduce((t, r) => t + (r.bonusCents ?? 0), 0);
  const count = (status: BonusStatus) => referrals.filter((r) => r.bonusStatus === status).length;
  const shown = filter === "all" ? referrals : referrals.filter((r) => r.bonusStatus === filter);

  return (
    <div className="stack stack--16">
      <StatGrid
        items={
          view === "referrals"
            ? [
                { label: "Referrals", value: referrals.length, tone: "cyan", glyph: "#" },
                { label: "Bonuses to pay", value: formatCents(sum("earned")), tone: "amber", glyph: "$" },
                { label: "Bonuses pending", value: formatCents(sum("pending")), tone: "purple", glyph: "$" },
                { label: "Bonuses paid", value: formatCents(sum("paid")), tone: "green", glyph: "$" },
              ]
            : [
                { label: "Affiliates", value: affiliates.filter((a) => !a.removedAt).length, tone: "purple", glyph: "#" },
                { label: "Referrals", value: referrals.length, tone: "cyan", glyph: "#" },
                { label: "Bonuses to pay", value: formatCents(sum("earned")), tone: "amber", glyph: "$" },
                { label: "Bonuses paid", value: formatCents(sum("paid")), tone: "green", glyph: "$" },
              ]
        }
      />

      {view === "referrals" && <ProgramCard canManage={canManage} />}

      <section className="card" aria-label={view === "referrals" ? "Referrals" : "Affiliates"}>
        <div className="section-head">
          <span className="kicker">
            {view === "referrals" ? `REFERRALS · ${referrals.length}` : `AFFILIATES · ${affiliates.length}`}
          </span>
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
