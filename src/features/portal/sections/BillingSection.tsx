"use client";

import { useEffect } from "react";
import { Badge, Button, ErrorState, FormError, Loading, buttonClass } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { toCsvDataUrl } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact, formatPerInterval } from "@/utils/format/money";
import { useCheckoutInvoice, useCheckoutSubscription, useCustomerPortal, usePortalBilling } from "@/utils/hooks/useBilling";
import { usePortal } from "../state/PortalContext";

const INVOICE_TONES: Record<string, Tone> = { Paid: "green", Sent: "amber", Overdue: "red", Void: "slate", Refunded: "purple", Draft: "neutral" };
const isOpen = (status: string) => status === "Sent" || status === "Overdue";

/** Plan and invoices. Paying, starting the plan and updating the card all happen on Polar's checkout. */
export function BillingSection() {
  const { notify, readOnly } = usePortal();
  const billing = usePortalBilling();
  const payInvoice = useCheckoutInvoice();
  const startPlan = useCheckoutSubscription();
  const customerPortal = useCustomerPortal();
  const { refetch } = billing;

  // Back from Polar: /portal?tab=billing&paid=<invoice> or &subscribed=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    const subscribed = params.get("subscribed");
    if (!paid && !subscribed) return;
    window.history.replaceState(null, "", "/portal");
    void refetch();
    notify(subscribed ? "You’re subscribed. Thank you!" : "Payment received. Thank you!");
  }, [refetch, notify]);

  if (billing.isPending) return <Loading text="Loading billing…" />;
  if (billing.isError) return <ErrorState error={billing.error} onRetry={billing.refetch} />;
  const { subscription: sub, invoices, canManageCard } = billing.data;
  const checkoutError = payInvoice.error ?? startPlan.error ?? customerPortal.error;
  const redirecting = payInvoice.isPending || startPlan.isPending || customerPortal.isPending;

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="plan-card">
          <span className="kicker plan-card__kicker">YOUR PLAN</span>
          <span className="plan-card__name">{sub?.plan ?? "No plan yet"}</span>
          <span className="plan-card__desc">{sub ? `Status: ${sub.status}${sub.cancelAtPeriodEnd ? " · ends this period" : ""}` : "Your team will set up your plan."}</span>
          {sub && (
            <span className="plan-card__price">
              {formatPerInterval(sub.amountCents, sub.interval, sub.currency).replace(/\/(mo|yr|wk)$/, "")}{" "}
              <span className="plan-card__per">/ {sub.interval.toLowerCase()}</span>
            </span>
          )}
        </div>
        <div className="card billing-tile">
          <span className="stat-tile__label">Next payment</span>
          <span className="stat-tile__value">{sub?.nextBillingDate && sub.status !== "Paused" ? formatShort(sub.nextBillingDate) : "—"}</span>
          {sub?.status === "Awaiting payment" && !readOnly && (
            <Button variant="primary" size="sm" className="u-self-start" disabled={redirecting} onClick={() => startPlan.mutate()}>
              {startPlan.isPending ? "Opening checkout…" : "Start plan"}
            </Button>
          )}
        </div>
        <div className="card billing-tile">
          <span className="stat-tile__label">Payment method</span>
          <span className="text-strong">{canManageCard ? "Card on file" : "No card on file yet"}</span>
          {canManageCard && !readOnly && (
            <Button variant="outline" size="sm" className="u-self-start" disabled={redirecting} onClick={() => customerPortal.mutate()}>
              {customerPortal.isPending ? "Opening…" : "Update payment method"}
            </Button>
          )}
        </div>
      </div>
      {/* 502 payments_not_configured comes back with a message for the user. */}
      <FormError error={checkoutError} />

      <section className="card card--table">
        {invoices.length === 0 ? (
          <p className="table-empty">No invoices yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>For</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th className="data-table__actions">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((iv) => {
                const desc = iv.items.map((it) => it.description).join(", ") || iv.note || "Invoice";
                return (
                  <tr key={iv.id}>
                    <td className="data-table__code">{iv.number}</td>
                    <td>{desc}</td>
                    <td className="data-table__mono">{formatCentsExact(iv.totalCents, iv.currency)}</td>
                    <td>{iv.dueDate ? formatShort(iv.dueDate) : "On receipt"}</td>
                    <td>
                      <Badge tone={INVOICE_TONES[iv.status] ?? "neutral"}>{isOpen(iv.status) ? "Open" : iv.status}</Badge>
                    </td>
                    <td className="data-table__actions">
                      {isOpen(iv.status) && !readOnly && (
                        <Button variant="primary" size="sm" disabled={redirecting} onClick={() => payInvoice.mutate(iv.id)}>
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
                          ["Status", iv.status],
                        ])}
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
