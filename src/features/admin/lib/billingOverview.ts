import type { InvoiceOut, SubscriptionOut } from "@/utils/api/models";
import { addDaysIso, isoDateIn } from "@/utils/format/dates";

/** The day something happened, in the business time zone ("2026-11-24"). */
export const dayOf = (at: string) => isoDateIn(new Date(at));

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const sum = (list: InvoiceOut[]) => list.reduce((t, i) => t + i.totalCents, 0);

export const isPaid = (i: InvoiceOut) => i.status === "Paid" && !!i.paidAt;
/** Sent and waiting for the money. */
export const isPending = (i: InvoiceOut) => i.status === "Sent" || i.status === "Overdue";
/** Pending and past its due date (the server also marks these Overdue, a little later). */
export const isOverdue = (i: InvoiceOut, today: string) => isPending(i) && (i.status === "Overdue" || (!!i.dueDate && i.dueDate < today));
/** The client says they paid; the team hasn't confirmed it. Still pending. */
export const isToConfirm = (i: InvoiceOut) => isPending(i) && !!i.clientPaidAt;
/** The day it was issued: when sent, else when made (a payment recorded by hand is never sent). */
const issuedOn = (i: InvoiceOut) => dayOf(i.sentAt ?? i.createdAt);

export const monthlyCents = (s: Pick<SubscriptionOut, "amountCents" | "interval">) => {
  const factor: Record<string, number> = { Week: 52 / 12, Month: 1, Quarter: 1 / 3, Year: 1 / 12 };
  return Math.round(s.amountCents * (factor[s.interval] ?? 1));
};

export type Source = "va" | "sub" | "other";
const sourceOf = (i: InvoiceOut): Source => (i.vaBilling?.length ? "va" : i.subscriptionId ? "sub" : "other");

export type Group = { key: string; cents: number; count: number };
function groupBy(list: InvoiceOut[], key: (i: InvoiceOut) => string): Group[] {
  const out = new Map<string, Group>();
  for (const i of list) {
    const k = key(i);
    const g = out.get(k) ?? { key: k, cents: 0, count: 0 };
    g.cents += i.totalCents;
    g.count += 1;
    out.set(k, g);
  }
  return [...out.values()].sort((a, b) => b.cents - a.cents);
}

/** The last 12 months, oldest first ("2026-11"). */
function lastMonths(today: string): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: 12 }, (_, k) => new Date(Date.UTC(y, m - 12 + k, 1)).toISOString().slice(0, 7));
}

/** Everything on Income & Billing › Overview. `year` limits what was paid; what's pending is always as of now. */
export function billingOverview(invoices: InvoiceOut[], subscriptions: SubscriptionOut[], today: string, year: number | null) {
  const allPaid = invoices.filter(isPaid).map((i) => ({ i, day: dayOf(i.paidAt!) }));
  const paid = allPaid.filter((p) => year === null || p.day.startsWith(`${year}-`)).map((p) => p.i);
  const pending = invoices.filter(isPending);
  const overdue = pending.filter((i) => isOverdue(i, today));
  const toConfirm = pending.filter(isToConfirm);
  const drafts = invoices.filter((i) => i.status === "Draft");
  const refunded = invoices.filter((i) => i.status === "Refunded");
  const voided = invoices.filter((i) => i.status === "Void");

  // Each once, even when it is both.
  const attention = pending.filter((i) => isToConfirm(i) || isOverdue(i, today)).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));

  const months = lastMonths(today);
  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number);
  const lastMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const paidIn = (month: string) => sum(allPaid.filter((p) => p.day.startsWith(month)).map((p) => p.i));
  const issued = invoices.filter((i) => isPaid(i) || isPending(i)).map((i) => ({ i, month: issuedOn(i).slice(0, 7) }));

  const late = (i: InvoiceOut) => (i.dueDate ? daysBetween(i.dueDate, today) : 0);
  const bucket = (test: (days: number) => boolean) => {
    const list = pending.filter((i) => test(late(i)));
    return { cents: sum(list), count: list.length };
  };

  // Only invoices that were sent: a payment recorded by hand has no wait to measure.
  const waits = paid.filter((i) => i.sentAt).map((i) => Math.max(0, daysBetween(dayOf(i.sentAt!), dayOf(i.paidAt!))));
  const active = subscriptions.filter((s) => s.status === "Active");
  const soon = addDaysIso(today, 30);

  return {
    years: [...new Set([...allPaid.map((p) => Number(p.day.slice(0, 4))), Number(today.slice(0, 4))])].sort((a, b) => b - a),
    paid: { cents: sum(paid), count: paid.length },
    pending: { cents: sum(pending), count: pending.length },
    overdue: { cents: sum(overdue), count: overdue.length },
    toConfirm: { cents: sum(toConfirm), count: toConfirm.length },
    drafts: { cents: sum(drafts), count: drafts.length },
    refunded: { cents: sum(refunded), count: refunded.length },
    voided: { cents: sum(voided), count: voided.length },
    thisMonth: paidIn(thisMonth),
    lastMonth: paidIn(lastMonth),
    average: paid.length ? Math.round(sum(paid) / paid.length) : null,
    daysToPay: waits.length ? Math.round(waits.reduce((t, n) => t + n, 0) / waits.length) : null,
    months: months.map((month) => ({ month, billed: sum(issued.filter((x) => x.month === month).map((x) => x.i)), paid: paidIn(month) })),
    aging: [
      { label: "Not due yet", ...bucket((d) => d <= 0) },
      { label: "1–30 days late", ...bucket((d) => d >= 1 && d <= 30) },
      { label: "31–60 days late", ...bucket((d) => d >= 31 && d <= 60) },
      { label: "More than 60 days late", ...bucket((d) => d > 60) },
    ],
    sources: groupBy(paid, sourceOf),
    methods: groupBy(paid, (i) => i.paymentMethod ?? ""),
    clients: groupBy(paid, (i) => i.contactId).slice(0, 8),
    attention: attention.slice(0, 8),
    attentionCount: attention.length,
    recent: [...allPaid].sort((a, b) => b.i.paidAt!.localeCompare(a.i.paidAt!)).slice(0, 8).map((p) => p.i),
    mrr: active.reduce((t, s) => t + monthlyCents(s), 0),
    activeSubs: active.length,
    awaitingSubs: subscriptions.filter((s) => s.status === "Awaiting payment").length,
    // Renewals that will be billed: active, dated, and not ending.
    renewals: active
      .filter((s) => s.nextBillingDate && s.nextBillingDate >= today && s.nextBillingDate <= soon && !s.cancelAtPeriodEnd)
      .sort((a, b) => a.nextBillingDate!.localeCompare(b.nextBillingDate!)),
  };
}
