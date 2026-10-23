"use client";

import { useState } from "react";
import { Badge, Button, ErrorState, FormError, Loading, StatGrid, buttonClass } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { toCsvDataUrl } from "@/lib/utils";
import type { InvoiceOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useDownloadInvoicePdf, usePortalBilling } from "@/utils/hooks/useBilling";
import { PayConfirmModal } from "../components/PayConfirmModal";
import { SubscriptionCard } from "../components/SubscriptionCard";
import { usePortal } from "../state/PortalContext";

const INVOICE_TONES: Record<string, Tone> = { Paid: "green", Sent: "amber", Overdue: "red", Void: "slate", Refunded: "purple", Draft: "neutral" };
const isOpen = (status: string) => status === "Sent" || status === "Overdue";
/** Client-facing status: a sent invoice is waiting on payment. */
const STATUS_LABELS: Record<string, string> = { Sent: "Pending" };
/** When the transaction happened: paid, else sent, else created. */
const txDate = (iv: InvoiceOut) => iv.paidAt ?? iv.sentAt ?? iv.createdAt;
const describe = (iv: InvoiceOut) => iv.items.map((it) => it.description).join(", ") || iv.note || "Invoice";

/**
 * Transaction history. Clients pay each invoice through its Wise payment link (or by bank transfer), and the team marks it
 * paid once it arrives, so no card is ever saved here.
 */
export function BillingSection() {
  const { notify, readOnly } = usePortal();
  const billing = usePortalBilling();
  const pdf = useDownloadInvoicePdf();
  // The invoice being paid (confirmation first), or reported as paid under a different name.
  const [paying, setPaying] = useState<{ invoice: InvoiceOut; start: "confirm" | "other-name" } | null>(null);

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
      {billing.data.subscription && <SubscriptionCard sub={billing.data.subscription} readOnly={readOnly} onCancelled={notify} />}
      <StatGrid
        items={[
          { label: "Total paid", value: formatCentsExact(sum(paid), currency), tone: "green" },
          { label: "Outstanding", value: formatCentsExact(sum(open), currency), tone: open.length ? "amber" : "slate" },
          { label: "Transactions", value: String(transactions.length), tone: "cyan" },
        ]}
      />
      <p className="text-muted">
        Pay a pending invoice through Wise with Pay now, or by bank transfer. Your GoCWGL team marks it as paid once it arrives. No card is saved.
      </p>
      <FormError error={pdf.error} />

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
                    <Badge tone={INVOICE_TONES[iv.status] ?? "neutral"}>{STATUS_LABELS[iv.status] ?? iv.status}</Badge>
                    {isOpen(iv.status) && (
                      <span className="text-small tx-status-note">
                        Already paid? It can take up to 24 hours to verify your payment. Once it’s verified, this changes to Paid.
                      </span>
                    )}
                  </td>
                  <td className="data-table__actions">
                    {/* Builds and the hosting plan are paid with their Wise link; for anything else, the team sends payment details. */}
                    {isOpen(iv.status) && !readOnly && (
                      iv.paymentUrl ? (
                        <>
                          <Button variant="primary" size="sm" aria-haspopup="dialog" onClick={() => setPaying({ invoice: iv, start: "confirm" })}>
                            Pay now
                          </Button>
                          <Button variant="link" size="sm" onClick={() => setPaying({ invoice: iv, start: "other-name" })}>
                            Paid under a different name?
                          </Button>
                        </>
                      ) : (
                        <span className="text-small">Your team will send payment details</span>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pdf.isPending && pdf.variables?.id === iv.id}
                      onClick={() => pdf.mutate({ id: iv.id, number: iv.number })}
                    >
                      {pdf.isPending && pdf.variables?.id === iv.id ? "Preparing…" : "Download PDF"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {paying?.invoice.paymentUrl && (
        <PayConfirmModal
          target={{
            number: paying.invoice.number,
            totalCents: paying.invoice.totalCents,
            payUrl: paying.invoice.paymentUrl,
            what: describe(paying.invoice),
          }}
          start={paying.start}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}
