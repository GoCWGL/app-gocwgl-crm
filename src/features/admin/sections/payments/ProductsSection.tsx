"use client";

import { useState } from "react";
import { Button, LoadState } from "@/components/ui";
import type { PaymentOptionOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { usePaymentOptions } from "@/utils/hooks/useBilling";
import { useMe } from "@/utils/hooks/useUsers";
import { PaymentOptionModal } from "./PaymentOptionModal";
import { PaymentOptionsTable } from "./PaymentOptionsTable";

/**
 * Finance › Products: what GoCWGL sells, with each price and payment link. Picked when billing a client (one-time
 * invoices and subscriptions). Kept apart from Billing & invoices, which is only for actual transactions.
 */
export function ProductsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = usePaymentOptions();
  const options = query.data ?? [];
  // undefined: closed; null: adding a new one.
  const [editing, setEditing] = useState<PaymentOptionOut | null | undefined>(undefined);
  const [message, setMessage] = useState("");

  return (
    <div className="page-stack">
      <section className="card card--flat board" aria-label="Products">
        <div className="board__bar">
          <span className="text-small">
            {options.length} product{options.length === 1 ? "" : "s"} · prices and payment links you pick when billing a client
          </span>
          <div className="board__actions">
            {canWrite && (
              <Button variant="primary" onClick={() => setEditing(null)}>
                + Add product
              </Button>
            )}
          </div>
        </div>
        <LoadState query={query} loadingText="Loading products…">
          <div className="table-scroll">
            <PaymentOptionsTable options={options} canWrite={canWrite} onEdit={setEditing} onMessage={setMessage} />
            {options.length === 0 && <p className="table-empty">No products yet. Add what you sell and its price, then pick it when you bill a client.</p>}
          </div>
        </LoadState>
      </section>

      {message && (
        <div className="notice notice--success u-strong" role="status">
          {message}
        </div>
      )}

      {editing !== undefined && (
        <PaymentOptionModal
          option={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={(text) => {
            setEditing(undefined);
            setMessage(text);
          }}
        />
      )}
    </div>
  );
}
