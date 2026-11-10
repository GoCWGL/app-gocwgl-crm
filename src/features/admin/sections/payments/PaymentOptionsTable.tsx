"use client";

import { useState } from "react";
import { Badge, FormError } from "@/components/ui";
import { paymentMethodLabel } from "@/data/admin";
import type { PaymentOptionOut } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { useDeletePaymentOption } from "@/utils/hooks/useBilling";

/** Products: names and prices, optionally with a payment link. Picked in the New invoice / New subscription form. */
export function PaymentOptionsTable({
  options,
  canWrite,
  onEdit,
  onMessage,
}: {
  options: PaymentOptionOut[];
  canWrite: boolean;
  onEdit: (option: PaymentOptionOut) => void;
  onMessage: (message: string) => void;
}) {
  const remove = useDeletePaymentOption();
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <>
      <FormError error={remove.error} />
      <table className="data-table data-table--plain billing-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Billed</th>
            <th>Paid with</th>
            <th className="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={o.id}>
              <td className="u-strong u-ink">{o.name}</td>
              <td className="data-table__mono">{formatCentsExact(o.amountCents)}</td>
              <td>
                <Badge tone={o.interval ? "purple" : "neutral"}>{o.interval ? `Every ${o.interval.toLowerCase()}` : "One-time"}</Badge>
              </td>
              <td>
                {o.paymentUrl ? (
                  <div className="stack stack--2">
                    <span>{paymentMethodLabel(o.method)}</span>
                    <a className="text-small payment-option__link" href={o.paymentUrl} target="_blank" rel="noreferrer noopener">
                      {o.paymentUrl.replace(/^https:\/\//, "")}
                    </a>
                  </div>
                ) : (
                  <span className="text-small text-muted">Payment details you send</span>
                )}
              </td>
              <td className="data-table__actions">
                {canWrite && (
                  <button type="button" className="row-action row-action--brand" onClick={() => onEdit(o)}>
                    Edit
                  </button>
                )}
                {canWrite &&
                  (confirming === o.id ? (
                    <button
                      type="button"
                      className="row-action row-action--danger"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(o.id, {
                          onSuccess: () => {
                            setConfirming(null);
                            onMessage(`${o.name} was removed from your products. Invoices already sent aren’t changed.`);
                          },
                        })
                      }
                    >
                      {remove.isPending ? "Removing…" : "Confirm remove"}
                    </button>
                  ) : (
                    <button type="button" className="row-action row-action--danger" aria-label={`Remove ${o.name}`} onClick={() => setConfirming(o.id)}>
                      Remove
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
