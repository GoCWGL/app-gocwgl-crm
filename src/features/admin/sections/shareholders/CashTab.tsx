"use client";

import { AreaChart, Button } from "@/components/ui";
import { monthName } from "@/data/shareholders";
import type { CashBalanceOut, ShareholderOverviewOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCents, formatCentsExact } from "@/utils/format/money";
import { Bars, Entry, Flow, Hero, Panel, Trend, type FlowStep } from "./OverviewParts";
import { RowActions } from "./shared";

/** Money in / money out (validated for color-blind readers; both are always labelled too). */
const IN = "#0891b2";
const OUT = "#d97706";

/** Overview › Money in the bank: how much there is, whether it's growing, and how long it lasts, in plain words. */
export function CashTab({ data, onAdd, onEdit }: { data: ShareholderOverviewOut; onAdd: () => void; onEdit: (c: CashBalanceOut) => void }) {
  const { health: h, results: r } = data;
  const money = (cents: number) => formatCents(Math.round(cents / 100) * 100, r.currency);
  const exact = (cents: number) => formatCentsExact(cents, r.currency);
  const started = h.cashCents != null && h.cashMoves != null;
  // The last 3 finished months, the ones the averages use.
  const [y, m] = data.today.split("-").map(Number);
  const monthAt = (offset: number) => new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
  const period = `${monthName(monthAt(-3), "long")}, ${monthName(monthAt(-2), "long")} and ${monthName(monthAt(-1), "long")}`;
  const spent = h.grossBurnCents;
  const received = h.grossBurnCents - h.netBurnCents;
  const losing = h.netBurnCents > 0;

  const year = started ? Math.max(0, h.cashCents! - h.netBurnCents * 12) : null;
  const quiet = received === 0 && spent === 0;

  if (!started)
    return (
      <Hero
        label="Money in the bank"
        value="Let’s start"
        text="Open your bank app and enter how much the business has today. From then on it moves by itself as invoices, expenses, referral bonuses and distributions are paid."
        actions={
          <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={onAdd}>
            Enter bank balance
          </Button>
        }
      />
    );

  const moves = h.cashMoves!;
  const steps: FlowStep[] = [
    { label: "Bank balance you entered", hint: formatLong(h.cashAsOf), value: exact(h.cashBalanceCents ?? 0), icon: "building", kind: "start" },
    { label: "Invoices clients paid", value: `+${exact(moves.receivedCents)}`, icon: "invoice", kind: "in" },
    { label: "Expenses", value: `−${exact(moves.spentCents)}`, icon: "receipt", kind: "out" },
    { label: "Referral bonuses", value: `−${exact(moves.bonusCents)}`, icon: "gift", kind: "out" },
    { label: "Distributions to shareholders", value: `−${exact(moves.payoutCents)}`, icon: "users", kind: "out" },
  ];
  steps.push({ label: "In the bank today", value: exact(h.cashCents!), icon: "check", kind: "total" });

  return (
    <>
      <Hero
        label="Money in the bank"
        value={exact(h.cashCents!)}
        badge={quiet ? undefined : <Trend up={!losing}>{losing ? "shrinking" : "growing"}</Trend>}
        text={
          h.cashCents! <= 0
            ? "There’s no money left according to these records. Check your bank and update the balance."
            : losing
              ? `At this pace the money lasts about ${h.runwayMonths} month${h.runwayMonths === 1 ? "" : "s"}.`
              : "At this pace it won’t run out: more comes in than goes out."
        }
        actions={
          <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={onAdd}>
            Update bank balance
          </Button>
        }
        stats={[
          { label: "Change a month", value: `${losing ? "−" : "+"}${money(Math.abs(h.netBurnCents))}`, hint: "Average, last 3 full months" },
          { label: "How long it lasts", value: losing && h.runwayMonths != null ? `${h.runwayMonths} months` : "Won’t run out", hint: "Also called runway" },
          { label: "In 12 months", value: money(year ?? 0), hint: "If every month is the same" },
        ]}
      />

      <div className="ov-grid">
        <Panel title="How we got to this amount" hint="Everything since you entered the bank balance.">
          <Flow steps={steps} />
        </Panel>
        <Panel title="Money in and out, a month" hint={`Average of ${period}.`}>
          <Bars
            rows={[
              { label: "Comes in", value: received, display: exact(received), color: IN },
              { label: "Goes out", value: spent, display: exact(spent), color: OUT },
            ]}
          />
          <div className={losing ? "ov-result is-down" : "ov-result is-up"}>
            <span>{quiet ? "Nothing moved in these months" : losing ? "Lost, a month" : "Gained, a month"}</span>
            <b>{exact(Math.abs(h.netBurnCents))}</b>
          </div>
          <span className="text-small">Goes out means expenses and referral bonuses; distributions aren’t included. One very good or bad month changes the average a lot.</span>
        </Panel>
      </div>

      {h.cashCents! > 0 && (
        <Panel title="The next 12 months" hint="What you’d have in the bank if every month goes like the average above. A guess from the past, not a promise.">
          <AreaChart
            label="Money in the bank, next 12 months"
            color={IN}
            data={[
              { label: "Now", title: "Today", value: h.cashCents! },
              ...Array.from({ length: 12 }, (_, i) => {
                const at = monthAt(i + 1);
                return { label: monthName(at), title: `${monthName(at, "long")} ${at.slice(0, 4)}`, value: Math.max(0, h.cashCents! - h.netBurnCents * (i + 1)) };
              }),
            ]}
            format={money}
            axisFormat={money}
          />
        </Panel>
      )}

      <Panel title="Bank balances you entered" hint="Update it about once a month. The newest one is used.">
        <ul className="ov-list">
          {data.cash.slice(0, 12).map((c) => (
            <Entry
              key={c.id}
              date={formatLong(c.asOf)}
              title={c.asOf === h.cashAsOf ? "In use" : "Earlier balance"}
              value={exact(c.amountCents)}
              actions={<RowActions kind="cash" id={c.id} name={`the ${formatLong(c.asOf)} balance`} onEdit={() => onEdit(c)} />}
            />
          ))}
        </ul>
      </Panel>
    </>
  );
}
