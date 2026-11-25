"use client";

import { useState } from "react";
import { Badge, Button, ColumnChart, Field, Input, LoadState, Select, StatGrid, Tabs } from "@/components/ui";
import { expenseLabel, MILESTONE_KINDS, milestoneLabel, monthName } from "@/data/shareholders";
import type { CashBalanceOut, MilestoneIn, MilestoneOut, ShareholderOverviewOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { useSaveRecord, useShareholders } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { CashTab } from "./CashTab";
import { ValuationModal } from "./EquityModals";
import { Budget, ExpensesLink, IncomeSources, ProfitAndLoss, ReferralCosts, runwayText, UnitEconomics } from "./FinancialParts";
import { Bars, Entry, Hero, Panel, Trend } from "./OverviewParts";
import { FormModal, RowActions } from "./shared";

type View = "summary" | "costs" | "cash" | "budget";

/** Shareholders › Overview: how the business is doing, its income and costs, its cash, and its budget. */
export function InvestorOverviewSection() {
  const [year, setYear] = useState<number>();
  const query = useShareholders(year);
  return (
    <LoadState query={query} loadingText="Loading the overview…">
      {query.data && <Overview data={query.data} onYear={setYear} />}
    </LoadState>
  );
}

function Overview({ data, onYear }: { data: ShareholderOverviewOut; onYear: (year: number) => void }) {
  const { health: h, results: r } = data;
  const { notify } = useAdmin();
  const [view, setView] = useState<View>("summary");
  const [valuing, setValuing] = useState(false);
  const [cash, setCash] = useState<CashBalanceOut | "new" | null>(null);
  const [date, setDate] = useState<MilestoneOut | "new" | null>(null);
  const money = (cents: number) => formatCents(cents, r.currency);
  const upcoming = data.milestones.filter((m) => m.happensOn >= data.today);
  const past = data.milestones.filter((m) => m.happensOn < data.today).reverse();
  const years = r.years.includes(r.year) ? r.years : [r.year, ...r.years];
  const current = r.months.find((m) => m.month === data.today.slice(0, 7));
  const thisMonth = current ? current.netIncomeCents : null;
  const costs = [
    ...r.categories.map((c) => ({ label: expenseLabel(c.category), value: c.amountCents })),
    ...(r.bonusCents ? [{ label: "Referral payouts", value: r.bonusCents }] : []),
  ].sort((a, b) => b.value - a.value);
  const saved = (close: () => void) => (message: string) => {
    close();
    notify(message);
  };
  return (
    <div className="stack stack--16">
      <div className="card card--flat board board--bar-only">
        <div className="board__bar">
          <Tabs<View>
            label="Overview"
            value={view}
            onChange={setView}
            options={[
              { value: "summary", label: "Summary", hint: "How we’re doing", icon: "gauge" },
              { value: "costs", label: "Income & costs", hint: "Where money came and went", icon: "chart", tone: "cyan" },
              { value: "cash", label: "Money in the bank", hint: "How long it lasts", icon: "dollar", tone: "green" },
              { value: "budget", label: "Budget", hint: "Plan against actual", icon: "clipboard", tone: "purple" },
            ]}
          />
        </div>
      </div>
      {view !== "cash" && (
        <div className="cluster cluster--end">
          <Select size="sm" className="input--auto" aria-label="Year" value={String(r.year)} options={years.map(String)} onChange={(e) => onYear(Number(e.target.value))} />
        </div>
      )}

      {view === "summary" && (
        <>
          <Hero
            label={`Net income ${r.year}`}
            value={formatCentsExact(r.netIncomeCents, r.currency)}
            badge={thisMonth === null ? undefined : <Trend up={thisMonth >= 0}>{`${money(Math.abs(thisMonth))} this month`}</Trend>}
            text="What’s left for the owners after costs and what was already distributed."
            stats={[
              { label: "Income", value: money(r.incomeCents), hint: "Paid invoices" },
              { label: "Costs", value: `−${money(r.expenseCents + r.bonusCents)}`, hint: "Expenses and referral payouts" },
              { label: "Distributed", value: `−${money(r.distributedCents)}`, hint: "Cash dividends declared" },
            ]}
          />
          <div className="ov-grid ov-grid--wide">
            <Panel
              title="Income and costs by month"
              hint={r.outstandingCents ? `${money(r.outstandingCents)} more is invoiced but not paid yet.` : "Paid invoices against expenses and referral payouts."}
            >
              <ColumnChart
                label={`Income and costs per month, ${r.year}`}
                series={[
                  { key: "income", label: "Income", color: "#0891b2" },
                  { key: "costs", label: "Costs", color: "#d97706" },
                ]}
                data={r.months.map((m) => ({
                  label: monthName(m.month),
                  title: `${monthName(m.month, "long")} ${r.year}`,
                  values: [m.incomeCents, m.expenseCents + m.bonusCents],
                  current: m.month === data.today.slice(0, 7),
                }))}
                format={money}
                axisFormat={(n) => formatCents(Math.round(n / 100) * 100, r.currency)}
              />
            </Panel>
            <Panel title="Where costs went" hint={String(r.year)}>
              {costs.length ? (
                <Bars rows={costs.map((c) => ({ ...c, display: money(c.value), color: "#d97706" }))} />
              ) : (
                <div className="empty-state">No costs recorded in {r.year}.</div>
              )}
            </Panel>
          </div>
          <div className="ov-metrics">
            <Panel
              title="Company value"
              hint={h.valuedOn ? `${h.valuationSource}, ${formatLong(h.valuedOn)}` : "What the whole company is worth."}
              action={
                <Button size="sm" variant="outline" onClick={() => setValuing(true)}>
                  {h.valuationCents == null ? "Set" : "Change"}
                </Button>
              }
            >
              <span className="ov-metric">{h.valuationCents == null ? "Not set" : money(h.valuationCents)}</span>
            </Panel>
            <Panel
              title="Money in the bank"
              hint="Updated as money comes in and out."
              action={
                <Button size="sm" variant="outline" onClick={() => setView("cash")}>
                  Open
                </Button>
              }
            >
              <span className="ov-metric">{h.cashCents == null ? "Not entered" : money(h.cashCents)}</span>
            </Panel>
            <Panel title="How long it lasts" hint="Runway, at the pace of the last 3 months.">
              <span className="ov-metric">{runwayText(h)}</span>
            </Panel>
          </div>
          <Panel
            title="Upcoming dates"
            hint="Board meetings, milestones and deadlines."
            action={
              <Button variant="outline" aria-haspopup="dialog" onClick={() => setDate("new")}>
                + Add date
              </Button>
            }
          >
            {upcoming.length + past.length ? (
              <ul className="ov-list">
                {[...upcoming, ...past.slice(0, 5)].map((m) => (
                  <Entry
                    key={m.id}
                    date={formatLong(m.happensOn)}
                    title={m.title}
                    value={
                      <Badge tone={m.happensOn < data.today ? "neutral" : m.kind === "board" ? "purple" : m.kind === "deadline" ? "amber" : "green"}>
                        {milestoneLabel(m.kind)}
                        {m.happensOn < data.today ? " · past" : ""}
                      </Badge>
                    }
                    actions={<RowActions kind="milestones" id={m.id} name={m.title} onEdit={() => setDate(m)} />}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty-state">Nothing coming up.</div>
            )}
          </Panel>
        </>
      )}

      {view === "costs" && (
        <>
          <IncomeSources data={data} />
          <ReferralCosts data={data} />
          <ExpensesLink data={data} />
          <ProfitAndLoss data={data} />
          <Panel title="Recurring revenue" hint="Income that repeats: active subscriptions, per month (MRR) and per year (ARR).">
            <StatGrid
              items={[
                { label: "Per month (MRR)", value: money(h.mrrCents), tone: "cyan", glyph: "$" },
                { label: "Per year (ARR)", value: money(h.arrCents), tone: "purple", glyph: "$" },
              ]}
            />
          </Panel>
          <Panel title="Recurring revenue collected" hint="Paid subscription renewals and VA maintenance fees, last 12 months. A yearly plan counts in the month it’s paid.">
            {h.recurring.some((m) => m.amountCents) ? (
              <ColumnChart
                label="Recurring revenue collected per month"
                series={[{ key: "recurring", label: "Collected", color: "#0891b2" }]}
                data={h.recurring.map((m, i) => ({
                  label: monthName(m.month),
                  title: `${monthName(m.month, "long")} ${m.month.slice(0, 4)}`,
                  values: [m.amountCents],
                  current: i === h.recurring.length - 1,
                }))}
                format={money}
                axisFormat={(n) => formatCents(Math.round(n / 100) * 100, r.currency)}
              />
            ) : (
              <div className="empty-state">No recurring payments in the last 12 months.</div>
            )}
          </Panel>
          <UnitEconomics data={data} />
        </>
      )}

      {view === "cash" && <CashTab data={data} onAdd={() => setCash("new")} onEdit={setCash} />}

      {view === "budget" && <Budget data={data} />}

      {valuing && <ValuationModal settings={data.settings} onClose={() => setValuing(false)} onSaved={saved(() => setValuing(false))} />}
      {cash && <CashModal today={data.today} cash={cash === "new" ? undefined : cash} onClose={() => setCash(null)} onSaved={saved(() => setCash(null))} />}
      {date && <DateModal today={data.today} milestone={date === "new" ? undefined : date} onClose={() => setDate(null)} onSaved={saved(() => setDate(null))} />}
    </div>
  );
}

type Done = { onClose: () => void; onSaved: (message: string) => void };

function CashModal({ cash, today, onClose, onSaved }: Done & { cash?: CashBalanceOut; today: string }) {
  const save = useSaveRecord("cash");
  const [asOf, setAsOf] = useState(cash?.asOf ?? today);
  const [amount, setAmount] = useState(cash ? centsToDollars(cash.amountCents) : "");
  const [error, setError] = useState("");
  const submit = () => {
    if (!asOf || amount.trim() === "") return setError("Enter the total and its date.");
    const cents = dollarsToCents(amount) * (amount.trim().startsWith("-") ? -1 : 1);
    save.mutate({ id: cash?.id, body: { asOf, amountCents: cents } }, { onSuccess: () => onSaved("Bank balance saved.") });
  };
  return (
    <FormModal
      id="cash-title"
      kicker="BANK BALANCE"
      title={cash ? "Edit bank balance" : "How much is in the bank?"}
      subtitle="Open your bank app and add up every business account (bank, Wise, GCash), in your business currency."
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Total balance" htmlFor="cash-amt" required>
          <Input id="cash-amt" type="number" step="0.01" mono placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="On what date?" htmlFor="cash-day" required hint="For today, enter what’s there right now. For a past day, what was there at the end of it.">
          <Input id="cash-day" type="date" max={today} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </div>
    </FormModal>
  );
}

function DateModal({ milestone, today, onClose, onSaved }: Done & { milestone?: MilestoneOut; today: string }) {
  const save = useSaveRecord("milestones");
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [happensOn, setHappensOn] = useState(milestone?.happensOn ?? today);
  const [kind, setKind] = useState<MilestoneIn["kind"]>((milestone?.kind as MilestoneIn["kind"]) ?? "board");
  const [error, setError] = useState("");
  const submit = () => {
    if (!title.trim() || !happensOn) return setError("Enter what it is and when.");
    save.mutate({ id: milestone?.id, body: { title: title.trim(), happensOn, kind } }, { onSuccess: () => onSaved("Date saved.") });
  };
  return (
    <FormModal id="ms-title" kicker="DATES" title={milestone ? "Edit date" : "Add a date"} mutation={save} error={error} onSubmit={submit} onClose={onClose}>
      <Field label="What" htmlFor="ms-what" required>
        <Input id="ms-what" maxLength={160} value={title} placeholder="e.g. Q1 board meeting" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Date" htmlFor="ms-day" required>
          <Input id="ms-day" type="date" value={happensOn} onChange={(e) => setHappensOn(e.target.value)} />
        </Field>
        <Field label="Kind" htmlFor="ms-kind">
          <Select id="ms-kind" value={kind} options={MILESTONE_KINDS} onChange={(e) => setKind(e.target.value as MilestoneIn["kind"])} />
        </Field>
      </div>
    </FormModal>
  );
}
