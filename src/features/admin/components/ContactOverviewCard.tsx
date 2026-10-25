"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Icon } from "@/components/ui";
import { formatReferralCode, payoutMethodLabel } from "@/data/affiliates";
import { copyToClipboard } from "@/lib/utils";
import type { ContactOut } from "@/utils/api/models";
import { isStaffAdmin } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { formatCents, formatPerInterval } from "@/utils/format/money";
import { useAffiliate, useContactReferrer, usePayoutDetails } from "@/utils/hooks/useAffiliates";
import { useInvoices, useSubscriptions } from "@/utils/hooks/useBilling";
import { usePortalLogin } from "@/utils/hooks/useContacts";
import { useCrmRequests, useProjects } from "@/utils/hooks/useDelivery";
import { useTickets } from "@/utils/hooks/useSupport";
import { useCanUseMenu, useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

const OPEN_INVOICE = new Set(["Sent", "Overdue"]);
const LOGIN_LABELS: Record<string, string> = {
  active: "Can sign in",
  invited: "Invite sent",
  disabled: "Login removed",
  none: "No login yet",
  taken: "Email in use by another login",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const { update } = useAdmin();
  return (
    <button
      type="button"
      className="glance__copy"
      onClick={() => {
        copyToClipboard(value);
        update({ toast: `${label} copied.` });
      }}
      title={`Copy ${label.toLowerCase()}`}
    >
      <Icon name="copy" size={12} />
    </button>
  );
}

/**
 * Everything linked to this client's account in one place: portal login, billing (with open invoices' payment links),
 * builds, CRM requests, support, and the affiliate side (referral ID, who referred them, payout details).
 */
export function ContactOverviewCard({ contact: c }: { contact: ContactOut }) {
  const isAdmin = isStaffAdmin(useMe().data);
  const login = usePortalLogin(c.id).data;
  const subs = useSubscriptions(c.id).data ?? [];
  const invoices = useInvoices({ contact_id: c.id }).data ?? [];
  const builds = (useProjects().data ?? []).filter((p) => p.contactId === c.id);
  const crmRequests = (useCrmRequests().data ?? []).filter((r) => r.contactId === c.id);
  const tickets = useTickets({ contact_id: c.id }).data ?? [];
  const affiliate = useAffiliate(c.id).data;
  const referrer = useContactReferrer(c.id).data;
  const [showPayout, setShowPayout] = useState(false);
  // Only the parts of the account this teammate's menus cover (Settings › Team › Menus).
  const seeBilling = useCanUseMenu("payments");
  const seeBuilds = useCanUseMenu("progress");
  const seeSupport = useCanUseMenu("bugs");
  const seeAffiliate = useCanUseMenu("affiliates");

  const open = invoices.filter((i) => OPEN_INVOICE.has(i.status));
  const paidCents = invoices.filter((i) => i.status === "Paid").reduce((t, i) => t + i.totalCents, 0);
  const openTickets = tickets.filter((t) => t.status !== "Done").length;
  const affiliateStatus = !affiliate
    ? "…"
    : affiliate.removedAt
      ? "Removed from the program"
      : affiliate.stage === "paid"
        ? "Active affiliate"
        : "Not yet (paid subscribers only)";

  return (
    <div className="inset glance">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-cyan" aria-hidden="true">
          <Icon name="grid" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">ACCOUNT AT A GLANCE</span>
          <span className="text-tiny">Everything connected to {c.name || c.email}’s account.</span>
        </span>
      </div>

      <div className="glance__grid">
        <section className="glance__group" aria-label="Account">
          <span className="glance__title">Account</span>
          <dl className="glance__facts">
            <Row label="Signed up">
              {formatShort(c.createdAt)} · {c.source}
            </Row>
            <Row label="Portal login">{login ? (LOGIN_LABELS[login.status] ?? login.status) : "…"}</Row>
            {seeSupport && <Row label="Support">{tickets.length ? `${openTickets} open · ${tickets.length} total` : "No requests"}</Row>}
          </dl>
        </section>

        {seeBilling && (
          <section className="glance__group" aria-label="Billing">
            <span className="glance__title">Billing</span>
            <dl className="glance__facts">
              <Row label="Subscription">
                {subs.length
                  ? subs.map((s) => (
                      <span key={s.id} className="glance__line">
                        {s.plan} · {formatPerInterval(s.amountCents, s.interval, s.currency)} · {s.status}
                        {s.nextBillingDate && s.status !== "Canceled" ? ` · next ${formatShort(s.nextBillingDate)}` : ""}
                      </span>
                    ))
                  : "None"}
              </Row>
              <Row label="Paid so far">{formatCents(paidCents)}</Row>
              <Row label="Open invoices">
                {open.length
                  ? open.map((i) => (
                      <span key={i.id} className="glance__line">
                        {i.number} · {formatCents(i.totalCents, i.currency)} · {i.status}
                        {i.dueDate ? ` · due ${formatShort(i.dueDate)}` : ""}
                        {i.paymentUrl && (
                          <>
                            {" · "}
                            <a href={i.paymentUrl} target="_blank" rel="noopener noreferrer">
                              Payment link
                            </a>
                            <CopyValue value={i.paymentUrl} label="Payment link" />
                          </>
                        )}
                      </span>
                    ))
                  : "None"}
              </Row>
            </dl>
          </section>
        )}

        {seeBuilds && (
          <section className="glance__group" aria-label="Builds">
            <span className="glance__title">Builds &amp; requests</span>
            <dl className="glance__facts">
              <Row label="Builds">
                {builds.length
                  ? builds.map((p) => (
                      <span key={p.id} className="glance__line">
                        {p.package} · {p.kind === "crm" ? "CRM" : "Funnel"} · {p.status} · {p.progress}%
                      </span>
                    ))
                  : "None"}
              </Row>
              <Row label="CRM requests">
                {crmRequests.length
                  ? crmRequests.map((r) => (
                      <span key={r.id} className="glance__line">
                        {r.name} · {r.package === "custom" ? "Custom" : "Simple"} · {r.status}
                        {r.invoice ? ` · invoice ${r.invoice.status.toLowerCase()}` : ""}
                      </span>
                    ))
                  : "None"}
              </Row>
            </dl>
          </section>
        )}

        {seeAffiliate && (
          <section className="glance__group" aria-label="Affiliate">
            <span className="glance__title">Affiliate</span>
            <dl className="glance__facts">
              <Row label="Referral ID">
                {affiliate ? (
                  <>
                    <span className="data-table__mono">{formatReferralCode(affiliate.referralCode)}</span>
                    <CopyValue value={affiliate.referralCode} label="Referral ID" />
                  </>
                ) : (
                  "…"
                )}
              </Row>
              <Row label="Status">{affiliateStatus}</Row>
              <Row label="Referred by">
                {referrer?.referrer
                  ? `${referrer.referrer.name || referrer.referrer.email}${referrer.code ? ` (ID ${formatReferralCode(referrer.code)})` : " (set by the team)"}`
                  : "No one"}
              </Row>
              <Row label="Their referrals">
                {affiliate
                  ? affiliate.referralsCount
                    ? `${affiliate.referralsCount} · earned ${formatCents(affiliate.earnedCents)} · to pay ${formatCents(affiliate.owedCents)}`
                    : "None yet"
                  : "…"}
              </Row>
              <Row label="Payout">
                {affiliate?.payout ? (
                  <span className="glance__line">
                    {payoutMethodLabel(affiliate.payout.method)} · {affiliate.payout.holderName} · {affiliate.payout.summary}
                    {isAdmin && !showPayout && (
                      <Button size="sm" variant="link" onClick={() => setShowPayout(true)}>
                        Show details
                      </Button>
                    )}
                  </span>
                ) : (
                  "Not added"
                )}
              </Row>
            </dl>
            {showPayout && affiliate?.payout && <PayoutReveal contactId={c.id} />}
          </section>
        )}
      </div>
      {affiliate?.removedAt && (
        <Badge tone="neutral" dot>
          Removed from the affiliate program {formatShort(affiliate.removedAt)}
        </Badge>
      )}
    </div>
  );
}

const DETAIL_LABELS: Record<string, string> = {
  email: "Account email",
  payment_link: "Wise payment link",
  bank_name: "Bank",
  account_number: "Account number",
  routing_number: "Routing number",
  swift: "SWIFT / BIC",
  country: "Country",
};

/** The full payout details, fetched only when an owner or admin asks (each look is recorded in the audit log). */
function PayoutReveal({ contactId }: { contactId: string }) {
  const query = usePayoutDetails(contactId);
  if (query.isPending) return <span className="text-tiny">Loading payout details…</span>;
  if (!query.data) return null;
  return (
    <dl className="payout-details glance__payout">
      {Object.entries(query.data.details).map(([k, v]) => (
        <div key={k} className="payout-details__row">
          <dt>{DETAIL_LABELS[k] ?? k}</dt>
          <dd className="data-table__mono">
            {k === "payment_link" && /^https:\/\//.test(String(v)) ? (
              <a href={String(v)} target="_blank" rel="noopener noreferrer">
                {String(v)}
              </a>
            ) : (
              String(v)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
