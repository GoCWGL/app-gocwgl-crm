"use client";

import { useState } from "react";
import { BillingModal, type BillingKind } from "../../modals/BillingModal";
import { useAdmin } from "../../state/AdminContext";
import { BillingTables, type BillingView } from "./BillingTables";

const VIEWS: BillingView[] = ["subs", "inv", "opts"];

/** Finance › Billing: subscriptions, invoices and products, one tab each. */
export function PaymentsSection() {
  const { state, update } = useAdmin();
  const [billingKind, setBillingKind] = useState<BillingKind | null>(null);
  const view = state.billingView;
  const setView = (billingView: BillingView) => update({ billingView });
  const [message, setMessage] = useState("");

  return (
    <div className="page-stack">
      <BillingTables
        views={VIEWS}
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
