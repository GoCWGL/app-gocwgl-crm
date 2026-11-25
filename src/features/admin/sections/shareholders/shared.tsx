"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button, ConfirmDialog, FormError, Modal } from "@/components/ui";
import { useDeleteRecord } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";

type Mutation = { isPending: boolean; error: unknown };

/** A pop-up form: title, fields, Cancel and Save. `error` is a check made here, before saving. */
export function FormModal({
  id,
  kicker,
  title,
  subtitle,
  width = 560,
  submitLabel = "Save",
  mutation,
  error,
  onSubmit,
  onClose,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  width?: number;
  submitLabel?: string;
  mutation: Mutation;
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open
      width={width}
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      titleId={id}
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : submitLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      <FormError error={mutation.error} />
    </Modal>
  );
}

/** A card with a heading, an optional button, and its content. */
export function SectionCard({ kicker, action, note, children }: { kicker: string; action?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="card stack stack--14" aria-label={kicker}>
      <div className="section-head">
        <span className="kicker">{kicker}</span>
        {action}
      </div>
      {children}
      {note && <span className="text-small">{note}</span>}
    </section>
  );
}

/** A table, or `empty` when there are no rows. */
export function SimpleTable({ head, empty, children }: { head: string[]; empty?: ReactNode; children: ReactNode[] }) {
  if (!children.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="table-scroll">
      <table className="data-table data-table--plain">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className={h === "Actions" ? "data-table__actions" : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Edit and Delete for a row; Delete asks first. */
export function RowActions({
  kind,
  id,
  name,
  onEdit,
  onDeleted,
}: {
  kind: Parameters<typeof useDeleteRecord>[0];
  id: string;
  /** What it's called in the confirmation and to screen readers. */
  name: string;
  onEdit?: () => void;
  onDeleted?: () => void;
}) {
  const { notify } = useAdmin();
  const remove = useDeleteRecord(kind);
  const [asking, setAsking] = useState(false);
  return (
    <>
      {onEdit && (
        <button type="button" className="row-action row-action--brand" aria-label={`Edit ${name}`} onClick={onEdit}>
          Edit
        </button>
      )}
      <button type="button" className="row-action row-action--danger" aria-label={`Delete ${name}`} onClick={() => setAsking(true)}>
        Delete
      </button>
      {asking && (
        <ConfirmDialog
          title={`Delete ${name}?`}
          icon="trash"
          confirmLabel="Delete"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => (setAsking(false), remove.reset())}
          onConfirm={() =>
            remove.mutate(id, {
              onSuccess: () => {
                setAsking(false);
                notify(`${name} was deleted.`);
                onDeleted?.();
              },
            })
          }
        >
          This can’t be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
