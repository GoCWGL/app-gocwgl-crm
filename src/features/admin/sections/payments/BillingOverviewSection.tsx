"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, ColumnChart, LoadState, Select, StatGrid } from "@/components/ui";
import { INVOICE_TONES, paymentMethodLabel, type InvoiceStatus } from "@/data/admin";
import { monthName, sharePct } from "@/data/shareholders";
import type { InvoiceOut } from "@/utils/api/models";
import { formatLong, todayIso } from "@/utils/format/dates";
import { formatCents, formatCentsExact, formatPerInterval } from "@/utils/format/money";
import { useReferrals, useVaReferrals } from "@/utils/hooks/useAffiliates";
import { useLiveInvoices, useLiveSubscriptions } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useExpenses } from "@/utils/hooks/useExpenses";
import { useCanUseMenu } from "@/utils/hooks/useUsers";
import { billingOverview, dayOf, isOverdue, isToConfirm } from "../../lib/billingOverview";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

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
  const { update } = useAdmin();
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

  return (
    <div className="stack stack--16">
      <div className="cluster cluster--between">
        <span className="text-small">Worked out from Billing & invoices. Updates by itself when an invoice is sent, paid or voided.</span>
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

      <NetIncome incomeCents={o.paid.cents} year={year} period={period} />

      <StatGrid
        items={[
          { label: `Total paid, ${period} · ${invoices(o.paid.count)}`, value: formatCentsExact(o.paid.cents), tone: "green", glyph: "$" },
          { label: `Pending · ${invoices(o.pending.count)}`, value: formatCentsExact(o.pending.cents), tone: "amber", glyph: "$" },
          { label: `Overdue · ${invoices(o.overdue.count)}`, value: formatCentsExact(o.overdue.cents), tone: "red", glyph: "$" },
          { label: `To confirm · ${invoices(o.toConfirm.count)}`, value: formatCentsExact(o.toConfirm.cents), tone: "purple", glyph: "$" },
        ]}
      />
      <StatGrid
        items={[
          { label: change === null ? "Paid this month" : `Paid this month (${change > 0 ? "+" : ""}${change}% vs last)`, value: formatCentsExact(o.thisMonth), tone: "cyan", glyph: "$" },
          { label: "Average paid invoice", value: o.average === null ? "—" : formatCentsExact(o.average), tone: "cyan", glyph: "$" },
          { label: "Average days to pay", value: o.daysToPay === null ? "—" : o.daysToPay, tone: "purple", glyph: "#" },
          { label: `Monthly recurring · ${o.activeSubs} active`, value: formatCentsExact(o.mrr), tone: "green", glyph: "$" },
        ]}
      />
      <span className="text-small">Overdue and To confirm are part of Pending. To confirm: the client says they paid, and it counts as paid once you mark it paid.</span>

      <Card kicker="BILLED AND PAID · LAST 12 MONTHS" note="Billed is in the month an invoice was issued; paid is in the month the money came in.">
        <ColumnChart
          label="Billed and paid per month"
          series={[
            { key: "billed", label: "Billed", color: "#f59e0b" },
            { key: "paid", label: "Paid", color: "#0891b2" },
          ]}
          data={o.months.map((m, i) => ({
            label: monthName(m.month),
            title: `${monthName(m.month, "long")} ${m.month.slice(0, 4)}`,
            values: [m.billed, m.paid],
            current: i === o.months.length - 1,
          }))}
          format={(n) => formatCentsExact(n)}
          axisFormat={(n) => formatCents(Math.round(n / 100) * 100)}
        />
      </Card>

      <Card kicker={`NEEDS ATTENTION · ${o.attentionCount}`} action={<Open label="Open invoices" onClick={openInvoices} />}>
        <Table head={["Invoice", "Client", "Amount", "Due", "Why"]} empty="Nothing overdue or waiting to be confirmed.">
          {o.attention.map((i) => (
            <tr key={i.id}>
              <td className="u-strong u-ink">{i.number}</td>
              <td>{nameOf(i.contactId)}</td>
              <td className="data-table__mono">{formatCentsExact(i.totalCents)}</td>
              <td>{i.dueDate ? formatLong(i.dueDate) : "—"}</td>
              <td>
                <span className="cluster">
                  {isToConfirm(i) && <Badge tone="purple">Client says paid</Badge>}
                  {isOverdue(i, today) && <Badge tone="red">Overdue</Badge>}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card kicker="PENDING BY AGE">
        <Table head={["Age", "Invoices", "Amount", "Share"]}>
          {o.aging.map((a) => (
            <tr key={a.label}>
              <td className="u-strong u-ink">{a.label}</td>
              <td className="data-table__mono">{a.count}</td>
              <td className="data-table__mono">{formatCentsExact(a.cents)}</td>
              <td className="data-table__mono">{sharePct(a.cents, o.pending.cents)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card kicker={`INCOME BY SOURCE · ${period.toUpperCase()}`}>
        <Groups head="Source" groups={o.sources} total={o.paid.cents} label={(k) => SOURCES[k] ?? k} />
      </Card>
      <Card kicker={`TOP CLIENTS · ${period.toUpperCase()}`}>
        <Groups head="Client" groups={o.clients} total={o.paid.cents} label={nameOf} />
      </Card>
      <Card kicker={`PAYMENT METHODS · ${period.toUpperCase()}`}>
        <Groups head="Method" groups={o.methods} total={o.paid.cents} label={(k) => (k ? paymentMethodLabel(k) : "Not recorded")} />
      </Card>

      <Card
        kicker={`RENEWALS IN THE NEXT 30 DAYS · ${o.renewals.length}`}
        action={<Open label="Open subscriptions" onClick={openSubs} />}
        note={o.awaitingSubs ? `${o.awaitingSubs} subscription${o.awaitingSubs === 1 ? " is" : "s are"} awaiting a first payment.` : undefined}
      >
        <Table head={["Date", "Client", "Plan", "Amount"]} empty="No renewals coming up.">
          {o.renewals.map((s) => (
            <tr key={s.id}>
              <td>{formatLong(s.nextBillingDate)}</td>
              <td className="u-strong u-ink">{nameOf(s.contactId)}</td>
              <td>{s.plan}</td>
              <td className="data-table__mono">{formatPerInterval(s.amountCents, s.interval)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card kicker="RECENT PAYMENTS" action={<Open label="Open invoices" onClick={openInvoices} />}>
        <Table head={["Paid on", "Invoice", "Client", "Amount", "Method"]} empty="No payments yet.">
          {o.recent.map((i) => (
            <tr key={i.id}>
              <td>{formatLong(dayOf(i.paidAt!))}</td>
              <td className="u-strong u-ink">{i.number}</td>
              <td>{nameOf(i.contactId)}</td>
              <td className="data-table__mono">{formatCentsExact(i.totalCents)}</td>
              <td>{i.paymentMethod ? paymentMethodLabel(i.paymentMethod) : "—"}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card kicker="OTHER INVOICES" note="Not counted as paid or pending.">
        <Table head={["Status", "Invoices", "Amount"]}>
          {(
            [
              ["Draft", o.drafts],
              ["Refunded", o.refunded],
              ["Void", o.voided],
            ] as const
          ).map(([status, g]) => (
            <tr key={status}>
              <td>
                <Badge tone={INVOICE_TONES[status as InvoiceStatus]}>{status}</Badge>
              </td>
              <td className="data-table__mono">{g.count}</td>
              <td className="data-table__mono">{formatCentsExact(g.cents)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <ReferralCard year={year} period={period} />
    </div>
  );
}

/** Net income (owners and admins): paid invoices less expenses, referral payouts and distributions. Shareholder figures start from the same number. */
function NetIncome({ incomeCents, year, period }: { incomeCents: number; year: number | null; period: string }) {
  const { goTo } = useAdmin();
  const x = useExpenses().data;
  if (!x) return null;
  const inPeriod = (day: string) => year === null || day.startsWith(`${year}-`);
  const expenses = x.expenses.reduce((t, e) => t + (inPeriod(e.spentOn) ? e.amountCents : 0), 0);
  const referrals = x.referralPayouts.reduce((t, m) => t + (inPeriod(m.month) ? m.amountCents : 0), 0);
  const distributed = x.distributions.reduce((t, m) => t + (inPeriod(m.month) ? m.amountCents : 0), 0);
  const net = incomeCents - expenses - referrals - distributed;
  const less = (cents: number) => (cents ? `−${formatCentsExact(cents)}` : formatCentsExact(0));
  return (
    <Card
      kicker={`NET INCOME · ${period.toUpperCase()}`}
      action={<Open label="Open Expenses" onClick={() => goTo("expenses")} />}
      note="Net income = total income − expenses − referral payouts − cash dividends declared to shareholders. Every shareholder figure is based on it."
    >
      <StatGrid
        items={[
          { label: "Total income (paid invoices)", value: formatCentsExact(incomeCents), tone: "green", glyph: "$" },
          { label: "Expenses", value: less(expenses), tone: "amber", glyph: "$" },
          { label: "Referral payouts", value: less(referrals), tone: "amber", glyph: "$" },
        ]}
      />
      <StatGrid
        items={[
          { label: "Distributions", value: less(distributed), tone: "purple", glyph: "$" },
          { label: "Net income", value: formatCentsExact(net), tone: net < 0 ? "red" : "cyan", glyph: "$" },
        ]}
      />
    </Card>
  );
}

/** Affiliate and referral bonuses: for teammates who can open that menu. */
function ReferralCard({ year, period }: { year: number | null; period: string }) {
  const allowed = useCanUseMenu("affiliates");
  const { goTo } = useAdmin();
  const clients = useReferrals().data;
  const vas = useVaReferrals().data;
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
    <Card kicker={`REFERRAL PAYOUTS · PAID ${period.toUpperCase()}`} action={<Open label="Open referral payouts" onClick={() => goTo("bonuses")} />}>
      <Table head={["Bonus", "Paid", "Still to pay"]}>
        {["Affiliates: client CRM", "Affiliates: client’s hourly VAs", "VA referrals"].map((kind) => (
          <tr key={kind}>
            <td className="u-strong u-ink">{kind}</td>
            <td className="data-table__mono">{formatCentsExact(total(kind, "paid"))}</td>
            <td className="data-table__mono">{formatCentsExact(total(kind, "earned"))}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function Groups({ head, groups, total, label }: { head: string; groups: Array<{ key: string; cents: number; count: number }>; total: number; label: (key: string) => string }) {
  return (
    <Table head={[head, "Paid invoices", "Amount", "Share"]} empty="No paid invoices yet.">
      {groups.map((g) => (
        <tr key={g.key}>
          <td className="u-strong u-ink">{label(g.key)}</td>
          <td className="data-table__mono">{g.count}</td>
          <td className="data-table__mono">{formatCentsExact(g.cents)}</td>
          <td className="data-table__mono">{sharePct(g.cents, total)}</td>
        </tr>
      ))}
    </Table>
  );
}

const Open = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button variant="outline" onClick={onClick}>
    {label}
  </Button>
);

function Card({ kicker, action, note, children }: { kicker: string; action?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="card stack stack--14" aria-label={kicker}>
      <div className="section-head">
        <span className="kicker">{kicker}</span>
        {action}
      </div>
      {children}
      {note && <span className="text-small">{note}</span>}
    </section>
  );
}

function Table({ head, empty, children }: { head: string[]; empty?: ReactNode; children: ReactNode[] }) {
  if (!children.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="table-scroll">
      <table className="data-table data-table--plain">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
