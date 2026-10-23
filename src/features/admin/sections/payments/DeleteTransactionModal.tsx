"use client";

import { Button, FormError, Icon, IconTile, Modal } from "@/components/ui";
import { useDeleteInvoice, useDeleteSubscription } from "@/utils/hooks/useBilling";

export type TransactionToDelete =
  | { kind: "sub"; id: string; label: string; client: string }
  | { kind: "inv"; id: string; label: string; client: string };

/** Super admins only: confirm before permanently removing a subscription or invoice. */
export function DeleteTransactionModal({
  target,
  onClose,
  onDeleted,
}: {
  target: TransactionToDelete;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const deleteSub = useDeleteSubscription();
  const deleteInv = useDeleteInvoice();
  const remove = target.kind === "sub" ? deleteSub : deleteInv;
  const noun = target.kind === "sub" ? "subscription" : "invoice";

  return (
    <Modal
      open
      onClose={onClose}
      titleId="dt-title"
      kicker={`DELETE ${noun.toUpperCase()}`}
      title={`Delete ${target.label}?`}
      width={480}
      media={
        <IconTile tone="red" size="lg">
          <Icon name="trash" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Keep {noun}</Button>
          <Button
            variant="danger-solid"
            disabled={remove.isPending}
            onClick={() => remove.mutate(target.id, { onSuccess: () => onDeleted(`${target.label} for ${target.client} was deleted.`) })}
          >
            {remove.isPending ? "Deleting…" : `Yes, delete ${noun}`}
          </Button>
        </>
      }
    >
      <p className="text-body">
        This removes the {noun} <span className="text-strong">{target.label}</span> for {target.client} from Transactions and their portal.
      </p>
      <div className="notice notice--warning u-strong" role="status">
        This can’t be undone.
      </div>
      <FormError error={remove.error} />
    </Modal>
  );
}
