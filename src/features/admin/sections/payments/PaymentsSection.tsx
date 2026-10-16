"use client";

import { useState } from "react";
import { PAYMENT_PROVIDERS, PLAN_PRICE } from "@/data/admin";
import { formatMoney } from "@/lib/utils";
import { providerName } from "../../lib/billing";
import { BillingModal } from "../../modals/BillingModal";
import { useAdmin } from "../../state/AdminContext";
import { BillingTables } from "./BillingTables";
import { PaymentMethods } from "./PaymentMethods";

export function PaymentsSection() {
  const { state } = useAdmin();
  const [billingKind, setBillingKind] = useState<"invoice" | "sub" | null>(null);
  const [view, setView] = useState<"subs" | "inv">("subs");
  const [message, setMessage] = useState("");

  const paid = state.contacts.filter((c) => c.stage === "paid").length;
  const connected = PAYMENT_PROVIDERS.filter((p) => state.paymentConnections[p.id]?.connected);
  const defaultProvider = connected.find((p) => p.id === state.paymentDefault) ?? connected[0];

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="plan-card plan-card--admin">
          <span className="plan-card__label">Your subscription plan</span>
          <span className="plan-card__name">[Your Plan Name]</span>
          <span className="plan-card__desc">{formatMoney(PLAN_PRICE)} / month per subscriber</span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">Active clients</span>
          <span className="metric metric--lg">{paid}</span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">MRR</span>
          <span className="metric metric--lg">{formatMoney(paid * PLAN_PRICE)}</span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">Payment processor</span>
          <span className="billing-tile__name">{defaultProvider ? providerName(defaultProvider, state.paymentConnections) : "Not connected"}</span>
          <span className="text-small">{connected.length} payment methods connected</span>
        </div>
      </div>

      <PaymentMethods />

      <BillingTables
        view={view}
        onView={setView}
        message={message}
        onMessage={setMessage}
        onNew={(kind) => {
          setBillingKind(kind);
          setMessage("");
        }}
      />

      {billingKind && (
        <BillingModal
          kind={billingKind}
          onKind={setBillingKind}
          onClose={() => setBillingKind(null)}
          onCreated={(createdView, text) => {
            setBillingKind(null);
            setView(createdView);
            setMessage(text);
          }}
        />
      )}
    </div>
  );
}
