"use client";

import { Badge, Button, buttonClass } from "@/components/ui";
import { PAYMENT_CARD, PLAN_PRICE } from "@/data/portal";
import { formatMoney, toCsvDataUrl } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

export function BillingSection() {
  const { state, update, notify } = usePortal();

  const payInvoice = (no: string) =>
    update((s) => ({
      invoices: s.invoices.map((x) => (x.no === no ? { ...x, status: "Paid" } : x)),
      toast: `${no} paid with ${PAYMENT_CARD}. Thank you!`,
    }));

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="plan-card">
          <span className="kicker plan-card__kicker">YOUR PLAN</span>
          <span className="plan-card__name">Revenue Engine System</span>
          <span className="plan-card__desc">Setup fee + daily reporting retainer</span>
          <span className="plan-card__price">
            {formatMoney(PLAN_PRICE)} <span className="plan-card__per">/ month</span>
          </span>
        </div>
        <div className="card billing-tile">
          <span className="stat-tile__label">Next payment</span>
          <span className="stat-tile__value">Nov 6</span>
          <span className="text-small">Auto-charged to {PAYMENT_CARD}</span>
        </div>
        <div className="card billing-tile">
          <span className="stat-tile__label">Payment method</span>
          <span className="text-strong">{PAYMENT_CARD}</span>
          <Button
            variant="outline"
            size="sm"
            className="u-self-start"
            onClick={() => notify(`A secure link to update your card was sent to ${state.profile.email}.`)}
          >
            Update payment method
          </Button>
        </div>
      </div>

      <section className="card card--table">
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
            {state.invoices.map((iv) => (
              <tr key={iv.no}>
                <td className="data-table__code">{iv.no}</td>
                <td>{iv.desc}</td>
                <td className="data-table__mono">{formatMoney(iv.amount)}</td>
                <td>{iv.due}</td>
                <td>
                  <Badge tone={iv.status === "Paid" ? "green" : "amber"}>{iv.status}</Badge>
                </td>
                <td className="data-table__actions">
                  {iv.status === "Open" && (
                    <Button variant="primary" size="sm" onClick={() => payInvoice(iv.no)}>
                      Pay now
                    </Button>
                  )}
                  <a
                    className={buttonClass({ variant: "outline", size: "sm" })}
                    download={`${iv.no}.csv`}
                    href={toCsvDataUrl([
                      ["Invoice", iv.no],
                      ["Billed to", state.profile.business],
                      ["Description", iv.desc],
                      ["Amount", iv.amount],
                      ["Due", iv.due],
                      ["Status", iv.status],
                    ])}
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
