"use client";

import { useVaAccess } from "../lib/access";
import { Badge, Button, Icon, IconTile, LoadState } from "@/components/ui";
import type { MyReferralOut } from "@/utils/api/models";
import { errorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useClaimReferral, useMyReferrals } from "@/utils/hooks/useVaPortal";
import { BONUS_DAYS, BONUS_HOURS, bonusProgress } from "@/lib/referralBonus";

const BONUS = {
  pending: { label: "Counting down", tone: "amber" },
  earned: { label: "Earned", tone: "green" },
  claimed: { label: "Claimed", tone: "sky" },
  paid: { label: "Paid", tone: "slate" },
} as const;

/** VA portal › Referrals: VAs this VA referred, and the bonus for each. */
export function ReferralsSection() {
  const va = useVaAccess().ready;
  const query = useMyReferrals(va);
  const d = query.data;

  const rows = d?.referrals ?? [];
  const earned = rows.filter((r) => r.bonusStatus === "earned").reduce((t, r) => t + r.bonusCents, 0);
  const toClaim = rows.filter((r) => r.bonusStatus === "earned" && !r.claimedAt).length;
  const paid = rows.filter((r) => r.bonusStatus === "paid").reduce((t, r) => t + r.bonusCents, 0);

  return (
    <div className="page-stack">
      <section className="card va-ref-hero">
        <IconTile tone="green" size="lg">
          <Icon name="gift" size={20} />
        </IconTile>
        <span className="stack stack--4 u-grow">
          <strong className="va-ref-hero__title">Earn {formatCentsExact(d?.programBonusCents ?? 7000).replace(/\.00$/, "")} for every VA you refer</strong>
          <span className="text-small">
            Ask them to choose <strong>Apply as a VA</strong> on the GoCWGL sign-in page, pick <strong>“A friend or referral”</strong> under “How
            did you hear about us?”, and type your name. Your bonus is earned once they’ve tracked {BONUS_HOURS}+ hours of client work a day on {BONUS_DAYS} days (any
            days, all their clients together).
          </span>
        </span>
      </section>

      <div className="card va-clients-sum">
        <Sum label="VAs referred" value={String(rows.length)} />
        <Sum label="Now active" value={String(rows.filter((r) => r.status === "active").length)} />
        <Sum label={toClaim ? `Earned · ${toClaim} to claim` : "Earned, to be paid"} value={formatCentsExact(earned)} green />
        <Sum label="Paid to you" value={formatCentsExact(paid)} />
      </div>

      <LoadState query={query} loadingText="Loading your referrals…">
        <section className="card stack stack--10">
          <span className="kicker">YOUR REFERRALS</span>
          {rows.length ? (
            rows.map((r) => <ReferralRow key={r.id} r={r} />)
          ) : (
            <span className="vp-empty">No referrals yet. When someone applies with your name as their referrer, they show up here.</span>
          )}
        </section>
      </LoadState>
    </div>
  );
}

/**
 * One VA you referred: a countdown to the bonus (days with 8+ hours, out of 30), then "Claim bonus" once it's earned.
 * Claiming tells GoCWGL's team to pay you.
 */
function ReferralRow({ r }: { r: MyReferralOut }) {
  const claim = useClaimReferral();
  const days = Math.min(BONUS_DAYS, r.qualifyingDays ?? 0);
  const today = r.todaySeconds ?? 0;
  const left = BONUS_DAYS - days;
  const status = r.bonusStatus === "paid" ? "paid" : r.claimedAt ? "claimed" : r.bonusStatus;
  return (
    <div className={`va-ref-row is-${status}`}>
      <span className="stack stack--2 u-grow u-minw0">
        <span className="text-strong">{r.name}</span>
        <span className="text-small">
          Referred {formatShort(r.createdAt)} · {r.status === "active" ? "Active VA" : r.status === "onboarding" ? "Onboarding" : "Inactive"}
        </span>
        {status === "pending" && (
          <span className="va-ref-row__count">
            <span className="va-ref-row__bar" role="progressbar" aria-valuemin={0} aria-valuemax={BONUS_DAYS} aria-valuenow={days} aria-label="Days with 8+ hours">
              <span style={{ width: `${(days / BONUS_DAYS) * 100}%` }} />
            </span>
            <span className="text-small">
              <strong>
                {left} day{left === 1 ? "" : "s"} to go
              </strong>{" "}
              · {days} of {BONUS_DAYS} days with {BONUS_HOURS}+ hours
            </span>
            {/* Today's hours: the day counts at 8; under 8 the countdown just waits (nothing is lost). */}
            <span className="text-small">
              Today: {hm(today)} of {BONUS_HOURS}h
              {today >= BONUS_HOURS * 3600 ? " · counted" : " · the countdown pauses until they reach 8h"}
            </span>
            {r.restartedOn && (
              <span className="text-small u-strong">
                Restarted at 0 on {formatShort(r.restartedOn)}: their last client cancelled.
              </span>
            )}
          </span>
        )}
        {status === "earned" && <span className="text-small u-green">{bonusProgress(r)} · claim it to get paid</span>}
        {status === "claimed" && <span className="text-small">Claimed {formatShort(r.claimedAt!)} · GoCWGL will pay you soon</span>}
        {status === "paid" && r.bonusPaidAt && <span className="text-small">Paid {formatShort(r.bonusPaidAt)}</span>}
        {claim.error ? (
          <span className="field__error" role="alert">
            {errorMessage(claim.error)}
          </span>
        ) : null}
      </span>
      <span className="tt-mono u-strong">{formatCentsExact(r.bonusCents)}</span>
      {status === "earned" ? (
        <Button variant="primary" size="sm" disabled={claim.isPending} onClick={() => claim.mutate(r.id)}>
          <Icon name="gift" size={13} /> {claim.isPending ? "Claiming…" : "Claim bonus"}
        </Button>
      ) : (
        <Badge tone={BONUS[status].tone} dot>
          {BONUS[status].label}
        </Badge>
      )}
    </div>
  );
}

/** 5h 20m */
const hm = (secs: number) => `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}m`;

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
