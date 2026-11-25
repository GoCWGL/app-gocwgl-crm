"use client";

import { useState } from "react";
import { Badge, Button, LoadState, SegmentedControl, StatGrid } from "@/components/ui";
import { categoryLabel, count, dilutedTotal, shareClassLabel, sharePct } from "@/data/shareholders";
import type { CapTableGrant, CapTableRound, ShareholderOverviewOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useShareholders } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { GrantModal, PoolModal, RoundModal, ValuationModal } from "./EquityModals";
import { NetIncomeShareCard } from "./NetIncomeShare";
import { RowActions, SectionCard, SimpleTable } from "./shared";
import { ValuePayoutCard } from "./ValuePayout";

/** Shareholders › Cap Table & Equity: ownership, share classes, dilution by round, and the option pool. */
export function CapTableSection() {
  const query = useShareholders();
  return (
    <LoadState query={query} loadingText="Loading the cap table…">
      {query.data && <CapTable data={query.data} />}
    </LoadState>
  );
}

type Open = { kind: "grant"; grant?: CapTableGrant } | { kind: "round"; round?: CapTableRound } | { kind: "pool" } | { kind: "valuation" } | null;

function CapTable({ data }: { data: ShareholderOverviewOut }) {
  const c = data.capTable;
  const { notify, goTo } = useAdmin();
  const [open, setOpen] = useState<Open>(null);
  const [basis, setBasis] = useState<"issued" | "diluted">("issued");
  const diluted = basis === "diluted";
  const money = (cents: number) => formatCents(cents, data.results.currency);
  const close = () => setOpen(null);
  const done = { onClose: close, onSaved: (m: string) => (close(), notify(m)) };
  const holders = c.holders.filter((h) => diluted || h.issued > 0);
  const total = diluted ? dilutedTotal(c) : c.companyShares;
  const unassigned = total - (diluted ? c.fullyDiluted : c.issued);
  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: `Issued of ${count(c.companyShares)} shares`, value: count(c.issued), tone: "cyan", glyph: "#" },
          { label: "Fully diluted", value: count(c.fullyDiluted), tone: "purple", glyph: "#" },
          { label: "Options available", value: count(c.optionsAvailable), tone: "green", glyph: "#" },
          { label: "In SAFEs", value: money(c.safeInvestedCents), tone: "amber", glyph: "$" },
        ]}
      />
      <SectionCard
        kicker="OWNERSHIP"
        action={
          <SegmentedControl
            size="sm"
            label="Ownership basis"
            value={basis}
            onChange={setBasis}
            options={[
              { value: "issued", label: "Issued" },
              { value: "diluted", label: "Fully diluted" },
            ]}
          />
        }
        note={
          diluted
            ? `Issued shares, the whole option pool, and SAFEs as if they converted today at their post-money cap (an estimate).${c.safesNotEstimated ? ` ${c.safesNotEstimated} SAFE${c.safesNotEstimated === 1 ? " isn’t" : "s aren’t"} included: no cap, or no shares to work from.` : ""}`
            : "Common and preferred shares, as a percentage of all company shares. Change someone’s share % on Shareholders."
        }
      >
        <SimpleTable head={["Holder", "Kind", "Common", "Preferred", ...(diluted ? ["Options", "SAFE (est.)"] : []), "Total", "Ownership", "Invested"]} empty="Nothing here yet. Add entries to the cap table below.">
          {[
            ...holders.map((h) => {
              const own = diluted ? h.fullyDiluted : h.issued;
              return (
                <tr key={h.stakeholderId}>
                  <td className="u-strong u-ink">{h.name}</td>
                  <td>
                    <Badge tone="purple">{categoryLabel(h.category)}</Badge>
                  </td>
                  <td className="data-table__mono">{count(h.common)}</td>
                  <td className="data-table__mono">{count(h.preferred)}</td>
                  {diluted && <td className="data-table__mono">{count(h.option)}</td>}
                  {diluted && <td className="data-table__mono">{count(h.safe)}</td>}
                  <td className="data-table__mono">{count(own)}</td>
                  <td className="data-table__mono">{sharePct(own, total)}</td>
                  <td className="data-table__mono">{money(h.investedCents)}</td>
                </tr>
              );
            }),
            ...(unassigned > 0
              ? [
                  <tr key="unassigned">
                    <td className="u-strong u-ink">Not assigned</td>
                    <td colSpan={diluted ? 5 : 3} />
                    <td className="data-table__mono">{count(unassigned)}</td>
                    <td className="data-table__mono">{sharePct(unassigned, total)}</td>
                    <td />
                  </tr>,
                ]
              : []),
            ...(diluted && c.optionsAvailable
              ? [
                  <tr key="pool">
                    <td className="u-strong u-ink">Option pool (not granted)</td>
                    <td />
                    <td />
                    <td />
                    <td className="data-table__mono">{count(c.optionsAvailable)}</td>
                    <td />
                    <td className="data-table__mono">{count(c.optionsAvailable)}</td>
                    <td className="data-table__mono">{sharePct(c.optionsAvailable, total)}</td>
                    <td />
                  </tr>,
                ]
              : []),
          ]}
        </SimpleTable>
      </SectionCard>

      <NetIncomeShareCard data={data} />

      <ValuePayoutCard data={data} onSetValuation={() => setOpen({ kind: "valuation" })} />

      <SectionCard
        kicker={`LEDGER · ${c.grants.length}`}
        action={
          <Button variant="primary" aria-haspopup="dialog" onClick={() => setOpen({ kind: "grant" })}>
            + Add entry
          </Button>
        }
      >
        <SimpleTable head={["Date", "Holder", "Class", "Shares", "Vested", "Invested", "Actions"]} empty="Add each share issue, option grant and SAFE.">
          {c.grants.map((g) => (
            <tr key={g.id}>
              <td>{formatLong(g.issuedOn)}</td>
              <td>
                <div className="stack stack--2">
                  <span className="u-strong u-ink">{g.name}</span>
                  {g.note && <span className="text-small">{g.note}</span>}
                </div>
              </td>
              <td>{shareClassLabel(g.shareClass)}</td>
              <td className="data-table__mono">{g.shareClass === "safe" ? (g.estimatedShares == null ? "—" : `~${count(g.estimatedShares)}`) : count(g.shares)}</td>
              <td className="data-table__mono">{g.vestMonths ? `${count(g.vested)} (${sharePct(g.vested, g.shares)})` : "—"}</td>
              <td className="data-table__mono">
                {g.investedCents ? money(g.investedCents) : "—"}
                {g.capCents ? ` · cap ${money(g.capCents)}` : ""}
              </td>
              <td className="data-table__actions">
                <RowActions kind="grants" id={g.id} name={`${g.name}’s entry`} onEdit={() => setOpen({ kind: "grant", grant: g })} />
              </td>
            </tr>
          ))}
        </SimpleTable>
      </SectionCard>

      <SectionCard
        kicker={`ROUNDS & DILUTION · ${c.rounds.length}`}
        action={
          <Button variant="primary" aria-haspopup="dialog" onClick={() => setOpen({ kind: "round" })}>
            + Add round
          </Button>
        }
        note="Ownership of issued shares right after each round closed."
      >
        <SimpleTable head={["Round", "Pre-money", "Raised", "Post-money", "Ownership after", "Actions"]} empty="No rounds yet.">
          {c.rounds.map((r) => (
            <tr key={r.roundId}>
              <td>
                <div className="stack stack--2">
                  <span className="u-strong u-ink">{r.name}</span>
                  <span className="text-small">{formatLong(r.closedOn)}</span>
                </div>
              </td>
              <td className="data-table__mono">{r.preMoneyCents == null ? "—" : money(r.preMoneyCents)}</td>
              <td className="data-table__mono">{money(r.raisedCents)}</td>
              <td className="data-table__mono">{r.postMoneyCents == null ? "—" : money(r.postMoneyCents)}</td>
              <td className="text-small">{r.ownership.map((o) => `${categoryLabel(o.category)} ${sharePct(o.shares, r.issued)}`).join(" · ") || "—"}</td>
              <td className="data-table__actions">
                <RowActions kind="rounds" id={r.roundId} name={r.name} onEdit={() => setOpen({ kind: "round", round: r })} />
              </td>
            </tr>
          ))}
        </SimpleTable>
      </SectionCard>

      <SectionCard
        kicker="ESOP VESTING POOL"
        action={
          <Button variant="outline" aria-haspopup="dialog" onClick={() => setOpen({ kind: "pool" })}>
            Edit shares & pool
          </Button>
        }
        note={c.poolOverdrawn ? "More options are granted than the pool holds. Increase the pool." : undefined}
      >
        <StatGrid
          items={[
            { label: "Pool", value: count(c.optionPool), tone: "purple", glyph: "#" },
            { label: "Granted", value: count(c.optionsGranted), tone: c.poolOverdrawn ? "red" : "cyan", glyph: "#" },
            { label: "Vested", value: count(c.optionsVested), tone: "green", glyph: "#" },
            { label: "Available", value: count(c.optionsAvailable), tone: "amber", glyph: "#" },
          ]}
        />
      </SectionCard>

      <SectionCard
        kicker="DISTRIBUTIONS"
        action={
          <Button variant="outline" onClick={() => goTo("distributions")}>
            Declare Distribution
          </Button>
        }
      >
        <span className="text-small">
          {data.payouts.length
            ? `${data.payouts.filter((p) => p.paid).length} of ${data.payouts.length} payouts paid. `
            : "Nothing declared yet. "}
          Dividends and other payouts, their tax and proof of payment are on Declare Distribution.
        </span>
      </SectionCard>

      {open?.kind === "grant" && <GrantModal grant={open.grant} data={data} {...done} />}
      {open?.kind === "round" && <RoundModal round={open.round} {...done} />}
      {open?.kind === "pool" && <PoolModal settings={data.settings} {...done} />}
      {open?.kind === "valuation" && <ValuationModal settings={data.settings} {...done} />}
    </div>
  );
}
