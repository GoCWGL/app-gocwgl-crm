"use client";

import { useState } from "react";
import { Badge, Button, ColumnChart, ConfirmDialog, FormError, LoadState, SearchBox, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES, expenseLabel, monthName, sharePct } from "@/data/shareholders";
import { downloadCsv } from "@/lib/csv";
import type { ExpenseOut, ExpensesOut, RecurringExpenseOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCents, formatCentsExact } from "@/utils/format/money";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { usePeso } from "@/utils/hooks/useExchangeRate";
import { useDeleteExpense, useDeleteRecurringExpense, useExpenses, useOpenExpenseReceipt } from "@/utils/hooks/useExpenses";
import { Amount, HeroPeso, PesoRateBar } from "../../components/Peso";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { Bars, Hero, Panel } from "../shareholders/OverviewParts";
import { SimpleTable } from "../shareholders/shared";
import { ExpenseModal, INTERVALS, RecurringModal } from "./ExpenseModals";

/** Income & Billing › Expenses: hosting, clients' hosting and everything else the business spends, once or repeating. */
export function ExpensesSection() {
  const query = useExpenses();
  return (
    <LoadState query={query} loadingText="Loading expenses…">
      {query.data && <Expenses data={query.data} />}
    </LoadState>
  );
}

const sum = (list: ExpenseOut[]) => list.reduce((t, e) => t + e.amountCents, 0);

