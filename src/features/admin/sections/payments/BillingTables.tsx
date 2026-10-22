"use client";

import { Badge, Button, FormError, LoadState, SegmentedControl } from "@/components/ui";
import { INVOICE_TONES, SUBSCRIPTION_TONES, type InvoiceStatus, type SubscriptionStatus } from "@/data/admin";
import { canWriteCrm } from "@/utils/auth/session";
import { formatLong, formatShort } from "@/utils/format/dates";
import { formatCentsExact, formatCents } from "@/utils/format/money";
import {
  useCancelSubscription,
  useDeleteInvoice,
  useDeleteSubscription,
  useInvoices,
  useMarkInvoicePaid,
  useSendInvoice,
  useSubscriptions,
  useUpdateSubscription,
  useVoidInvoice,
} from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";
import type { BillingKind } from "../../modals/BillingModal";

type BillingTablesProps = {
  view: "subs" | "inv";
  onView: (view: "subs" | "inv") => void;
  message: string;
  onMessage: (message: string) => void;
  onNew: (kind: BillingKind) => void;
};

/** Subscriptions and invoices tables with their row actions. */
export function BillingTables({ view, onView, message, onMessage, onNew }: BillingTablesProps) {
  const canWrite = canWriteCrm(useMe().data);
  const subsQuery = useSubscriptions();
  const invoicesQuery = useInvoices();
  const subscriptions = subsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const contactOf = (id: string) => {
    const c = contacts.find((x) => x.id === id) ?? archived.find((x) => x.id === id);
    return c ? { name: contactName(c), email: c.email } : { name: "Removed client", email: "" };
  };

  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();
  const cancelSub = useCancelSubscription();
  const send = useSendInvoice();
  const markPaid = useMarkInvoicePaid();
  const voidInv = useVoidInvoice();
  const deleteInv = useDeleteInvoice();
  const busy = updateSub.isPending || deleteSub.isPending || cancelSub.isPending;
  // Invoice actions lock only their own row, so one slow email never freezes the whole table.
  const invoiceActions = [send, markPaid, voidInv, deleteInv];
  const rowBusy = (id: string) => invoiceActions.some((m) => m.isPending && m.variables === id);
  const pendingLabel = (m: { isPending: boolean; variables?: string }, id: string, idle: string, working: string) =>
    m.isPending && m.variables === id ? working : idle;
  const error = updateSub.error ?? deleteSub.error ?? cancelSub.error ?? send.error ?? markPaid.error ?? voidInv.error ?? deleteInv.error;

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
        {canWrite && (
          <div className="cluster cluster--8">
            <Button variant="accent" onClick={() => onNew("sub")}>
              + New subscription
            </Button>
            <Button variant="outline" onClick={() => onNew("paid")}>
              + Record paid invoice
            </Button>
            <Button variant="primary" onClick={() => onNew("invoice")}>
              + New invoice
            </Button>
          </div>
        )}
      </div>
      <FormError error={error} />

      <LoadState query={view === "subs" ? subsQuery : invoicesQuery}>
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
                const c = contactOf(sub.contactId);
                const canPause = ["Active", "Paused", "Trial"].includes(sub.status);
                // Polar-managed subscriptions are changed in Polar; the API keeps their fields read-only.
                const editable = canWrite && !sub.managedByPolar;
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
                      {sub.managedByPolar && <span className="text-small"> · via Polar</span>}
                    </td>
                    <td className="data-table__mono">{formatCents(sub.amountCents, sub.currency)}</td>
                    <td>{sub.status === "Paused" || sub.status === "Canceled" || !sub.nextBillingDate ? "—" : formatLong(sub.nextBillingDate)}</td>
                    <td>
                      <Badge tone={SUBSCRIPTION_TONES[sub.status as SubscriptionStatus] ?? "neutral"} dot>
                        {sub.status}
                        {sub.cancelAtPeriodEnd && " · ends this period"}
                      </Badge>
                    </td>
                    <td className="data-table__actions">
                      {editable && sub.status === "Awaiting payment" && (
                        <button
                          type="button"
                          className="row-action row-action--green"
                          disabled={busy}
                          onClick={() =>
                            updateSub.mutate(
                              { id: sub.id, body: { status: "Active" } },
                              { onSuccess: () => onMessage(`${c.name} is now an active subscriber.`) },
                            )
                          }
                        >
                          Mark paid
                        </button>
                      )}
                      {editable && canPause && (
                        <button
                          type="button"
                          className="row-action"
                          disabled={busy}
                          onClick={() =>
                            updateSub.mutate(
                              { id: sub.id, body: { status: sub.status === "Paused" ? "Active" : "Paused" } },
                              { onSuccess: () => onMessage(`${c.name}’s subscription ${sub.status === "Paused" ? "resumed" : "paused"}.`) },
                            )
                          }
                        >
                          {sub.status === "Paused" ? "Resume" : "Pause"}
                        </button>
                      )}
                      {editable && sub.status !== "Canceled" && (
                        <button
                          type="button"
                          className="row-action row-action--danger"
                          aria-label={`Cancel subscription for ${c.name}`}
                          disabled={busy}
                          onClick={() =>
                            cancelSub.mutate(sub.id, {
                              onSuccess: () => onMessage(`${c.name}’s subscription was cancelled. No more invoices will be sent for it.`),
                            })
                          }
                        >
                          {cancelSub.isPending && cancelSub.variables === sub.id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                      {editable && sub.status === "Canceled" && (
                        <button
                          type="button"
                          className="row-action row-action--danger"
                          aria-label={`Delete cancelled subscription for ${c.name}`}
                          disabled={busy}
                          onClick={() => deleteSub.mutate(sub.id, { onSuccess: () => onMessage(`${c.name}’s cancelled subscription was removed.`) })}
                        >
                          Delete
                        </button>
                      )}
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
                const c = contactOf(iv.contactId);
                const isOpen = iv.status === "Sent" || iv.status === "Overdue";
                return (
                  <tr key={iv.id}>
                    <td>
                      <div className="stack stack--2">
                        <span className="data-table__code">{iv.number}</span>
                        <span className="text-small">{iv.items.map((it) => it.description).filter(Boolean).join(", ") || "No items"}</span>
                      </div>
                    </td>
                    <td className="u-strong u-ink">{c.name}</td>
                    <td className="data-table__mono">{formatCentsExact(iv.totalCents, iv.currency)}</td>
                    <td>{iv.dueDate ? formatShort(iv.dueDate) : "—"}</td>
                    <td>
                      <div className="stack stack--2">
                        <Badge tone={INVOICE_TONES[iv.status as InvoiceStatus] ?? "neutral"} dot>
                          {iv.status}
                        </Badge>
                        {isOpen && iv.lastEmailedAt && (
                          <span className="text-small">
                            {iv.remindersSent ? `${iv.remindersSent} follow-up${iv.remindersSent === 1 ? "" : "s"} · ` : ""}
                            emailed {formatShort(iv.lastEmailedAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="data-table__actions">
                      {canWrite && iv.status === "Draft" && (
                        <button
                          type="button"
                          className="row-action row-action--brand"
                          disabled={rowBusy(iv.id)}
                          onClick={() => send.mutate(iv.id, { onSuccess: () => onMessage(`${iv.number} sent to ${c.email}.`) })}
                        >
                          {pendingLabel(send, iv.id, "Send", "Sending…")}
                        </button>
                      )}
                      {canWrite && isOpen && (
                        <button
                          type="button"
                          className="row-action row-action--brand"
                          aria-label={`Email ${iv.number} to ${c.name} again`}
                          disabled={rowBusy(iv.id)}
                          onClick={() => send.mutate(iv.id, { onSuccess: () => onMessage(`${iv.number} emailed to ${c.email} again. The next follow-up is in 2 days.`) })}
                        >
                          {pendingLabel(send, iv.id, "Resend", "Sending…")}
                        </button>
                      )}
                      {canWrite && isOpen && (
                        <button
                          type="button"
                          className="row-action row-action--green"
                          disabled={rowBusy(iv.id)}
                          onClick={() => markPaid.mutate(iv.id, { onSuccess: () => onMessage(`${iv.number} marked as paid.`) })}
                        >
                          {pendingLabel(markPaid, iv.id, "Mark paid", "Saving…")}
                        </button>
                      )}
                      {canWrite && (iv.status === "Sent" || iv.status === "Overdue") && (
                        <button
                          type="button"
                          className="row-action row-action--danger"
                          disabled={rowBusy(iv.id)}
                          onClick={() => voidInv.mutate(iv.id, { onSuccess: () => onMessage(`${iv.number} was voided.`) })}
                        >
                          {pendingLabel(voidInv, iv.id, "Void", "Voiding…")}
                        </button>
                      )}
                      {canWrite && iv.status === "Draft" && (
                        <button
                          type="button"
                          className="row-action row-action--danger"
                          disabled={rowBusy(iv.id)}
                          onClick={() => deleteInv.mutate(iv.id, { onSuccess: () => onMessage(`${iv.number} was deleted.`) })}
                        >
                          Delete
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
      </LoadState>

      {message && (
        <div className="notice notice--success u-strong" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
