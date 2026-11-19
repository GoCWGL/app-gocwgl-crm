"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Icon, Input, LoadState } from "@/components/ui";
import { hoursLabel } from "@/features/va/sections/invoices/shared";
import { avatarTone } from "@/lib/tones";
import type { VaHoursClient, VaHoursRow } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useVaHours } from "@/utils/hooks/useVaInvoices";
import { VaFeeInvoiceModal } from "./VaFeeInvoiceModal";

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** The month the invoices on the 1st cover. */
const lastMonth = () => {
  const d = new Date();
  return ym(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};
const monthLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** One client and the VAs who worked for them that month (none: listed at the end). */
type ClientEntry = { client: VaHoursClient; rows: VaHoursRow[] };

const owed = (e: ClientEntry) => e.rows.reduce((n, r) => n + (r.invoice ? 0 : r.gocwglTotalCents), 0);

/** Every client: the ones with VAs first (most to invoice first), then current clients without a VA. */
function clientList(rows: VaHoursRow[], noVas: VaHoursClient[]): ClientEntry[] {
  const by = new Map<string, ClientEntry>();
  for (const r of rows) {
    const e = by.get(r.client.id) ?? { client: r.client, rows: [] };
    e.rows.push(r);
    by.set(r.client.id, e);
  }
  const label = (e: ClientEntry) => e.client.name || e.client.company;
  const withVas = [...by.values()].sort((a, b) => owed(b) - owed(a) || label(a).localeCompare(label(b)));
  const without = noVas.map((client) => ({ client, rows: [] })).sort((a, b) => label(a).localeCompare(label(b)));
  return [...withVas, ...without];
}

/**
 * Finance › Billing & invoices › Client invoices: the monthly maintenance fee run. For the month just ended (or any
 * month picked), every client, the ones with VAs first: who they are (name, business, email), then each of their VAs
 * with the plan and hours, hours × rate, the $1/hr training fee taken off the VA's invoice, and what GoCWGL invoices
 * (maintenance fee + training fee), with a Send button per VA and one for all of the client's VAs. Current clients
 * without a VA are listed at the end. Nothing is sent automatically.
 */
export function MaintenanceBillingBoard({ onMessage }: { onMessage: (message: string) => void }) {
  const [month, setMonth] = useState(lastMonth);
  const query = useVaHours(month);
  const r = query.data;
  const rows = r?.rows ?? [];
  const clients = clientList(rows, r?.clientsWithoutVas ?? []);
  // Sending: one VA's invoice, or all of a client's VAs together.
  const [sending, setSending] = useState<{ client: VaHoursClient; rows: VaHoursRow[] } | null>(null);
  const open = rows.filter((x) => !x.invoice && x.gocwglTotalCents > 0);
  const withVas = clients.filter((c) => c.rows.length).length;

  return (
    <section className="mb" aria-labelledby="mb-title">
      <header className="mb__head">
        <div className="stack stack--4">
          <span className="mb__kicker">Monthly maintenance fees</span>
          <h2 id="mb-title" className="mb__title">
            {r ? monthLabel(r.month) : "…"}
          </h2>
          <span className="text-small">
            Worked out from every VA’s hours for the month. Review each client and their VAs, then send the invoice
            {r ? ` (due out on ${formatLong(r.invoiceOn)})` : ""}.
          </span>
        </div>
        <label className="mb__month">
          <span>Month</span>
          <Input type="month" size="sm" value={month} max={ym(new Date())} onChange={(e) => setMonth(e.target.value)} aria-label="Month billed" />
        </label>
      </header>

      <div className="mb__stats">
        <Stat label="Clients" value={String(clients.length)} note={`${withVas} with VAs · ${clients.length - withVas} without`} />
        <Stat label="VA hours logged" value={hoursLabel(r?.totals.seconds ?? 0)} note={`${formatCentsExact(r?.totals.valueCents ?? 0)} at the VAs’ rates`} />
        <Stat label="Training fees" value={formatCentsExact(open.reduce((n, x) => n + x.trainingFeeCents, 0))} note="$1/hr, first 6 months" />
        <Stat label="To invoice" value={formatCentsExact(open.reduce((n, x) => n + x.gocwglTotalCents, 0))} note={`${open.length} invoice${open.length === 1 ? "" : "s"} to send`} accent />
      </div>

      <LoadState query={query} loadingText="Adding up last month’s VA hours…" isEmpty={!clients.length} empty="No clients yet.">
        <div className="mb-list">
          <table className="mb-list__table">
            <thead>
              <tr>
                <th>Client</th>
                <th className="is-num">VAs</th>
                <th className="is-num">Billable hours</th>
                <th className="is-num">VA hours total</th>
                <th className="is-num">GoCWGL maintenance</th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <ClientRow key={c.client.id} c={c} onOpen={() => setSending({ client: c.client, rows: c.rows })} />
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>

      {sending && r && (
        <VaFeeInvoiceModal
          client={{ id: sending.client.id, name: sending.client.company || sending.client.name }}
          title={sending.client.name}
          top={
            <div className="mb-popclient">
              <Avatar name={sending.client.name} tone={avatarTone(sending.client.id)} size="md" />
              <span className="mb-client__id">
                <span className="mb-client__for">Invoice for</span>
                <strong className="mb-client__name">{sending.client.name}</strong>
                <span className="mb-client__biz">
                  <Icon name="briefcase" size={12} /> {sending.client.company || "No business name"}
                </span>
                <span className="mb-client__email">
                  <Icon name="send" size={12} /> {sending.client.email || "No email on file"}
                </span>
              </span>
              <span className="mb-client__vas">
                {sending.rows.length} VA{sending.rows.length === 1 ? "" : "s"} · {monthLabel(r.month)}
              </span>
            </div>
          }
          rows={sending.rows}
          month={r.month}
          onClose={() => setSending(null)}
          onDone={(message) => {
            setSending(null);
            onMessage(message);
          }}
        />
      )}
    </section>
  );
}

function Stat({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className={accent ? "mb-stat is-accent" : "mb-stat"}>
      <span className="mb-stat__label">{label}</span>
      <strong className="mb-stat__value">{value}</strong>
      <span className="mb-stat__note">{note}</span>
    </div>
  );
}

/** One client in the list: who they are, how many VAs, billable hours, the amounts, status, and Open. */
function ClientRow({ c, onOpen }: { c: ClientEntry; onOpen: () => void }) {
  const none = !c.rows.length;
  const billable = c.rows.reduce((n, r) => n + r.billableSeconds, 0);
  const value = c.rows.reduce((n, r) => n + r.valueCents, 0);
  const toBill = owed(c);
  const total = c.rows.reduce((n, r) => n + r.gocwglTotalCents, 0);
  // The amounts behind the GoCWGL maintenance total: the monthly fees and the training fees.
  const shown = c.rows.filter((r) => (toBill > 0 ? !r.invoice : true));
  const fees = shown.reduce((n, r) => n + (r.maintenanceFeeCents ?? 0), 0);
  const training = shown.reduce((n, r) => n + r.trainingFeeCents, 0);
  const invoiced = c.rows.filter((r) => r.invoice).length;
  // VAs who logged time for the client without being matched to them (no plan, fee or rate on file).
  const noTerms = !none && c.rows.every((r) => r.maintenanceFeeCents == null && r.hoursPerWeek == null);
  const status = none
    ? { tone: "slate" as const, text: "No VA" }
    : noTerms && toBill === 0
      ? { tone: "amber" as const, text: "No fee on file" }
    : toBill > 0
      ? { tone: "orange" as const, text: invoiced ? `${invoiced} of ${c.rows.length} invoiced` : "To invoice" }
      : invoiced
        ? { tone: "green" as const, text: "Invoiced" }
        : { tone: "slate" as const, text: "Nothing to bill" };
  return (
    <tr className={none ? "mb-list__row is-idle" : toBill > 0 ? "mb-list__row is-due" : "mb-list__row"}>
      <td>
        <span className="mb-list__client">
          <Avatar name={c.client.name} tone={avatarTone(c.client.id)} size="sm" />
          <span className="stack stack--0">
            <strong>{c.client.name}</strong>
            <span className="mb-list__sub u-strong">{c.client.company || "No business name"}</span>
            <span className="mb-list__sub">{c.client.email || "No email on file"}</span>
          </span>
        </span>
      </td>
      <td className="is-num">{c.rows.length}</td>
      <td className="is-num">{none ? "—" : hoursLabel(billable)}</td>
      <td className="is-num">{none ? "—" : formatCentsExact(value)}</td>
      <td className="is-num">
        {none ? (
          "—"
        ) : (
          <span className="stack stack--0">
            <strong className="mb-list__amount">{formatCentsExact(toBill > 0 ? toBill : total)}</strong>
            <span className="text-small">
              {noTerms ? "No plan or fee on file" : `${formatCentsExact(fees)} fee${training ? ` + ${formatCentsExact(training)} training` : ""}`}
            </span>
          </span>
        )}
      </td>
      <td>
        <Badge tone={status.tone} size="xs">
          {status.text}
        </Badge>
      </td>
      <td className="is-num">
        <Button size="sm" variant={toBill > 0 ? "primary" : "outline"} onClick={onOpen} disabled={none}>
          Open <Icon name="arrowRight" size={13} />
        </Button>
      </td>
    </tr>
  );
}