function Expenses({ data }: { data: ExpensesOut }) {
  const { notify } = useAdmin();
  const openReceipt = useOpenExpenseReceipt();
  const [editing, setEditing] = useState<ExpenseOut | "new" | null>(null);
  const [repeating, setRepeating] = useState<RecurringExpenseOut | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExpenseOut | RecurringExpenseOut | null>(null);
  const [year, setYear] = useState(data.today.slice(0, 4));
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const nameOf = (id: string | null) => {
    if (!id) return "";
    const c = contacts.find((x) => x.id === id) ?? archived.find((x) => x.id === id);
    return c ? contactName(c) : "Removed client";
  };
  const money = (cents: number) => formatCentsExact(cents, data.currency);
  const peso = usePeso();
  const inPesos = peso.toCents(0, data.currency) !== null;
  const amount = (cents: number) => <Amount cents={cents} currency={data.currency} />;
  const withPesos = (cents: number) => [money(cents), inPesos && `(${peso.text(cents, data.currency)})`].filter(Boolean).join(" ");

  const builtIn = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.value));
  const customCategories = [...new Set([...data.expenses, ...data.recurring].map((e) => e.category).filter((c) => !builtIn.has(c)))].sort((a, b) => a.localeCompare(b));
  const shared = {
    customCategories,
    today: data.today,
    currency: data.currency,
    clients: contacts.map((c) => ({ value: c.id, label: contactName(c) })).sort((a, b) => a.label.localeCompare(b.label)),
  };
  const years = [...new Set([data.today.slice(0, 4), ...data.expenses.map((e) => e.spentOn.slice(0, 4))])].sort().reverse();
  const inYear = data.expenses.filter((e) => !year || e.spentOn.startsWith(`${year}-`));
  const q = search.trim().toLowerCase();
  const shown = inYear.filter(
    (e) =>
      (!category || e.category === category) &&
      (!q || [e.description, e.vendor, e.reference, e.method, expenseLabel(e.category), nameOf(e.contactId)].some((v) => v.toLowerCase().includes(q))),
  );
  const thisMonth = data.today.slice(0, 7);
  const byCategory = [...new Set(inYear.map((e) => e.category))]
    .map((c) => ({ c, list: inYear.filter((e) => e.category === c) }))
    .map(({ c, list }) => ({ c, cents: sum(list), count: list.length }))
    .sort((a, b) => b.cents - a.cents);
  const perMonth = data.recurring.reduce((t, r) => t + r.monthlyCents, 0);
  const total = sum(inYear);
  const monthTotal = sum(data.expenses.filter((e) => e.spentOn.startsWith(thisMonth)));
  const [y, m] = thisMonth.split("-").map(Number);
  const lastMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const lastMonthTotal = sum(data.expenses.filter((e) => e.spentOn.startsWith(lastMonth)));
  const period = year || "all time";
  const chartYear = year || data.today.slice(0, 4);

  const exportCsv = () =>
    downloadCsv(
      `expenses-${year || "all"}.csv`,
      ["Date", "Category", "Description", "Paid to", "Client", "Paid with", "Reference", `Amount (${data.currency})`, ...(inPesos ? ["Amount in PHP"] : [])],
      shown.map((e) => [e.spentOn, expenseLabel(e.category), e.description, e.vendor, nameOf(e.contactId), e.method, e.reference, (e.amountCents / 100).toFixed(2), ...(inPesos ? [((peso.toCents(e.amountCents, data.currency) ?? 0) / 100).toFixed(2)] : [])]),
    );

  return (
    <div className="stack stack--16">
      <div className="ov-toolbar">
        <Select size="sm" className="input--auto" aria-label="Year" placeholder="All time" value={year} options={years} onChange={(e) => setYear(e.target.value)} />
        <span className="cluster">
          <Button variant="outline" aria-haspopup="dialog" onClick={() => setRepeating("new")}>
            + Repeating expense
          </Button>
          <Button variant="primary" aria-haspopup="dialog" onClick={() => setEditing("new")}>
            + Add expense
          </Button>
        </span>
      </div>
      <PesoRateBar currency={data.currency} />
      <Hero
        label={`Total expenses, ${period}`}
        value={money(total)}
        badge={<HeroPeso cents={total} currency={data.currency} />}
        text={`${inYear.length} expense${inYear.length === 1 ? "" : "s"}${byCategory[0] ? `. Most went to ${expenseLabel(byCategory[0].c)}, ${sharePct(byCategory[0].cents, total)} of it.` : "."}`}
        stats={[
          { label: "This month", value: amount(monthTotal), hint: `${money(lastMonthTotal)} last month` },
          { label: "Hosting", value: amount(sum(inYear.filter((e) => e.category === "hosting"))), hint: period },
          { label: "Client hosting", value: amount(sum(inYear.filter((e) => e.category === "client_hosting"))), hint: period },
          { label: "Repeating", value: amount(perMonth), hint: "About this much a month" },
        ]}
      />

      <div className="ov-grid ov-grid--wide">
        <Panel title="Expenses by month" hint={chartYear}>
          <ColumnChart
            label={`Expenses per month, ${chartYear}`}
            series={[{ key: "expenses", label: "Expenses", color: "#d97706" }]}
            data={Array.from({ length: 12 }, (_, i) => `${chartYear}-${String(i + 1).padStart(2, "0")}`).map((m) => ({
              label: monthName(m),
              title: `${monthName(m, "long")} ${chartYear}`,
              values: [sum(data.expenses.filter((e) => e.spentOn.startsWith(m)))],
              current: m === thisMonth,
              future: m > thisMonth,
            }))}
            format={(n) => [money(n), peso.text(n, data.currency)].filter(Boolean).join(" ")}
            axisFormat={(n) => formatCents(Math.round(n / 100) * 100, data.currency)}
            height={260}
          />
        </Panel>
        <Panel title="Where it went" hint={`By category, ${period}`}>
          {byCategory.length ? (
            <Bars
              rows={byCategory.map((c) => ({
                key: c.c,
                label: expenseLabel(c.c),
                hint: `${c.count} · ${sharePct(c.cents, total)}`,
                value: c.cents,
                display: <Amount cents={c.cents} currency={data.currency} />,
                color: "#d97706",
              }))}
            />
          ) : (
            <div className="empty-state">No expenses in this period.</div>
          )}
        </Panel>
      </div>

      <Panel
        title={`Repeating expenses · ${data.recurring.length}`}
        hint={data.recurring.length ? `About ${withPesos(perMonth)} a month. Each one is added to the list below on its date.` : undefined}
      >
        <SimpleTable head={["Expense", "Category", "For client", "Amount", "Repeats", "Next", "Actions"]} empty="None yet. Add hosting, software and other bills that repeat, and they’re added by themselves.">
          {data.recurring.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="stack stack--2">
                  <span className="u-strong u-ink">{r.description || expenseLabel(r.category)}</span>
                  {r.vendor && <span className="text-small">{r.vendor}</span>}
                </div>
              </td>
              <td>
                <Badge tone="neutral">{expenseLabel(r.category)}</Badge>
              </td>
              <td>{nameOf(r.contactId) || "—"}</td>
              <td className="data-table__mono">{amount(r.amountCents)}</td>
              <td>{INTERVALS.find((i) => i.value === r.interval)?.label}</td>
              <td>{r.nextOn ? formatLong(r.nextOn) : <Badge tone="neutral">{r.active ? "Ended" : "Paused"}</Badge>}</td>
              <td className="data-table__actions">
                <Actions name={r.description || expenseLabel(r.category)} onEdit={() => setRepeating(r)} onDelete={() => setDeleting(r)} />
              </td>
            </tr>
          ))}
        </SimpleTable>
      </Panel>

      <Panel
        title={`All expenses · ${shown.length}`}
        action={
          <Button variant="outline" disabled={!shown.length} onClick={exportCsv}>
            Export CSV
          </Button>
        }
        hint={shown.length !== inYear.length ? `Showing ${withPesos(sum(shown))} of ${withPesos(total)}.` : period === year ? `Paid in ${year}.` : "Every expense so far."}
      >
        <div className="cluster">
          <SearchBox label="Search expenses" placeholder="Search expenses" value={search} onChange={setSearch} />
          <Select
            className="input--auto"
            aria-label="Category"
            placeholder="All categories"
            value={category}
            options={[...EXPENSE_CATEGORIES, ...customCategories.map((c) => ({ value: c, label: c }))]}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <FormError error={openReceipt.error} />
        <SimpleTable
          head={["Date", "Expense", "Category", "For client", "Paid with", "Amount", "Actions"]}
          empty={data.expenses.length ? "Nothing matches." : "No expenses yet. Add hosting, client hosting or any custom expense."}
        >
          {shown.map((e) => (
            <tr key={e.id}>
              <td>{formatLong(e.spentOn)}</td>
              <td>
                <div className="stack stack--2">
                  <span className="u-strong u-ink">{e.description || expenseLabel(e.category)}</span>
                  <span className="text-small">{[e.vendor, e.reference && `Ref. ${e.reference}`, e.recurringId && "Repeating"].filter(Boolean).join(" · ")}</span>
                </div>
              </td>
              <td>
                <Badge tone="neutral">{expenseLabel(e.category)}</Badge>
              </td>
              <td>{nameOf(e.contactId) || "—"}</td>
              <td>{e.method || "—"}</td>
              <td className="data-table__mono u-strong">{amount(e.amountCents)}</td>
              <td className="data-table__actions">
                {e.receiptName && (
                  <button
                    type="button"
                    className="row-action"
                    aria-label={`Receipt for ${e.description || expenseLabel(e.category)}`}
                    disabled={openReceipt.isPending}
                    onClick={() => openReceipt.mutate(e.id)}
                  >
                    Receipt
                  </button>
                )}
                <Actions name={e.description || expenseLabel(e.category)} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />
              </td>
            </tr>
          ))}
        </SimpleTable>
      </Panel>

      {editing && (
        <ExpenseModal
          expense={editing === "new" ? undefined : editing}
          shared={shared}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            notify(m);
          }}
        />
      )}
      {repeating && (
        <RecurringModal
          recurring={repeating === "new" ? undefined : repeating}
          shared={shared}
          onClose={() => setRepeating(null)}
          onSaved={(m) => {
            setRepeating(null);
            notify(m);
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          item={deleting}
          amount={withPesos(deleting.amountCents)}
          onClose={() => setDeleting(null)}
          onDone={(m) => {
            setDeleting(null);
            notify(m);
          }}
        />
      )}
    </div>
  );
}

