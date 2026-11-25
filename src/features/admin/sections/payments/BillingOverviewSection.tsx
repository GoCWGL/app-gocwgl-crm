"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, ColumnChart, LoadState, Select } from "@/components/ui";
import { INVOICE_TONES, paymentMethodLabel, type InvoiceStatus } from "@/data/admin";
import { monthName, sharePct } from "@/data/shareholders";
import type { InvoiceOut } from "@/utils/api/models";
import { formatLong, todayIso } from "@/utils/format/dates";
import { businessCurrency, formatCents, formatCentsExact, formatPerInterval } from "@/utils/format/money";
import { useReferrals, useVaReferrals } from "@/utils/hooks/useAffiliates";
import { useLiveInvoices, useLiveSubscriptions } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { usePeso } from "@/utils/hooks/useExchangeRate";
import { useExpenses } from "@/utils/hooks/useExpenses";
import { useCanUseMenu } from "@/utils/hooks/useUsers";
import { Amount, HeroPeso, PesoRateBar } from "../../components/Peso";
import { billingOverview, dayOf, isOverdue, isToConfirm } from "../../lib/billingOverview";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { Bars, Entry, Flow, Hero, Kpi, Panel, Trend } from "../shareholders/OverviewParts";

const SOURCES: Record<string, string> = { va: "VA maintenance fees", sub: "Subscriptions", other: "Other invoices (builds, funnels, one-time)" };
const invoices = (n: number) => `${n} invoice${n === 1 ? "" : "s"}`;

/** Income & Billing › Overview: paid, pending and everything else worked out from Billing & invoices. */
export function BillingOverviewSection() {
  const invoiceQuery = useLiveInvoices();
  const subQuery = useLiveSubscriptions();
  return (
    <LoadState query={invoiceQuery} loadingText="Loading billing…">
      <LoadState query={subQuery} loadingText="Loading billing…">
        {invoiceQuery.data && subQuery.data && <Overview invoiceList={invoiceQuery.data} subs={subQuery.data} />}
      </LoadState>
    </LoadState>
  );
}

