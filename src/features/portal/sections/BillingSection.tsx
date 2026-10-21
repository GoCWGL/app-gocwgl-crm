"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, ErrorState, FormError, Loading, StatGrid, buttonClass } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { toCsvDataUrl } from "@/lib/utils";
import type { InvoiceOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useCheckoutInvoice, usePortalBilling } from "@/utils/hooks/useBilling";
import { usePortal } from "../state/PortalContext";

const INVOICE_TONES: Record<string, Tone> = { Paid: "green", Sent: "amber", Overdue: "red", Void: "slate", Refunded: "purple", Draft: "neutral" };
const isOpen = (status: string) => status === "Sent" || status === "Overdue";
/** Client-facing status: a sent invoice is waiting on payment. */
const STATUS_LABELS: Record<string, string> = { Sent: "Pending" };
const CONFIRM_POLL_MS = 2_000;
const CONFIRM_TIMEOUT_MS = 60_000;
/** When the transaction happened: paid, else sent, else created. */
const txDate = (iv: InvoiceOut) => iv.paidAt ?? iv.sentAt ?? iv.createdAt;
const describe = (iv: InvoiceOut) => iv.items.map((it) => it.description).join(", ") || iv.note || "Invoice";

/**
 * Transaction history. Clients pay by personal transfer (the team marks it paid) or a one-time
 * Polar checkout per invoice, so no card is ever saved here.
 */
export function BillingSection() {
  const { notify, readOnly } = usePortal();
  const billing = usePortalBilling();
  const payInvoice = useCheckoutInvoice();
  const { refetch } = billing;
  // Back from Polar: /portal?tab=billing&paid=<invoice number>. Polar's webhook marks the invoice
  // paid, often a few seconds after the redirect, so keep checking until it shows Paid.
  const [confirming, setConfirming] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("paid") ?? ""),
  );
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("paid")) window.history.replaceState(null, "", "/portal");
  }, []);

  // The portal store (and so notify) changes on every state update; don't restart the polling for that.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    if (!confirming) return;
    const startedAt = Date.now();
    let done = false;
    const finish = (message: string) => {
      done = true;
      window.clearInterval(timer);
      setConfirming("");
      notifyRef.current(message);
    };
    const check = async () => {
      const { data } = await refetch();
      if (done) return;
      if (data?.invoices.some((iv) => iv.number === confirming && iv.status === "Paid")) finish("Payment received. Thank you!");
      else if (Date.now() - startedAt > CONFIRM_TIMEOUT_MS) finish("Your payment is still being confirmed. It will show as Paid here shortly.");
    };
    const timer = window.setInterval(check, CONFIRM_POLL_MS);
    void check();
    return () => {
      done = true;
      window.clearInterval(timer);
    };
  }, [confirming, refetch]);

  if (billing.isPending) return <Loading text="Loading transactions…" />;
  if (billing.isError) return <ErrorState error={billing.error} onRetry={billing.refetch} />;
  const transactions = [...billing.data.invoices].sort((a, b) => txDate(b).localeCompare(txDate(a)));
  const currency = transactions[0]?.currency ?? "usd";
  const paid = transactions.filter((iv) => iv.status === "Paid");
  const open = transactions.filter((iv) => isOpen(iv.status));
  const sum = (list: InvoiceOut[]) => list.reduce((n, iv) => n + iv.totalCents, 0);

  const csv = toCsvDataUrl([
    ["Date", "Invoice", "For", "Amount", "Status"],
    ...transactions.map((iv) => [txDate(iv).slice(0, 10), iv.number, describe(iv), formatCentsExact(iv.totalCents, iv.currency), STATUS_LABELS[iv.status] ?? iv.status]),
  ]);

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Total paid", value: formatCentsExact(sum(paid), currency), tone: "green" },
          { label: "Outstanding", value: formatCentsExact(sum(open), currency), tone: open.length ? "amber" : "slate" },
          { label: "Transactions", value: String(transactions.length), tone: "cyan" },
        ]}
      />
      <p className="text-muted">
        Pay a pending invoice online with Pay now, or by bank transfer. Your GoCWGL team marks transfers as paid once they arrive. No card is saved.
      </p>
      {confirming && (
        <div className="inset inset--brand text-small" role="status">
          Confirming your payment for {confirming} with Polar. This usually takes a few seconds…
        </div>
      )}
      {/* 502 payments_not_configured comes back with a message for the user. */}
      <FormError error={payInvoice.error} />

      <section className="card card--table">
        {transactions.length === 0 ? (
          <p className="table-empty">No transactions yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>For</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="data-table__actions">
                  <a className={buttonClass({ variant: "outline", size: "sm" })} download="transactions.csv" href={csv}>
                    Export CSV
                  </a>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((iv) => (
                <tr key={iv.id}>
                  <td>{formatShort(txDate(iv))}</td>
                  <td className="data-table__code">{iv.number}</td>
                  <td>{describe(iv)}</td>
                  <td className="data-table__mono">{formatCentsExact(iv.totalCents, iv.currency)}</td>
                  <td>
                    {confirming === iv.number && isOpen(iv.status) ? (
                      <Badge tone="cyan">Confirming…</Badge>
                    ) : (
                      <Badge tone={INVOICE_TONES[iv.status] ?? "neutral"}>{STATUS_LABELS[iv.status] ?? iv.status}</Badge>
                    )}
                  </td>
                  <td className="data-table__actions">
                    {isOpen(iv.status) && !readOnly && (
                      <Button variant="primary" size="sm" disabled={payInvoice.isPending} onClick={() => payInvoice.mutate(iv.id)}>
                        {payInvoice.isPending && payInvoice.variables === iv.id ? "Opening checkout…" : "Pay now"}
                      </Button>
                    )}
                    <a
                      className={buttonClass({ variant: "outline", size: "sm" })}
                      download={`${iv.number}.csv`}
                      href={toCsvDataUrl([
                        ["Invoice", iv.number],
                        ...iv.items.map((it) => [it.description, `${it.quantity} × ${formatCentsExact(it.unitPriceCents, iv.currency)}`]),
                        ["Total", formatCentsExact(iv.totalCents, iv.currency)],
                        ["Due", iv.dueDate ?? "On receipt"],
                        ["Paid", iv.paidAt?.slice(0, 10) ?? "—"],
                        ["Status", STATUS_LABELS[iv.status] ?? iv.status],
                      ])}
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
