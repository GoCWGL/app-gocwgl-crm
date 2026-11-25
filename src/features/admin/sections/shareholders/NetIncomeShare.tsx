"use client";

import { sharePct } from "@/data/shareholders";
import type { ShareholderOverviewOut } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { SectionCard, SimpleTable } from "./shared";

/** Each shareholder's part of net income: their share % of it, this year and all time, after what's been distributed. */
export function NetIncomeShareCard({ data }: { data: ShareholderOverviewOut }) {
  const { capTable: c, results: r } = data;
  const money = (cents: number) => formatCentsExact(cents, r.currency);
  const part = (cents: number, shares: number) => (c.companyShares ? Math.round((cents * shares) / c.companyShares) : 0);
  const holders = c.holders.filter((h) => h.issued > 0);
  const unassigned = c.companyShares - c.issued;
  const cells = (shares: number) => (
    <>
      <td className="data-table__mono">{sharePct(shares, c.companyShares)}</td>
      <td className="data-table__mono">{money(part(r.netIncomeCents, shares))}</td>
      <td className="data-table__mono u-strong">{money(part(r.retainedCents, shares))}</td>
    </>
  );
  return (
    <SectionCard
      kicker="SHARE OF NET INCOME"
      note={`Net income is paid invoices less expenses, referral payouts and cash dividends declared: ${money(r.netIncomeCents)} in ${r.year}, ${money(r.retainedCents)} all time (${money(r.allTimeProfitCents)} before ${money(r.dividendsDeclaredCents)} distributed). A share isn’t owed until a distribution is declared.`}
    >
      <SimpleTable head={["Holder", "Share %", `Net income ${r.year}`, "Net income, all time"]} empty="Nobody holds shares yet.">
        {holders.length
          ? [
              ...holders.map((h) => (
                <tr key={h.stakeholderId}>
                  <td className="u-strong u-ink">{h.name}</td>
                  {cells(h.issued)}
                </tr>
              )),
              ...(unassigned > 0
                ? [
                    <tr key="rest">
                      <td className="u-strong u-ink">Not assigned</td>
                      {cells(unassigned)}
                    </tr>,
                  ]
                : []),
            ]
          : []}
      </SimpleTable>
    </SectionCard>
  );
}
