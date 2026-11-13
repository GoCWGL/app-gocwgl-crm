"use client";

import { useVaAccess } from "../lib/access";
import { Badge, Icon, IconTile, LoadState } from "@/components/ui";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMyReferrals } from "@/utils/hooks/useVaPortal";

const BONUS = {
  pending: { label: "Pending", tone: "amber", hint: "Paid once they’re an active VA" },
  earned: { label: "Earned", tone: "green", hint: "GoCWGL will pay you" },
  paid: { label: "Paid", tone: "slate", hint: "" },
} as const;

/** VA portal › Referrals: VAs this VA referred, and the bonus for each. */
export function ReferralsSection() {
  const va = useVaAccess().ready;
  const query = useMyReferrals(va);
  const d = query.data;

  const rows = d?.referrals ?? [];
  const earned = rows.filter((r) => r.bonusStatus === "earned").reduce((t, r) => t + r.bonusCents, 0);
  const paid = rows.filter((r) => r.bonusStatus === "paid").reduce((t, r) => t + r.bonusCents, 0);

  return (
    <div className="page-stack">
      <section className="card va-ref-hero">
        <IconTile tone="green" size="lg">
          <Icon name="gift" size={20} />
        </IconTile>
        <span className="stack stack--4 u-grow">
          <strong className="va-ref-hero__title">Earn {formatCentsExact(d?.programBonusCents ?? 2500).replace(/\.00$/, "")} for every VA you refer</strong>
          <span className="text-small">
            Ask them to choose <strong>Apply as a VA</strong> on the GoCWGL sign-in page, pick <strong>“A friend or referral”</strong> under “How
            did you hear about us?”, and type your name. Your bonus is earned once they become an active VA.
          </span>
        </span>
      </section>

      <div className="card va-clients-sum">
        <Sum label="VAs referred" value={String(rows.length)} />
        <Sum label="Now active" value={String(rows.filter((r) => r.status === "active").length)} />
        <Sum label="Earned, to be paid" value={formatCentsExact(earned)} green />
        <Sum label="Paid to you" value={formatCentsExact(paid)} />
      </div>

      <LoadState query={query} loadingText="Loading your referrals…">
        <section className="card stack stack--10">
          <span className="kicker">YOUR REFERRALS</span>
          {rows.length ? (
            rows.map((r) => (
              <div key={r.id} className="list-row list-row--nowrap">
                <span className="stack stack--2 u-grow">
                  <span className="text-strong">{r.name}</span>
                  <span className="text-small">
                    Referred {formatShort(r.createdAt)} · {r.status === "active" ? "Active VA" : r.status === "onboarding" ? "Onboarding" : "Inactive"}
                  </span>
                </span>
                <span className="tt-mono u-strong">{formatCentsExact(r.bonusCents)}</span>
                <Badge tone={BONUS[r.bonusStatus].tone} dot>
                  {BONUS[r.bonusStatus].label}
                  {r.bonusStatus === "paid" && r.bonusPaidAt ? ` ${formatShort(r.bonusPaidAt)}` : ""}
                </Badge>
              </div>
            ))
          ) : (
            <span className="vp-empty">No referrals yet. When someone applies with your name as their referrer, they show up here.</span>
          )}
        </section>
      </LoadState>
    </div>
  );
}

function Sum({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className={`va-clients-sum__stat${green ? " is-green" : ""}`}>
      <span className="stack stack--2">
        <span className="va-clients-sum__label">{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