function Overview({ invoiceList, subs }: { invoiceList: InvoiceOut[]; subs: NonNullable<ReturnType<typeof useLiveSubscriptions>["data"]> }) {
  const { update, goTo } = useAdmin();
  const today = todayIso();
  const [year, setYear] = useState<number | null>(null);
  const o = useMemo(() => billingOverview(invoiceList, subs, today, year), [invoiceList, subs, today, year]);
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const nameOf = (id: string) => {
    const c = contacts.find((x) => x.id === id) ?? archived.find((x) => x.id === id);
    return c ? contactName(c) : "Removed client";
  };
  const openInvoices = () => update({ tab: "payments", billingView: "inv" });
  const openSubs = () => update({ tab: "payments", billingView: "subs" });
  const period = year === null ? "all time" : String(year);
  const change = o.lastMonth ? Math.round(((o.thisMonth - o.lastMonth) / o.lastMonth) * 100) : null;

  const { withPesos } = usePeso();
  const net = useNetIncome(o.paid.cents, year);
  const trend = change === null ? undefined : <Trend up={change >= 0}>{`${Math.abs(change)}% paid this month vs last`}</Trend>;

  return (
    <div className="stack stack--16">
      <div className="ov-toolbar">
        <span className="text-small">Follows Billing & invoices by itself as invoices are sent, paid or voided.</span>
        <Select
          size="sm"
          className="input--auto"
          aria-label="Paid in"
          value={year === null ? "" : String(year)}
          placeholder="Paid: all time"
          options={o.years.map((y) => ({ value: String(y), label: `Paid in ${y}` }))}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      <PesoRateBar currency={businessCurrency()} />

      {net ? (
        <Hero
          label={`Net income, ${period}`}
          value={formatCentsExact(net.cents)}
          badge={
            <>
              <HeroPeso cents={net.cents} />
              {trend}
            </>
          }
          text="What’s left after expenses, referral payouts and cash dividends. Every shareholder figure is based on it."
          stats={[
            { label: "Total paid", value: <Amount cents={o.paid.cents} />, hint: invoices(o.paid.count) },
            { label: "Paid this month", value: <Amount cents={o.thisMonth} />, hint: `${formatCentsExact(o.lastMonth)} last month` },
            { label: "Pending", value: <Amount cents={o.pending.cents} />, hint: invoices(o.pending.count) },
          ]}
        />
      ) : (
        <Hero
          label={`Total paid, ${period}`}
          value={formatCentsExact(o.paid.cents)}
          badge={
            <>
              <HeroPeso cents={o.paid.cents} />
              {trend}
            </>
          }
          text={`Money received from ${invoices(o.paid.count)}.`}
          stats={[
            { label: "Paid this month", value: <Amount cents={o.thisMonth} />, hint: `${formatCentsExact(o.lastMonth)} last month` },
            { label: "Pending", value: <Amount cents={o.pending.cents} />, hint: invoices(o.pending.count) },
          ]}
        />
      )}

      <div className="ov-metrics">
        <Kpi label="Overdue" value={<Amount cents={o.overdue.cents} />} hint={`${invoices(o.overdue.count)}, part of pending`} color="#dc2626" />
        <Kpi label="To confirm" value={<Amount cents={o.toConfirm.cents} />} hint={`${invoices(o.toConfirm.count)} the client says they paid`} color="#7c3aed" />
        <Kpi label="Monthly recurring" value={<Amount cents={o.mrr} />} hint={`${o.activeSubs} active subscription${o.activeSubs === 1 ? "" : "s"}`} color="#15803d" />
        <Kpi
          label="Average paid invoice"
          value={o.average === null ? "—" : <Amount cents={o.average} />}
          hint={o.daysToPay === null ? "No wait to measure yet" : `Paid in ${o.daysToPay} day${o.daysToPay === 1 ? "" : "s"} on average`}
          color="#0891b2"
        />
      </div>

      <div className={net ? "ov-grid ov-grid--wide" : "stack"}>
        <Panel title="Billed and paid" hint="Last 12 months. Billed when issued, paid when the money came in.">
          <ColumnChart
            label="Billed and paid per month"
            series={[
              { key: "billed", label: "Billed", color: "#d97706" },
              { key: "paid", label: "Paid", color: "#0891b2" },
            ]}
            data={o.months.map((m, i) => ({
              label: monthName(m.month),
              title: `${monthName(m.month, "long")} ${m.month.slice(0, 4)}`,
              values: [m.billed, m.paid],
              current: i === o.months.length - 1,
            }))}
            format={withPesos}
            axisFormat={(n) => formatCents(Math.round(n / 100) * 100)}
            height={260}
          />
        </Panel>
        {net && (
          <Panel title="How net income adds up" hint={capital(period)} action={<Open label="Expenses" onClick={() => goTo("expenses")} />}>
            <Flow
              steps={[
                { label: "Total income", hint: "Paid invoices", value: <Amount cents={o.paid.cents} />, icon: "dollar", kind: "in" },
                { label: "Expenses", value: <Amount cents={-net.expenses} text={less(net.expenses)} />, icon: "card", kind: "out" },
                { label: "Referral payouts", value: <Amount cents={-net.referrals} text={less(net.referrals)} />, icon: "gift", kind: "out" },
                { label: "Distributions", hint: "Cash dividends declared", value: <Amount cents={-net.distributed} text={less(net.distributed)} />, icon: "users", kind: "out" },
                { label: "Net income", value: <Amount cents={net.cents} />, icon: "check", kind: "total" },
              ]}
            />
          </Panel>
        )}
      </div>

      <div className="ov-grid">
        <Panel
          title={`Needs attention · ${o.attentionCount}`}
          hint="Overdue, or waiting for you to confirm the payment."
          action={<Open label="Open invoices" onClick={openInvoices} />}
        >
          <List empty="Nothing overdue or waiting to be confirmed.">
            {o.attention.map((i) => (
              <Entry
                key={i.id}
                date={i.dueDate ? formatLong(i.dueDate) : "No due date"}
                title={nameOf(i.contactId)}
                hint={i.number}
                value={<Amount cents={i.totalCents} />}
                actions={
                  <>
                    {isToConfirm(i) && <Badge tone="purple">Client says paid</Badge>}
                    {isOverdue(i, today) && <Badge tone="red">Overdue</Badge>}
                  </>
                }
              />
            ))}
          </List>
        </Panel>
        <Panel title="Pending by age" hint={`${withPesos(o.pending.cents)} waiting to be paid.`}>
          <Bars
            rows={o.aging.map((a, i) => ({
              label: a.label,
              hint: invoices(a.count),
              value: a.cents,
              display: <Amount cents={a.cents} text={`${formatCentsExact(a.cents)} · ${sharePct(a.cents, o.pending.cents)}`} />,
              color: ["#0891b2", "#d97706", "#ea580c", "#dc2626"][i],
            }))}
          />
        </Panel>
      </div>

      <div className="ov-grid">
        <Panel title="Income by source" hint={capital(period)}>
          <Groups groups={o.sources} total={o.paid.cents} label={(k) => SOURCES[k] ?? k} color="#0891b2" />
        </Panel>
        <Panel title="Payment methods" hint={capital(period)}>
          <Groups groups={o.methods} total={o.paid.cents} label={(k) => (k ? paymentMethodLabel(k) : "Not recorded")} color="#7c3aed" />
        </Panel>
      </div>

      <div className="ov-grid">
        <Panel title="Top clients" hint={capital(period)}>
          <Groups groups={o.clients} total={o.paid.cents} label={nameOf} color="#15803d" />
        </Panel>
        <Panel title="Recent payments" hint="The latest, in any year." action={<Open label="Open invoices" onClick={openInvoices} />}>
          <List empty="No payments yet.">
            {o.recent.map((i) => (
              <Entry
                key={i.id}
                date={formatLong(dayOf(i.paidAt!))}
                title={nameOf(i.contactId)}
                hint={[i.number, i.paymentMethod && paymentMethodLabel(i.paymentMethod)].filter(Boolean).join(" · ")}
                value={<Amount cents={i.totalCents} />}
              />
            ))}
          </List>
        </Panel>
      </div>

      <div className="ov-grid">
        <Panel
          title={`Renewals in the next 30 days · ${o.renewals.length}`}
          hint={o.awaitingSubs ? `${o.awaitingSubs} subscription${o.awaitingSubs === 1 ? " is" : "s are"} awaiting a first payment.` : undefined}
          action={<Open label="Open subscriptions" onClick={openSubs} />}
        >
          <List empty="No renewals coming up.">
            {o.renewals.map((s) => (
              <Entry
                key={s.id}
                date={formatLong(s.nextBillingDate)}
                title={nameOf(s.contactId)}
                hint={s.plan}
                value={<Amount cents={s.amountCents} text={formatPerInterval(s.amountCents, s.interval)} />}
              />
            ))}
          </List>
        </Panel>
        <Panel title="Other invoices" hint="Not counted as paid or pending.">
          <List>
            {(
              [
                ["Draft", o.drafts],
                ["Refunded", o.refunded],
                ["Void", o.voided],
              ] as const
            ).map(([status, g]) => (
              <Entry key={status} date={invoices(g.count)} title={<Badge tone={INVOICE_TONES[status as InvoiceStatus]}>{status}</Badge>} value={<Amount cents={g.cents} />} />
            ))}
          </List>
        </Panel>
      </div>

      <ReferralCard year={year} period={period} />
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const less = (cents: number) => (cents ? `−${formatCentsExact(cents)}` : formatCentsExact(0));

/** Net income (owners and admins): paid invoices less expenses, referral payouts and distributions. Shareholder figures start from the same number. */
function useNetIncome(incomeCents: number, year: number | null) {
  const x = useExpenses().data;
  if (!x) return null;
  const inPeriod = (day: string) => year === null || day.startsWith(`${year}-`);
  const expenses = x.expenses.reduce((t, e) => t + (inPeriod(e.spentOn) ? e.amountCents : 0), 0);
  const referrals = x.referralPayouts.reduce((t, m) => t + (inPeriod(m.month) ? m.amountCents : 0), 0);
  const distributed = x.distributions.reduce((t, m) => t + (inPeriod(m.month) ? m.amountCents : 0), 0);
  return { expenses, referrals, distributed, cents: incomeCents - expenses - referrals - distributed };
}

/** Affiliate and referral bonuses: for teammates who can open that menu. */
function ReferralCard({ year, period }: { year: number | null; period: string }) {
  const allowed = useCanUseMenu("affiliates");
  const { goTo } = useAdmin();
  const clients = useReferrals().data;
  const vas = useVaReferrals().data;
  const { withPesos } = usePeso();
  if (!allowed || !clients || !vas) return null;
  // One line per bonus: each client referral has one for the CRM and one for hourly VAs.
  const bonuses = [
    ...clients.map((r) => ({ kind: "Affiliates: client CRM", status: r.bonusStatus, cents: r.bonusCents ?? 0, at: r.bonusPaidAt })),
    ...clients.map((r) => ({ kind: "Affiliates: client’s hourly VAs", status: r.vaBonusStatus, cents: r.vaBonusCents, at: r.vaBonusPaidAt })),
    ...vas.map((r) => ({ kind: "VA referrals", status: r.bonusStatus, cents: r.bonusCents, at: r.bonusPaidAt })),
  ];
  const total = (kind: string, status: string) =>
    bonuses
      .filter((b) => b.kind === kind && b.status === status && (status !== "paid" || year === null || (!!b.at && dayOf(b.at).startsWith(`${year}-`))))
      .reduce((t, b) => t + b.cents, 0);
  return (
    <Panel title="Referral payouts" hint={`Paid ${period}, and still to pay.`} action={<Open label="Open referral payouts" onClick={() => goTo("bonuses")} />}>
      <List>
        {["Affiliates: client CRM", "Affiliates: client’s hourly VAs", "VA referrals"].map((kind) => (
          <Entry
            key={kind}
            date={total(kind, "earned") ? "To pay" : "Nothing due"}
            title={kind}
            hint={total(kind, "earned") ? `${withPesos(total(kind, "earned"))} still to pay` : undefined}
            value={<Amount cents={total(kind, "paid")} text={`${formatCentsExact(total(kind, "paid"))} paid`} />}
          />
        ))}
      </List>
    </Panel>
  );
}

function Groups({ groups, total, label, color }: { groups: Array<{ key: string; cents: number; count: number }>; total: number; label: (key: string) => string; color: string }) {
  if (!groups.length) return <div className="empty-state">No paid invoices yet.</div>;
  return (
    <Bars
      rows={groups.map((g) => ({
        key: g.key,
        label: label(g.key),
        hint: invoices(g.count),
        value: g.cents,
        display: <Amount cents={g.cents} text={`${formatCentsExact(g.cents)} · ${sharePct(g.cents, total)}`} />,
        color,
      }))}
    />
  );
}

function List({ empty, children }: { empty?: ReactNode; children: ReactNode[] }) {
  return children.length ? <ul className="ov-list">{children}</ul> : <div className="empty-state">{empty}</div>;
}

const Open = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button size="sm" variant="outline" onClick={onClick}>
    {label}
  </Button>
);
