"use client";

import { useState } from "react";
import { Badge, Button, ColumnChart, ConfirmDialog, FormError, LoadState, SearchBox, Select, StatGrid } from "@/components/ui";
import { EXPENSE_CATEGORIES, expenseLabel, monthName, sharePct } from "@/data/shareholders";
import { downloadCsv } from "@/lib/csv";
import type { ExpenseOut, ExpensesOut, RecurringExpenseOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCents, formatCentsExact } from "@/utils/format/money";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useDeleteExpense, useDeleteRecurringExpense, useExpenses, useOpenExpenseReceipt } from "@/utils/hooks/useExpenses";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { SectionCard, SimpleTable } from "../shareholders/shared";
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

  const builtIn = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.value));
  const customCategories = [...new Set([...data.expenses, ...data.recurring].map((e) => e.category).filter((c) => !builtIn.has(c)))].sort((a, b) => a.localeCompare(b));
  const shared = {
    customCategories,
    today: data.today,
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
  const period = year || "all time";
  const chartYear = year || data.today.slice(0, 4);

  const exportCsv = () =>
    downloadCsv(
      `expenses-${year || "all"}.csv`,
      ["Date", "Category", "Description", "Paid to", "Client", "Paid with", "Reference", `Amount (${data.currency})`],
      shown.map((e) => [e.spentOn, expenseLabel(e.category), e.description, e.vendor, nameOf(e.contactId), e.method, e.reference, (e.amountCents / 100).toFixed(2)]),
    );

  return (
    <div className="stack stack--16">
      <div className="cluster cluster--end">
        <Button variant="outline" aria-haspopup="dialog" onClick={() => setRepeating("new")}>
          + Repeating expense
        </Button>
        <Button variant="primary" aria-haspopup="dialog" onClick={() => setEditing("new")}>
          + Add expense
        </Button>
      </div>
      <StatGrid
        items={[
          { label: `Total expenses, ${period}`, value: money(sum(inYear)), tone: "amber", glyph: "$" },
          { label: "This month", value: money(sum(data.expenses.filter((e) => e.spentOn.startsWith(thisMonth)))), tone: "cyan", glyph: "$" },
          { label: `Hosting, ${period}`, value: money(sum(inYear.filter((e) => e.category === "hosting"))), tone: "purple", glyph: "$" },
          { label: `Client hosting, ${period}`, value: money(sum(inYear.filter((e) => e.category === "client_hosting"))), tone: "green", glyph: "$" },
        ]}
      />

      <SectionCard kicker={`EXPENSES BY MONTH · ${chartYear}`}>
        <ColumnChart
          label={`Expenses per month, ${chartYear}`}
          series={[{ key: "expenses", label: "Expenses", color: "#f59e0b" }]}
          data={Array.from({ length: 12 }, (_, i) => `${chartYear}-${String(i + 1).padStart(2, "0")}`).map((m) => ({
            label: monthName(m),
            title: `${monthName(m, "long")} ${chartYear}`,
            values: [sum(data.expenses.filter((e) => e.spentOn.startsWith(m)))],
            current: m === thisMonth,
          }))}
          format={money}
          axisFormat={(n) => formatCents(Math.round(n / 100) * 100, data.currency)}
        />
      </SectionCard>

      <SectionCard
        kicker={`REPEATING · ${data.recurring.length}`}
        note={data.recurring.length ? `About ${money(perMonth)} a month. Each one is added to the list below on its date.` : undefined}
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
              <td>{expenseLabel(r.category)}</td>
              <td>{nameOf(r.contactId) || "—"}</td>
              <td className="data-table__mono">{money(r.amountCents)}</td>
              <td>{INTERVALS.find((i) => i.value === r.interval)?.label}</td>
              <td>{r.nextOn ? formatLong(r.nextOn) : <Badge tone="neutral">{r.active ? "Ended" : "Paused"}</Badge>}</td>
              <td className="data-table__actions">
                <Actions name={r.description || expenseLabel(r.category)} onEdit={() => setRepeating(r)} onDelete={() => setDeleting(r)} />
              </td>
            </tr>
          ))}
        </SimpleTable>
      </SectionCard>

      <SectionCard
        kicker={`EXPENSES · ${shown.length}`}
        action={
          <Button variant="outline" disabled={!shown.length} onClick={exportCsv}>
            Export CSV
          </Button>
        }
        note={shown.length !== inYear.length ? `Showing ${money(sum(shown))} of ${money(sum(inYear))}.` : undefined}
      >
        <div className="cluster">
          <SearchBox label="Search expenses" placeholder="Search expenses" value={search} onChange={setSearch} />
          <Select className="input--auto" aria-label="Year" placeholder="All time" value={year} options={years} onChange={(e) => setYear(e.target.value)} />
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
              <td>{expenseLabel(e.category)}</td>
              <td>{nameOf(e.contactId) || "—"}</td>
              <td>{e.method || "—"}</td>
              <td className="data-table__mono u-strong">{money(e.amountCents)}</td>
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
      </SectionCard>

      <SectionCard kicker={`BY CATEGORY · ${period.toUpperCase()}`}>
        <SimpleTable head={["Category", "Expenses", "Amount", "Share"]} empty="No expenses in this period.">
          {byCategory.map((c) => (
            <tr key={c.c}>
              <td className="u-strong u-ink">{expenseLabel(c.c)}</td>
              <td className="data-table__mono">{c.count}</td>
              <td className="data-table__mono">{money(c.cents)}</td>
              <td className="data-table__mono">{sharePct(c.cents, sum(inYear))}</td>
            </tr>
          ))}
        </SimpleTable>
      </SectionCard>

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
          amount={money(deleting.amountCents)}
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
