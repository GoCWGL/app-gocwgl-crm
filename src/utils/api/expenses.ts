import { api, del, download, get, post, put } from "./client";
import type { ExpenseIn, ExpenseOut, ExpensesOut, RecurringExpenseIn, RecurringExpenseOut } from "./models";

// Income & Billing › Expenses (owners and admins).
const BASE = "/admin/expenses";

export const listExpenses = () => get<ExpensesOut>(BASE);
/** Without an id it's added. */
export const saveExpense = (v: { id?: string; body: ExpenseIn }) => (v.id ? put<ExpenseOut>(`${BASE}/${v.id}`, v.body) : post<ExpenseOut>(BASE, v.body));
export const setExpenseReceipt = (v: { id: string; file: File }) => {
  const body = new FormData();
  body.append("file", v.file);
  return api<ExpenseOut>(`${BASE}/${v.id}/receipt`, { method: "PUT", body, signal: AbortSignal.timeout(120_000) });
};
export const deleteExpense = (id: string) => del(`${BASE}/${id}`);
export const openExpenseReceipt = (id: string) => download(`${BASE}/${id}/receipt`);

export const saveRecurringExpense = (v: { id?: string; body: RecurringExpenseIn }) =>
  v.id ? put<RecurringExpenseOut>(`${BASE}/recurring/${v.id}`, v.body) : post<RecurringExpenseOut>(`${BASE}/recurring`, v.body);
/** Expenses it already added stay. */
export const deleteRecurringExpense = (id: string) => del(`${BASE}/recurring/${id}`);
