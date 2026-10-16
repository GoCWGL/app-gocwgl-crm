"use client";

import { Badge, Button, SegmentedControl } from "@/components/ui";
import { INVOICE_TONES, PLAN_PRICE, SUBSCRIPTION_TONES, type Invoice, type Subscription } from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { invoiceTotal } from "../../lib/billing";
import { useAdmin } from "../../state/AdminContext";

type BillingTablesProps = {
  view: "subs" | "inv";
  onView: (view: "subs" | "inv") => void;
  message: string;
  onMessage: (message: string) => void;
  onNew: (kind: "invoice" | "sub") => void;
};

/** Subscriptions and invoices tables with their row actions. */
export function BillingTables({ view, onView, message, onMessage, onNew }: BillingTablesProps) {
  const { state, update } = useAdmin();
  const { subscriptions, invoices, contacts } = state;
  const contactOf = (id: number) => contacts.find((c) => c.id === id) ?? { name: "Removed client", email: "" };

  const setSub = (id: number, patch: Partial<Subscription>, msg: string) => {
    update((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    onMessage(msg);
  };
  const setInvoice = (no: string, patch: Partial<Invoice>, msg: string) => {
    update((s) => ({ invoices: s.invoices.map((x) => (x.no === no ? { ...x, ...patch } : x)) }));
    onMessage(msg);
  };

  return (
    <section className="card" aria-label="Billing">
      <div className="section-head">
        <SegmentedControl
          kind="tabs"
          variant="soft"
          label="Billing views"
          value={view}
          onChange={onView}
          options={[
            { value: "subs", label: "Subscriptions", count: subscriptions.length },
            { value: "inv", label: "Invoices", count: invoices.length },
          ]}
        />
        <div className="cluster cluster--8">
          <Button variant="accent" onClick={() => onNew("sub")}>
            + New subscription
          </Button>
          <Button variant="primary" onClick={() => onNew("invoice")}>
            + New invoice
          </Button>
        </div>
      </div>

      <div className="table-scroll">
        {view === "subs" ? (
          <table className="data-table data-table--plain billing-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Next billing</th>
                <th>Status</th>
                <th className="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const c = contactOf(sub.cid);
                const canPause = ["Active", "Paused", "Trial"].includes(sub.status);
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className="stack stack--2">
                        <span className="u-strong u-ink">{c.name}</span>
                        <span className="text-small">{c.email}</span>
                      </div>
                    </td>
                    <td>
                      {sub.plan} · per {sub.interval.toLowerCase()}
                    </td>
                    <td className="data-table__mono">{formatMoney(sub.amount || PLAN_PRICE)}</td>
                    <td>{sub.status === "Paused" ? "—" : sub.next}</td>
                    <td>
                      <Badge tone={SUBSCRIPTION_TONES[sub.status]} dot>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="data-table__actions">
                      {sub.status === "Awaiting payment" && (
                        <button
                          type="button"
                          className="row-action row-action--green"
                          onClick={() => {
                            update((s) => ({
                              subscriptions: s.subscriptions.map((x) => (x.id === sub.id ? { ...x, status: "Active" } : x)),
                              contacts: s.contacts.map((cc) => (cc.id === sub.cid ? { ...cc, stage: "paid", paidOn: cc.paidOn || TODAY_SHORT } : cc)),
                            }));
                            onMessage(`${c.name} is now an active subscriber.`);
                          }}
                        >
                          Mark paid
                        </button>
                      )}
                      {canPause && (
                        <button
                          type="button"
                          className="row-action"
                          onClick={() =>
                            setSub(
                              sub.id,
                              { status: sub.status === "Paused" ? "Active" : "Paused" },
                              `${c.name}’s subscription ${sub.status === "Paused" ? "resumed" : "paused"}.`,
                            )
                          }
                        >
                          {sub.status === "Paused" ? "Resume" : "Pause"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="row-action row-action--danger"
                        aria-label={`Cancel subscription for ${c.name}`}
                        onClick={() => {
                          update((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== sub.id) }));
                          onMessage(`${c.name}’s subscription was cancelled.`);
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table data-table--plain billing-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Total</th>
                <th>Due</th>
                <th>Status</th>
                <th className="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((iv) => {
                const c = contactOf(iv.cid);
                const isOpen = iv.status === "Sent" || iv.status === "Overdue";
                return (
                  <tr key={iv.no}>
                    <td>
                      <div className="stack stack--2">
                        <span className="data-table__code">{iv.no}</span>
                        <span className="text-small">{iv.items.map((it) => it.desc).filter(Boolean).join(", ") || "No items"}</span>
                      </div>
                    </td>
                    <td className="u-strong u-ink">{c.name}</td>
                    <td className="data-table__mono">{formatMoney(invoiceTotal(iv))}</td>
                    <td>{iv.due}</td>
                    <td>
                      <Badge tone={INVOICE_TONES[iv.status]} dot>
                        {iv.status}
                      </Badge>
                    </td>
                    <td className="data-table__actions">
                      {iv.status === "Draft" && (
                        <button type="button" className="row-action row-action--brand" onClick={() => setInvoice(iv.no, { status: "Sent" }, `${iv.no} sent to ${c.email}.`)}>
                          Send
                        </button>
                      )}
                      {isOpen && (
                        <button type="button" className="row-action row-action--cyan" onClick={() => onMessage(`Reminder sent to ${c.name} for ${iv.no}.`)}>
                          Send reminder
                        </button>
                      )}
                      {isOpen && (
                        <button type="button" className="row-action row-action--green" onClick={() => setInvoice(iv.no, { status: "Paid" }, `${iv.no} marked as paid.`)}>
                          Mark paid
                        </button>
                      )}
                      {iv.status !== "Paid" && iv.status !== "Void" && (
                        <button type="button" className="row-action row-action--danger" onClick={() => setInvoice(iv.no, { status: "Void" }, `${iv.no} was voided.`)}>
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {view === "subs" && subscriptions.length === 0 && <p className="table-empty">No subscriptions yet.</p>}
        {view === "inv" && invoices.length === 0 && <p className="table-empty">No invoices yet.</p>}
      </div>

      {message && (
        <div className="notice notice--success u-strong" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
