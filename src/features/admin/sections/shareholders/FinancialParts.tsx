"use client";

import { useState } from "react";
import { Button, Field, Input, SegmentedControl, StatGrid } from "@/components/ui";
import { BUDGET_LINES, monthName, sharePct } from "@/data/shareholders";
import type { ShareholderOverviewOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { useReferrals, useVaReferrals } from "@/utils/hooks/useAffiliates";
import { useSaveBudget } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { Panel } from "./OverviewParts";
import { FormModal, SimpleTable } from "./shared";

/** "14.5 months", or why there isn't a number. */
export function runwayText(h: ShareholderOverviewOut["health"]): string {
  if (h.runwayMonths != null) return `${h.runwayMonths} month${h.runwayMonths === 1 ? "" : "s"}`;
  return h.cashCents == null ? "Enter bank balance" : "Not losing money";
}

/** Margin, and what a client costs and brings in. */
export function UnitEconomics({ data }: { data: ShareholderOverviewOut }) {
  const { results: r, economics: e } = data;
  const orNone = (cents: number | null | undefined) => (cents == null ? "—" : formatCents(cents, r.currency));
  return (
    <Panel
      title={`Margin and clients, ${r.year}`}
      hint={`Gross margin: what’s left of income after client hosting and cost of delivery. Cost to win a client: marketing expenses per client who first paid in ${r.year} (${e.newClients}). Client value: average income per paying client so far, times gross margin.`}
    >
      <StatGrid
        items={[
          { label: "Gross margin", value: e.grossMarginPct == null ? "—" : `${e.grossMarginPct}%`, tone: "green", glyph: "%" },
          { label: "Cost to win a client (CAC)", value: orNone(e.cacCents), tone: "amber", glyph: "$" },
          { label: "Client value (LTV)", value: orNone(e.ltvCents), tone: "cyan", glyph: "$" },
          { label: "Value vs cost (LTV to CAC)", value: e.ltvToCac == null ? "—" : `${e.ltvToCac}x`, tone: "purple", glyph: "#" },
        ]}
      />
    </Panel>
  );
}

/** What was recorded as expenses, with a link to them. */
export function ExpensesLink({ data }: { data: ShareholderOverviewOut }) {
  const { goTo } = useAdmin();
  const r = data.results;
  return (
    <Panel
      title={`Expenses, ${r.year}`}
      action={
        <Button variant="outline" onClick={() => goTo("expenses")}>
          Open Expenses
        </Button>
      }
    >
      <span className="text-small">
        {formatCents(r.expenseCents, r.currency)} recorded in {r.year}. Add and edit them on Income & Billing › Expenses; they count here straight away.
      </span>
    </Panel>
  );
}

const SOURCES: Record<string, string> = {
  va_fees: "VA maintenance fees",
  subscriptions: "Subscriptions",
  crm: "CRM requests",
  other: "Other invoices (builds, funnels, one-time)",
};

/** Where the year's income came from: the paid invoices in Billing & invoices. */
export function IncomeSources({ data }: { data: ShareholderOverviewOut }) {
  const { goTo } = useAdmin();
  const r = data.results;
  const money = (cents: number) => formatCentsExact(cents, r.currency);
  return (
    <Panel
      title={`Income by source, ${r.year}`}
      action={
        <Button variant="outline" onClick={() => goTo("payments")}>
          Open Billing & invoices
        </Button>
      }
      hint={
        <>
          Counted as soon as an invoice is marked paid, on the day it was paid. {money(r.outstandingCents)} is waiting for payment
          {data.toVerifyCount > 0 && `, including ${money(data.toVerifyCents)} clients say they paid (${data.toVerifyCount} to confirm in Billing)`}. This page updates by itself.
        </>
      }
    >
      <SimpleTable head={["Source", "Paid invoices", "Income", "Share"]} empty={`No paid invoices in ${r.year} yet.`}>
        {data.incomeSources.map((s) => (
          <tr key={s.source}>
            <td className="u-strong u-ink">{SOURCES[s.source] ?? s.source}</td>
            <td className="data-table__mono">{s.invoices}</td>
            <td className="data-table__mono">{money(s.amountCents)}</td>
            <td className="data-table__mono">{sharePct(s.amountCents, r.incomeCents)}</td>
          </tr>
        ))}
      </SimpleTable>
    </Panel>
  );
}

const BONUSES: Record<string, string> = {
  client_crm: "Affiliates: client paid for a CRM",
  client_va: "Affiliates: client’s hourly VAs",
  va_referral: "VA referrals",
};

/** Affiliate and referral bonuses paid this year: the same payouts as Referral payouts, counted as costs. */
export function ReferralCosts({ data }: { data: ShareholderOverviewOut }) {
  const { goTo } = useAdmin();
  const r = data.results;
  const money = (cents: number) => formatCentsExact(cents, r.currency);
  // Earned and not paid yet: a cost that's coming, not counted until it's paid.
  const clients = useReferrals().data;
  const vas = useVaReferrals().data;
  const owed =
    clients && vas
      ? clients.reduce((t, x) => t + (x.bonusStatus === "earned" ? (x.bonusCents ?? 0) : 0) + (x.vaBonusStatus === "earned" ? x.vaBonusCents : 0), 0) +
        vas.reduce((t, x) => t + (x.bonusStatus === "earned" ? x.bonusCents : 0), 0)
      : null;
  return (
    <Panel
      title={`Affiliate and referral payouts, ${r.year}`}
      action={
        <Button variant="outline" onClick={() => goTo("bonuses")}>
          Open Referral payouts
        </Button>
      }
      hint={`Counted as a cost on the day a bonus is marked paid, and taken back if it’s undone.${owed == null ? "" : ` ${money(owed)} is earned and still to pay.`} Don’t add these as expenses.`}
    >
      <SimpleTable head={["Payout", "Bonuses paid", "Cost"]} empty={`No bonuses paid in ${r.year}.`}>
        {data.bonusSources.map((b) => (
          <tr key={b.kind}>
            <td className="u-strong u-ink">{BONUSES[b.kind] ?? b.kind}</td>
            <td className="data-table__mono">{b.bonuses}</td>
            <td className="data-table__mono">{money(b.amountCents)}</td>
          </tr>
        ))}
      </SimpleTable>
    </Panel>
  );
}

export function ProfitAndLoss({ data }: { data: ShareholderOverviewOut }) {
  const [by, setBy] = useState<"month" | "quarter">("quarter");
  const r = data.results;
  const money = (cents: number) => formatCents(cents, r.currency);
  const months = r.months.map((m) => ({
    label: monthName(m.month, "long"),
    income: m.incomeCents,
    costs: m.expenseCents + m.bonusCents,
    distributed: m.distributedCents,
    net: m.netIncomeCents,
  }));
  const quarters = [0, 1, 2, 3].map((q) => {
    const part = months.slice(q * 3, q * 3 + 3);
    const sum = (k: "income" | "costs" | "distributed" | "net") => part.reduce((t, m) => t + m[k], 0);
    return { label: `Q${q + 1}`, income: sum("income"), costs: sum("costs"), distributed: sum("distributed"), net: sum("net") };
  });
  return (
    <Panel
      title={`Profit and loss, ${r.year}`}
      action={
        <SegmentedControl
          size="sm"
          label="Period"
          value={by}
          onChange={setBy}
          options={[
            { value: "quarter", label: "Quarterly" },
            { value: "month", label: "Monthly" },
          ]}
        />
      }
    >
      <SimpleTable head={["Period", "Income", "Costs", "Distributed", "Net income"]}>
        {(by === "quarter" ? quarters : months).map((p) => (
          <tr key={p.label}>
            <td className="u-strong u-ink">{p.label}</td>
            <td className="data-table__mono">{money(p.income)}</td>
            <td className="data-table__mono">{money(p.costs)}</td>
            <td className="data-table__mono">{money(p.distributed)}</td>
            <td className="data-table__mono">{money(p.net)}</td>
          </tr>
        ))}
      </SimpleTable>
    </Panel>
  );
}

/** Budget against what really happened, and the form to set it. */
export function Budget({ data }: { data: ShareholderOverviewOut }) {
  const { notify } = useAdmin();
  const [editing, setEditing] = useState(false);
  const r = data.results;
  const thisYear = Number(data.today.slice(0, 4));
  const elapsed = r.year < thisYear ? 12 : r.year > thisYear ? 0 : Number(data.today.slice(5, 7));
  const actual = (line: string) => (line === "income" ? r.incomeCents : line === "bonuses" ? r.bonusCents : (r.categories.find((c) => c.category === line)?.amountCents ?? 0));
  const money = (cents: number) => formatCents(cents, r.currency);
  const rows = BUDGET_LINES.map((l) => ({ ...l, monthly: data.budget.find((b) => b.line === l.value)?.monthlyCents ?? 0 })).filter((l) => l.monthly);
  return (
    <Panel
      title={`Budget against actual, ${r.year}`}
      action={
        <Button variant="outline" aria-haspopup="dialog" onClick={() => setEditing(true)}>
          Edit budget
        </Button>
      }
      hint={rows.length ? `Budget to date covers ${elapsed} month${elapsed === 1 ? "" : "s"}, including the current one.` : undefined}
    >
      <SimpleTable head={["Line", "Budget a month", "Budget to date", "Actual", "Difference"]} empty={`No budget for ${r.year} yet.`}>
        {rows.map((l) => {
          const diff = actual(l.value) - l.monthly * elapsed;
          const good = l.value === "income" ? diff >= 0 : diff <= 0;
          return (
            <tr key={l.value}>
              <td className="u-strong u-ink">{l.label}</td>
              <td className="data-table__mono">{money(l.monthly)}</td>
              <td className="data-table__mono">{money(l.monthly * elapsed)}</td>
              <td className="data-table__mono">{money(actual(l.value))}</td>
              <td className={good ? "data-table__mono sh-good" : "data-table__mono sh-bad"}>
                {diff > 0 ? "+" : ""}
                {money(diff)}
              </td>
            </tr>
          );
        })}
      </SimpleTable>
      {editing && (
        <BudgetModal
          data={data}
          onClose={() => setEditing(false)}
          onSaved={(m) => {
            setEditing(false);
            notify(m);
          }}
        />
      )}
    </Panel>
  );
}

type Done = { onClose: () => void; onSaved: (message: string) => void };

function BudgetModal({ data, onClose, onSaved }: Done & { data: ShareholderOverviewOut }) {
  const save = useSaveBudget();
  const year = data.results.year;
  const [lines, setLines] = useState<Record<string, string>>(() => Object.fromEntries(data.budget.map((b) => [b.line, centsToDollars(b.monthlyCents)])));
  const submit = () =>
    save.mutate(
      { year, lines: BUDGET_LINES.map((l) => ({ line: l.value, monthlyCents: dollarsToCents(lines[l.value] ?? "") })).filter((l) => l.monthlyCents > 0) },
      { onSuccess: () => onSaved(`${year} budget saved.`) },
    );
  return (
    <FormModal
      id="bg-title"
      kicker="BUDGET"
      title={`Budget for ${year}`}
      subtitle="Amounts per month. Leave a line empty to skip it."
      width={620}
      mutation={save}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        {BUDGET_LINES.map((l) => (
          <Field key={l.value} label={l.label} htmlFor={`bg-${l.value}`}>
            <Input
              id={`bg-${l.value}`}
              type="number"
              min={0}
              step="0.01"
              mono
              placeholder="0.00"
              value={lines[l.value] ?? ""}
              onChange={(e) => setLines((x) => ({ ...x, [l.value]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
    </FormModal>
  );
}
