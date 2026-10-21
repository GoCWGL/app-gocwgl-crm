"use client";

import { useState } from "react";
import { BillingModal, type BillingKind } from "../../modals/BillingModal";
import { BillingTables } from "./BillingTables";

export function PaymentsSection() {
  const [billingKind, setBillingKind] = useState<BillingKind | null>(null);
  const [view, setView] = useState<"subs" | "inv">("subs");
  const [message, setMessage] = useState("");

  return (
    <div className="page-stack">
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
