"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES, expenseLabel } from "@/data/shareholders";
import type { ExpenseOut, RecurringExpenseIn, RecurringExpenseOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents, formatCentsExact } from "@/utils/format/money";
import { usePeso } from "@/utils/hooks/useExchangeRate";
import { useSaveExpense, useSaveRecurringExpense, useSetExpenseReceipt } from "@/utils/hooks/useExpenses";
import { FormModal } from "../shareholders/shared";

type Done = { onClose: () => void; onSaved: (message: string) => void };
export type ClientOption = { value: string; label: string };
type Shared = { currency: string; customCategories: string[]; clients: ClientOption[]; today: string };

const CUSTOM = "__custom";
const MAX_CENTS = 1_000_000_000;
const amountProblem = (cents: number) => (cents > 0 && cents <= MAX_CENTS ? "" : "Enter an amount up to 10,000,000.");

/** A built-in category, one you've used before, or a new custom one. */
function useCategory(initial: string, customCategories: string[]) {
  const known = [...EXPENSE_CATEGORIES.map((c) => c.value as string), ...customCategories];
  const [choice, setChoice] = useState(known.includes(initial) ? initial : initial ? CUSTOM : "hosting");
  const [custom, setCustom] = useState(known.includes(initial) ? "" : initial);
  const value = choice === CUSTOM ? custom.trim() : choice;
  const field = (id: string) => (
    <>
      <Field label="Category" htmlFor={`${id}-cat`}>
        <Select id={`${id}-cat`} value={choice} onChange={(e) => setChoice(e.target.value)}>
          <optgroup label="Categories">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </optgroup>
          {customCategories.length > 0 && (
            <optgroup label="Your categories">
              {customCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          )}
          <option value={CUSTOM}>+ Custom category…</option>
        </Select>
      </Field>
      {choice === CUSTOM && (
        <Field label="Custom category" htmlFor={`${id}-custom`} required>
          <Input id={`${id}-custom`} maxLength={60} value={custom} placeholder="e.g. Team travel" onChange={(e) => setCustom(e.target.value)} />
        </Field>
      )}
    </>
  );
  return { value, field };
}

/** The fields one-time and repeating expenses share. */
function useDetails(x: Partial<Pick<ExpenseOut, "description" | "vendor" | "method" | "contactId" | "amountCents" | "category">> | undefined, shared: Shared) {
  const category = useCategory(x?.category ?? "", shared.customCategories);
  const [amount, setAmount] = useState(x?.amountCents ? centsToDollars(x.amountCents) : "");
  const [description, setDescription] = useState(x?.description ?? "");
  const [vendor, setVendor] = useState(x?.vendor ?? "");
  const [method, setMethod] = useState(x?.method ?? "");
  const [contactId, setContact] = useState(x?.contactId ?? "");
  const [entered, setEntered] = useState<"USD" | "PHP">("USD");
  const peso = usePeso();
  const convertible = peso.toCents(0, shared.currency) !== null;
  const inPesos = entered === "PHP" && convertible && peso.rate !== null;
  // Always saved in the business currency.
  const cents = inPesos ? Math.round(dollarsToCents(amount) / peso.rate!) : dollarsToCents(amount);
  const equals = cents > 0 && convertible ? (inPesos ? `Saved as ${formatCentsExact(cents, shared.currency)}.` : peso.text(cents, shared.currency)) : undefined;
  const problem = amountProblem(cents) || (category.value ? "" : "Name the custom category.");
  const body = { category: category.value, description: description.trim(), amountCents: cents, vendor: vendor.trim(), method: method.trim(), contactId: contactId || null };
  const top = (id: string) => (
    <>
      <Field label="Amount" htmlFor={`${id}-amt`} required hint={equals}>
        <div className="peso-input">
          <Input id={`${id}-amt`} type="number" min={0} step="0.01" mono placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {convertible && (
            <Select
              aria-label="Currency of the amount"
              value={entered}
              options={[
                { value: "USD", label: "$ USD" },
                { value: "PHP", label: "₱ PHP" },
              ]}
              onChange={(e) => {
                const to = e.target.value as "USD" | "PHP";
                // The same money, in the other currency.
                if (amount && cents > 0) setAmount(centsToDollars(to === "PHP" ? (peso.toCents(cents, shared.currency) ?? 0) : cents));
                setEntered(to);
              }}
            />
          )}
        </div>
      </Field>
      {category.field(id)}
    </>
  );
  const rest = (id: string) => (
    <>
      <Field label="Description" htmlFor={`${id}-desc`}>
        <Input id={`${id}-desc`} maxLength={200} value={description} placeholder="e.g. Server hosting" onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Paid to" htmlFor={`${id}-vendor`}>
        <Input id={`${id}-vendor`} maxLength={120} value={vendor} placeholder="e.g. AWS" onChange={(e) => setVendor(e.target.value)} />
      </Field>
      <Field label="For client" htmlFor={`${id}-client`} hint={category.value === "client_hosting" ? "Whose hosting this is." : undefined}>
        <Select id={`${id}-client`} placeholder="No client" value={contactId} options={shared.clients} onChange={(e) => setContact(e.target.value)} />
      </Field>
      <Field label="Paid with" htmlFor={`${id}-method`}>
        <Input id={`${id}-method`} maxLength={60} value={method} placeholder="e.g. Company card" onChange={(e) => setMethod(e.target.value)} />
      </Field>
    </>
  );
  return { body, problem, top, rest };
}

export function ExpenseModal({ expense, shared, onClose, onSaved }: Done & { expense?: ExpenseOut; shared: Shared }) {
  const save = useSaveExpense();
  const receipt = useSetExpenseReceipt();
  const details = useDetails(expense, shared);
  // Set once saved, so retrying a failed receipt never adds it twice.
  const [id, setId] = useState(expense?.id);
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? shared.today);
  const [reference, setReference] = useState(expense?.reference ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const submit = async () => {
    const problem = details.problem || (spentOn && spentOn <= shared.today ? "" : "Choose the date it was paid, up to today.");
    setError(problem);
    if (problem) return;
    try {
      const saved = await save.mutateAsync({ id, body: { ...details.body, spentOn, reference: reference.trim() } });
      setId(saved.id);
      if (file) await receipt.mutateAsync({ id: saved.id, file });
      onSaved(expense ? "Expense saved." : "Expense added. Net income is updated.");
    } catch {
      // Shown below the form.
    }
  };
  return (
    <FormModal
      id="xp-title"
      kicker="EXPENSES"
      title={expense ? "Edit expense" : "Add an expense"}
      subtitle="Referral payouts you mark paid are counted already, so don’t add them here."
      width={640}
      mutation={{ isPending: save.isPending || receipt.isPending, error: save.error ?? receipt.error }}
      error={error}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <div className="form-grid">
        {details.top("xp")}
        <Field label="Date" htmlFor="xp-day" required>
          <Input id="xp-day" type="date" max={shared.today} value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        </Field>
        {details.rest("xp")}
        <Field label="Reference no." htmlFor="xp-ref">
          <Input id="xp-ref" mono maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Receipt" htmlFor="xp-file" hint={expense?.receiptName ? `Saved: ${expense.receiptName}. Choose a file to replace it.` : "PDF or image."}>
          <Input id="xp-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
    </FormModal>
  );
}

export const INTERVALS: Array<{ value: RecurringExpenseIn["interval"]; label: string }> = [
  { value: "Week", label: "Every week" },
  { value: "Month", label: "Every month" },
  { value: "Quarter", label: "Every quarter" },
  { value: "Year", label: "Every year" },
];

export function RecurringModal({ recurring: r, shared, onClose, onSaved }: Done & { recurring?: RecurringExpenseOut; shared: Shared }) {
  const save = useSaveRecurringExpense();
  const details = useDetails(r, shared);
  const [interval, setInterval] = useState<RecurringExpenseIn["interval"]>((r?.interval as RecurringExpenseIn["interval"]) ?? "Month");
  const [startsOn, setStart] = useState(r?.startsOn ?? shared.today);
  const [endsOn, setEnd] = useState(r?.endsOn ?? "");
  const [active, setActive] = useState(r?.active ?? true);
  const [error, setError] = useState("");
  const submit = () => {
    const problem = details.problem || (!startsOn ? "Choose the first date." : endsOn && endsOn < startsOn ? "The end date can’t be before the start." : "");
    setError(problem);
    if (problem) return;
    save.mutate(
      { id: r?.id, body: { ...details.body, interval, startsOn, endsOn: endsOn || null, active } },
      { onSuccess: () => onSaved(r ? "Repeating expense saved." : "Repeating expense added. Each one is added on its day.") },
    );
  };
  return (
    <FormModal
      id="rx-title"
      kicker="REPEATING EXPENSE"
      title={r ? `Edit ${r.description || expenseLabel(r.category)}` : "Add a repeating expense"}
      subtitle={r ? "Changes apply from the next one. Expenses already added stay as they are." : "It’s added by itself on each date, like monthly hosting. A past start date adds the ones since then."}
      width={640}
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="form-grid">
        {details.top("rx")}
        <Field label="Repeats" htmlFor="rx-int">
          <Select id="rx-int" value={interval} options={INTERVALS} onChange={(e) => setInterval(e.target.value as RecurringExpenseIn["interval"])} />
        </Field>
        <Field label="First date" htmlFor="rx-start" required>
          <Input id="rx-start" type="date" value={startsOn} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Last date" htmlFor="rx-end" hint="Leave empty to keep going.">
          <Input id="rx-end" type="date" min={startsOn} value={endsOn} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        {r && (
          <Field label="Status" htmlFor="rx-active">
            <Select
              id="rx-active"
              value={active ? "on" : "off"}
              options={[
                { value: "on", label: "Active" },
                { value: "off", label: "Paused" },
              ]}
              onChange={(e) => setActive(e.target.value === "on")}
            />
          </Field>
        )}
        {details.rest("rx")}
      </div>
    </FormModal>
  );
}
