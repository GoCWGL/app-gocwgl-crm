"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import type { MyClientOut, ReadyToInvoice } from "@/utils/api/models";
import { addDaysIso } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useCreateInvoice, useInvoicePreview, usePaymentMethods } from "@/utils/hooks/useVaInvoices";
import { clientLabel, todayKey } from "../../lib/time";
import { hoursLabel, kindLabel } from "./shared";

/** Bill one client for their billable, not-yet-invoiced time in a date range. */
export function CreateInvoiceModal({
  ready,
  clients,
  onClose,
  onCreated,
  onAddPayment,
}: {
  ready: ReadyToInvoice[];
  clients: MyClientOut[];
  onClose: () => void;
  onCreated: (id: string) => void;
  onAddPayment: () => void;
}) {
  const methods = usePaymentMethods();
  const create = useCreateInvoice();
  const today = todayKey();
  // Clients with time ready come first; any client of theirs can be picked.
  const options = [
    ...ready.map((r) => r.client),
    ...clients.filter((c) => !ready.some((r) => r.client.id === c.id)),
  ];
  const [clientId, setClientId] = useState(options[0]?.id ?? "");
  const readyFor = ready.find((r) => r.client.id === clientId);
  const [start, setStart] = useState(readyFor?.firstDay ?? addDaysIso(today, -6));
  const [end, setEnd] = useState(today);
  const [methodId, setMethodId] = useState("");
  const [due, setDue] = useState(addDaysIso(today, 7));
  const [note, setNote] = useState("");

  // Pre-pick the default payment details.
  const defaultMethod = methods.data?.find((m) => m.isDefault)?.id ?? "";
  // "none" = they chose no payment details.
  const method = methodId === "none" ? "" : methodId || defaultMethod;

  const valid = !!clientId && !!start && !!end && start <= end;
  const preview = useInvoicePreview(valid ? { contactId: clientId, periodStart: start, periodEnd: end } : null);
  const p = preview.data;

  const submit = (send: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid || !p?.entries) return;
    create.mutate(
      { contactId: clientId, periodStart: start, periodEnd: end, paymentMethodId: method || null, dueDate: due || null, note: note.trim(), send },
      { onSuccess: (inv) => onCreated(inv.id) },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit(false)}
      titleId="create-invoice"
      kicker="INVOICES"
      title="Create invoice"
      subtitle="Bills the client for your billable time in these dates that isn’t on an invoice yet."
      width={680}
      media={
        <IconTile brand size="lg">
          <Icon name="receipt" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline" disabled={!p?.entries || create.isPending}>
            Save draft
          </Button>
          <Button variant="primary" disabled={!p?.entries || create.isPending} onClick={() => submit(true)()}>
            <Icon name="send" size={13} /> {create.isPending ? "Creating…" : "Create & mark sent"}
          </Button>
        </>
      }
    >
      <div className="stack stack--14">
        <FormError error={create.error ?? preview.error} />
        <div className="form-grid">
          <Field label="Client" htmlFor="ci-client" required>
            <Select
              id="ci-client"
              value={clientId}
              placeholder={options.length ? undefined : "No clients yet"}
              options={options.map((c) => {
                const r = ready.find((x) => x.client.id === c.id);
                return { value: c.id, label: `${clientLabel(c)}${r ? ` · ${hoursLabel(r.seconds)} ready` : ""}` };
              })}
              onChange={(e) => {
                setClientId(e.target.value);
                // Start the period at this client's oldest unbilled day.
                const r = ready.find((x) => x.client.id === e.target.value);
                if (r) setStart(r.firstDay);
              }}
            />
          </Field>
          <Field label="Due date" htmlFor="ci-due">
            <Input id="ci-due" type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Period from" htmlFor="ci-start" required>
            <Input id="ci-start" type="date" max={end || today} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Period to" htmlFor="ci-end" required error={start > end && "The end is before the start."}>
            <Input id="ci-end" type="date" min={start} max={today} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <div className="ci-preview" aria-live="polite">
          {!valid ? (
            <span className="text-small">Pick a client and dates to see what goes on the invoice.</span>
          ) : preview.isPending ? (
            <span className="text-small">Adding up your time…</span>
          ) : p && p.entries ? (
            <>
              <table className="ci-lines">
                <thead>
                  <tr>
                    <th>Work</th>
                    <th className="is-num">Hours</th>
                    <th className="is-num">Rate</th>
                    <th className="is-num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {p.lines.map((l) => (
                    <tr key={`${l.category}-${l.rateCents}`}>
                      <td>{l.category}</td>
                      <td className="is-num">{hoursLabel(l.seconds)}</td>
                      <td className="is-num">{formatCentsExact(l.rateCents)}</td>
                      <td className="is-num">{formatCentsExact(l.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      Total · {p.entries} entr{p.entries === 1 ? "y" : "ies"}
                    </td>
                    <td className="is-num">{hoursLabel(p.seconds)}</td>
                    <td />
                    <td className="is-num">
                      <strong>{formatCentsExact(p.amountCents)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          ) : (
            <span className="ci-preview__empty">
              <Icon name="clock" size={14} /> No billable time for this client in these dates that isn’t invoiced already.
            </span>
          )}
        </div>

        <Field label="Payment details" htmlFor="ci-pay" hint={methods.data?.length ? "Printed on the invoice so the client knows how to pay you." : undefined}>
          {methods.data?.length ? (
            <Select
              id="ci-pay"
              value={method}
              options={[
                ...methods.data.map((m) => ({ value: m.id, label: `${m.label} · ${kindLabel(m.kind)}${m.isDefault ? " (default)" : ""}` })),
                { value: "", label: "None" },
              ]}
              onChange={(e) => setMethodId(e.target.value || "none")}
            />
          ) : (
            <div className="ci-nopay">
              <span className="text-small">You haven’t added payment details yet.</span>
              <Button size="sm" variant="outline" onClick={onAddPayment}>
                <Icon name="plus" size={12} /> Add payment details
              </Button>
            </div>
          )}
        </Field>
        <Field label="Note to the client" htmlFor="ci-note">
          <Textarea id="ci-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thank you! Payment within 7 days, please." />
        </Field>
      </div>
    </Modal>
  );
}
