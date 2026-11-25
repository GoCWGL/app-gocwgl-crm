"use client";

import { useState } from "react";
import { Button, Field, Input, SegmentedControl } from "@/components/ui";
import { categoryLabel, dilutedTotal, sharePct } from "@/data/shareholders";
import type { ShareholderOverviewOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import { SectionCard, SimpleTable } from "./shared";

type Basis = "issued" | "diluted";

/** Part of `valueCents` for `shares` out of `total`. */
const part = (valueCents: number, shares: number, total: number) => (total ? Math.round((valueCents * shares) / total) : 0);

/**
 * Cap Table & Equity › Value & payout: what each holder's stake is worth at the current valuation, or what they'd get at
 * another price, plus their payouts so far.
 */
export function ValuePayoutCard({ data, onSetValuation }: { data: ShareholderOverviewOut; onSetValuation: () => void }) {
  const { capTable: c, health: h, results } = data;
  const [basis, setBasis] = useState<Basis>("issued");
  // Empty follows the current valuation.
  const [price, setPrice] = useState("");
  const custom = price.trim() !== "";
  const value = custom ? dollarsToCents(price) : h.valuationCents;
  const money = (cents: number) => formatCents(Math.round(cents / 100) * 100, results.currency);
  const diluted = basis === "diluted";
  const total = diluted ? dilutedTotal(c) : c.companyShares;

  const rows = c.holders
    .map((holder) => {
      const grants = c.grants.filter((g) => g.stakeholderId === holder.stakeholderId);
      const shares = diluted ? holder.fullyDiluted : holder.issued;
      const vested = grants.reduce((t, g) => {
        if (g.shareClass === "safe") return t + (diluted ? (g.estimatedShares ?? 0) : 0);
        return t + (g.shareClass === "option" && !diluted ? 0 : g.vested);
      }, 0);
      const payments = data.payouts.filter((p) => p.stakeholderId === holder.stakeholderId);
      return {
        ...holder,
        shares,
        vested,
        paid: payments.reduce((t, p) => t + (p.paid ? p.netCents : 0), 0),
        due: payments.reduce((t, p) => t + (p.paid ? 0 : p.netCents), 0),
      };
    })
    .filter((r) => r.shares > 0 || r.paid > 0 || r.due > 0);
  const anyVesting = rows.some((r) => r.vested < r.shares);
  const unassigned = total - rows.reduce((t, r) => t + r.shares, 0);

  return (
    <SectionCard
      kicker="VALUE & PAYOUT"
      action={
        <SegmentedControl
          size="sm"
          label="Value basis"
          value={basis}
          onChange={setBasis}
          options={[
            { value: "issued", label: "Issued" },
            { value: "diluted", label: "Fully diluted" },
          ]}
        />
      }
      note="An estimate: the company’s value times each holder’s ownership. It doesn’t take off taxes, debts, preferred holders’ priority or the cost of exercising options."
    >
      <div className="cluster">
        <Field
          label="Company value or sale price"
          htmlFor="vp-price"
          hint={
            h.valuationCents == null
              ? "No valuation set yet. Type an amount, or set the valuation."
              : custom
                ? `What if. The current valuation is ${money(h.valuationCents)}.`
                : `Current valuation: ${h.valuationSource}, ${formatLong(h.valuedOn)}. Type another amount to see what they’d get.`
          }
        >
          <Input
            id="vp-price"
            type="number"
            min={0}
            step="any"
            mono
            placeholder={h.valuationCents == null ? "0" : centsToDollars(h.valuationCents)}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        {custom && h.valuationCents != null && (
          <Button variant="outline" onClick={() => setPrice("")}>
            Use current valuation
          </Button>
        )}
        <Button variant="outline" aria-haspopup="dialog" onClick={onSetValuation}>
          Set valuation
        </Button>
      </div>
      <SimpleTable
        head={["Holder", "Ownership", custom ? "Payout" : "Current value", ...(anyVesting ? ["Vested part"] : []), "Invested", "Return", "Payouts paid", "Payouts to pay"]}
        empty="Nobody holds equity yet."
      >
        {[
          ...rows.map((r) => {
            const worth = value == null ? null : part(value, r.shares, total);
            return (
              <tr key={r.stakeholderId}>
                <td>
                  <div className="stack stack--2">
                    <span className="u-strong u-ink">{r.name}</span>
                    <span className="text-small">{categoryLabel(r.category)}</span>
                  </div>
                </td>
                <td className="data-table__mono">{sharePct(r.shares, total)}</td>
                <td className="data-table__mono u-strong">{worth == null ? "—" : money(worth)}</td>
                {anyVesting && <td className="data-table__mono">{value == null ? "—" : money(part(value, r.vested, total))}</td>}
                <td className="data-table__mono">{r.investedCents ? money(r.investedCents) : "—"}</td>
                <td className="data-table__mono">{worth != null && r.investedCents ? `${((worth + r.paid) / r.investedCents).toFixed(2)}x` : "—"}</td>
                <td className="data-table__mono">{money(r.paid)}</td>
                <td className="data-table__mono">{money(r.due)}</td>
              </tr>
            );
          }),
          ...(rows.length && unassigned > 0
            ? [
                <tr key="rest">
                  <td className="u-strong u-ink">{diluted && c.optionsAvailable ? "Option pool and not assigned" : "Not assigned"}</td>
                  <td className="data-table__mono">{sharePct(unassigned, total)}</td>
                  <td className="data-table__mono">{value == null ? "—" : money(part(value, unassigned, total))}</td>
                  <td colSpan={anyVesting ? 5 : 4} />
                </tr>,
              ]
            : []),
        ]}
      </SimpleTable>
      {!!rows.length && (
        <span className="text-small">
          Return is value plus payouts paid (after tax), divided by what they invested.
          {!diluted && c.safeInvestedCents > 0 ? " SAFEs count under Fully diluted." : ""}
        </span>
      )}
    </SectionCard>
  );
}
