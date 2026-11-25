"use client";

import { ColumnChart, Select, StatGrid } from "@/components/ui";
import { expenseLabel, monthName } from "@/data/shareholders";
import type { BusinessResultsOut } from "@/utils/api/models";
import { formatCents } from "@/utils/format/money";

/** Business results for a year: income, costs and net income, with a month by month chart and table. */
export function ResultsCard({ results: r, onYear, hideIncome }: { results: BusinessResultsOut; onYear?: (year: number) => void; hideIncome?: boolean }) {
  const money = (cents: number) => formatCents(cents, r.currency);
  const costs = [
    ...r.categories.map((c) => ({ label: expenseLabel(c.category), cents: c.amountCents })),
    ...(r.bonusCents ? [{ label: "Referral bonuses paid", cents: r.bonusCents }] : []),
  ];
  const years = r.years.includes(r.year) ? r.years : [r.year, ...r.years];
  return (
    <>
      <StatGrid
        items={[
          { label: `Net income ${r.year}`, value: money(r.netIncomeCents), tone: r.netIncomeCents < 0 ? "red" : "green", glyph: "$" },
          // The admin overview leads with net income only; shareholders also see what it comes from.
          ...(hideIncome ? [] : [{ label: `Income ${r.year}`, value: money(r.incomeCents), tone: "cyan" as const, glyph: "$" }]),
          { label: `Costs ${r.year}`, value: money(r.expenseCents + r.bonusCents), tone: "amber", glyph: "$" },
          { label: `Distributed ${r.year}`, value: money(r.distributedCents), tone: "purple", glyph: "$" },
          { label: "Net income, all time", value: money(r.retainedCents), tone: "purple", glyph: "$" },
        ]}
      />
      <section className="card stack stack--14" aria-label="Net income by month">
        <div className="section-head">
          <span className="kicker">NET INCOME BY MONTH</span>
          {onYear && (
            <Select size="sm" className="input--auto" aria-label="Year" value={String(r.year)} options={years.map(String)} onChange={(e) => onYear(Number(e.target.value))} />
          )}
        </div>
        <ColumnChart
          label={`Income and costs per month, ${r.year}`}
          series={[
            { key: "income", label: "Income", color: "#0891b2" },
            { key: "costs", label: "Costs", color: "#f59e0b" },
          ]}
          data={r.months.map((m) => ({
            label: monthName(m.month),
            title: `${monthName(m.month, "long")} ${r.year} · net income ${money(m.netIncomeCents)}`,
            values: [m.incomeCents, m.expenseCents + m.bonusCents],
          }))}
          format={money}
          axisFormat={(n) => formatCents(Math.round(n / 100) * 100, r.currency)}
        />
        {costs.length > 0 && (
          <div className="table-scroll">
            <table className="data-table data-table--plain">
              <thead>
                <tr>
                  <th>Where costs went</th>
                  <th>{r.year}</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.label}>
                    <td>{c.label}</td>
                    <td className="data-table__mono">{money(c.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <span className="text-small">
          Net income is paid invoices less expenses, referral payouts and cash dividends declared. {money(r.outstandingCents)} is invoiced but not paid yet.
        </span>
      </section>
    </>
  );
}