function Actions({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <button type="button" className="row-action row-action--brand" aria-label={`Edit ${name}`} onClick={onEdit}>
        Edit
      </button>
      <button type="button" className="row-action row-action--danger" aria-label={`Delete ${name}`} onClick={onDelete}>
        Delete
      </button>
    </>
  );
}

function DeleteDialog({
  item,
  amount,
  onClose,
  onDone,
}: {
  item: ExpenseOut | RecurringExpenseOut;
  amount: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const removeOne = useDeleteExpense();
  const removeRepeat = useDeleteRecurringExpense();
  const repeats = "interval" in item;
  const remove = repeats ? removeRepeat : removeOne;
  return (
    <ConfirmDialog
      title={repeats ? "Stop this repeating expense?" : "Delete this expense?"}
      icon="trash"
      confirmLabel={repeats ? "Stop and delete" : "Delete expense"}
      pending={remove.isPending}
      error={remove.error}
      onClose={onClose}
      onConfirm={() => remove.mutate(item.id, { onSuccess: () => onDone(repeats ? "It won’t be added again." : "Expense deleted. Net income is updated.") })}
    >
      {repeats
        ? `${amount} for ${item.description || expenseLabel(item.category)} won’t be added any more. Expenses it already added stay.`
        : `${amount} for ${item.description || expenseLabel(item.category)} is taken out of your expenses. This can’t be undone.`}
    </ConfirmDialog>
  );
}
