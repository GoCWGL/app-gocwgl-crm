"use client";

import { Badge, Button, ErrorState, Icon, IconTile, Loading, StatGrid } from "@/components/ui";
import { BONUS_STATUS, CRM_PACKAGE_LABELS, CRM_PROGRESS, formatReferralCode, referralLink } from "@/data/affiliates";
import { copyToClipboard } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useMyAffiliate } from "@/utils/hooks/useAffiliates";
import { PayoutCard } from "../components/PayoutCard";
import { usePortal } from "../state/PortalContext";

/**
 * Affiliate: the client's own referral ID, everyone who signed up with it, and the bonus for each.
 * A bonus is earned when the referred client pays for their CRM; the GoCWGL team pays it and marks it paid.
 */
export function AffiliateSection() {
  const { notify } = usePortal();
  const query = useMyAffiliate();

  if (query.isPending) return <Loading text="Loading your referrals…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const a = query.data;
  const money = (cents: number) => formatCents(cents, a.currency);
  const bonuses = `${money(a.simpleBonusCents)} for a Simple CRM build and ${money(a.customBonusCents)} for a Custom CRM build`;

  if (!a.unlocked) {
    return (
      <section className="card affiliate-locked">
        <IconTile tone="slate" size="lg">
          <Icon name="lock" size={20} />
        </IconTile>
        <span className="text-strong affiliate-hero__title">Your Affiliate page opens once you’re a paid subscriber</span>
        <p className="text-small">As a paid GoCWGL subscriber you’ll get your own referral ID here. Refer a business and earn {bonuses}.</p>
      </section>
    );
  }
  const link = referralLink(a.referralCode);

  return (
    <div className="page-stack">
      <section className="card affiliate-hero">
        <div className="cluster cluster--nowrap affiliate-hero__head">
          <IconTile tone="amber" size="lg">
            <Icon name="gift" size={20} />
          </IconTile>
          <div className="stack stack--4 u-grow">
            <span className="text-strong affiliate-hero__title">
              Refer a business, earn up to {money(Math.max(a.simpleBonusCents, a.customBonusCents))}
            </span>
            <span className="text-small">
              Share your referral ID. When someone signs up with it and goes ahead with a CRM build from GoCWGL, you earn {bonuses}.
            </span>
          </div>
        </div>

        {!a.enabled && (
          <div className="notice notice--warning" role="status">
            The referral program is paused right now. New sign-ups won’t be linked to you until it’s back on.
          </div>
        )}

        <div className="affiliate-hero__code">
          <div className="stack stack--2">
            <span className="kicker kicker--sm kicker--muted">YOUR REFERRAL ID</span>
            <span className="affiliate-hero__id" aria-label={`Referral ID ${a.referralCode.split("").join(" ")}`}>
              {formatReferralCode(a.referralCode)}
            </span>
          </div>
          <div className="cluster cluster--8">
            <Button
              variant="primary"
              onClick={() => {
                copyToClipboard(a.referralCode);
                notify("Referral ID copied.");
              }}
            >
              <Icon name="copy" size={14} /> Copy ID
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                copyToClipboard(link);
                notify("Sign-up link copied. It fills in your referral ID.");
              }}
            >
              <Icon name="link" size={14} /> Copy sign-up link
            </Button>
          </div>
        </div>
        <p className="text-small">
          They can type your ID in the <span className="u-strong">Referral ID</span> field when they create their account, or open your
          sign-up link, which fills it in for them.
        </p>
      </section>

      <PayoutCard payout={a.payout} bonuses={bonuses} />

      <StatGrid
        items={[
          { label: "Referrals", value: String(a.referrals.length), tone: "cyan" },
          { label: "Bonuses earned", value: money(a.earnedCents), tone: "amber" },
          { label: "Paid to you", value: money(a.paidCents), tone: "green" },
          { label: "To be paid", value: money(a.owedCents), tone: a.owedCents ? "amber" : "slate" },
        ]}
      />

      <section className="card card--table" aria-label="Your referrals">
        {a.referrals.length === 0 ? (
          <p className="table-empty">No referrals yet. Share your referral ID and they’ll show up here once they sign up.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table referral-table">
              <thead>
                <tr>
                  <th>Business you referred</th>
                  <th>Joined</th>
                  <th>CRM</th>
                  <th>Your bonus</th>
                  <th>Your bonus status</th>
                </tr>
              </thead>
              <tbody>
                {a.referrals.map((r) => {
                  const crm = CRM_PROGRESS[r.crm];
                  const bonus = BONUS_STATUS[r.bonusStatus];
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="stack stack--2">
                          <span className="u-strong u-ink">{r.name || r.email}</span>
                          <span className="text-small">{[r.company, r.email].filter(Boolean).join(" · ")}</span>
                        </div>
                      </td>
                      <td>{formatShort(r.joinedAt)}</td>
                      <td>
                        <Badge tone={crm.tone} dot>
                          {crm.label}
                        </Badge>
                        <span className="text-small referral-table__sub">
                          {[r.crmPackage && CRM_PACKAGE_LABELS[r.crmPackage], r.crmPaidAt && `Paid ${formatShort(r.crmPaidAt)}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </td>
                      <td className="data-table__mono">
                        {r.bonusCents === null ? (
                          <span className="text-small">
                            {money(a.simpleBonusCents)} or {money(a.customBonusCents)}
                          </span>
                        ) : (
                          money(r.bonusCents)
                        )}
                      </td>
                      <td>
                        <Badge tone={bonus.tone} dot>
                          {r.bonusStatus === "earned" ? "Earned · on its way" : bonus.label}
                        </Badge>
                        {r.bonusPaidAt && <span className="text-small referral-table__sub">Paid {formatShort(r.bonusPaidAt)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
