"use client";

import { useState } from "react";
import { PAYMENT_PROVIDERS } from "@/data/admin";
import { isStaffAdmin } from "@/utils/auth/session";
import { formatCents, formatPerInterval } from "@/utils/format/money";
import { usePaymentConnections, useSubscriptions } from "@/utils/hooks/useBilling";
import { useDashboard } from "@/utils/hooks/useReporting";
import { useSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { connectionOf, providerName } from "../../lib/billing";
import { BillingModal } from "../../modals/BillingModal";
import { BillingTables } from "./BillingTables";
import { PaymentMethods } from "./PaymentMethods";

export function PaymentsSection() {
  const canAdmin = isStaffAdmin(useMe().data);
  const [billingKind, setBillingKind] = useState<"invoice" | "sub" | null>(null);
  const [view, setView] = useState<"subs" | "inv">("subs");
  const [message, setMessage] = useState("");
  const dashboard = useDashboard(30).data;
  const subs = useSubscriptions().data ?? [];
  // Payment keys are owner/admin only; other roles just don't see the processor.
  const connections = usePaymentConnections(canAdmin).data;
  const settings = useSettings().data;

  const connected = PAYMENT_PROVIDERS.filter((p) => connectionOf(connections, p.id));
  const defaultProvider = connected.find((p) => p.id === settings?.defaultPaymentProvider) ?? connected[0];
  // The most common plan across active subscriptions (display only).
  const active = subs.filter((s) => s.status === "Active");
  const plan = active[0] ?? subs[0];

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="plan-card plan-card--admin">
          <span className="plan-card__label">Your subscription plan</span>
          <span className="plan-card__name">{plan?.plan ?? "No plan yet"}</span>
          <span className="plan-card__desc">
            {plan ? `${formatPerInterval(plan.amountCents, plan.interval, plan.currency)} per subscriber` : "Create a subscription to set the price"}
          </span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">Active subscriptions</span>
          <span className="metric metric--lg">{dashboard?.active_subscriptions ?? active.length}</span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">MRR</span>
          <span className="metric metric--lg">{dashboard ? formatCents(dashboard.mrr_cents) : "—"}</span>
        </div>
        <div className="card billing-tile">
          <span className="kpi-card__label">Payment processor</span>
          <span className="billing-tile__name">
            {!canAdmin ? "Owner / admin only" : defaultProvider ? providerName(defaultProvider, connections) : "Not connected"}
          </span>
          {canAdmin && <span className="text-small">{connected.length} payment methods connected</span>}
        </div>
      </div>

      {canAdmin && <PaymentMethods />}

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
