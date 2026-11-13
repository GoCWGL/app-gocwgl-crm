"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Dropdown, Icon, LoadState, TabBar } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { InvoiceClient, InvoicesOverview, VaInvoiceRow } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMyClients } from "@/utils/hooks/useShifts";
import { useInvoicesOverview, usePaymentMethods } from "@/utils/hooks/useVaInvoices";
import { useVaAccess } from "../lib/access";
import { clientColors, clientLabel, downloadCsv } from "../lib/time";
import { CreateInvoiceModal } from "./invoices/CreateInvoiceModal";
import { InvoiceDrawer } from "./invoices/InvoiceDrawer";
import { PaymentDetails } from "./invoices/PaymentDetails";
import { STATUS, hoursLabel, initials, periodLabel, type InvoiceStatus } from "./invoices/shared";

type View = "invoices" | "payment";
type StatusFilter = "all" | InvoiceStatus;

/** VA portal › Invoices: bill clients for billable time, track what's paid, and keep payment details. */
export function InvoicesSection() {
  const va = useVaAccess().ready;
  const query = useInvoicesOverview(va);
  const methods = usePaymentMethods(va);
  const clients = useMyClients(va);
  const colors = useMemo(() => clientColors(clients.data?.clients), [clients.data]);
  const [view, setView] = useState<View>("invoices");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState("");
  const d = query.data;

  const exportCsv = () =>
    d &&
    downloadCsv(
      "invoices.csv",
      ["Invoice", "Client", "Period start", "Period end", "Hours", "Rate", "Amount", "Status", "Issued", "Due", "Paid"],
      d.invoices.map((i) => [
        i.number,
        clientLabel(i.client),
        i.periodStart,
        i.periodEnd,
        (i.seconds / 3600).toFixed(2),
        (i.rateCents / 100).toFixed(2),
        (i.amountCents / 100).toFixed(2),
        i.status,
        i.sentAt ? i.sentAt.slice(0, 10) : "",
        i.dueDate ?? "",
        i.paidAt ? i.paidAt.slice(0, 10) : "",
      ]),
    );

  return (
    <div className="page-stack inv">
      <TabBar<View>
        label="Invoices"
        value={view}
        onChange={setView}
        options={[
          { value: "invoices", label: "Invoices", hint: "Bill GoCWGL for your time", icon: "receipt", tone: "brand", count: d?.invoices.length ?? "–" },
          { value: "payment", label: "Payment details", hint: "How you get paid", icon: "card", tone: "green", count: methods.data?.length ?? "–" },
        ]}
        actions={
          <>
            {view === "invoices" && (
              <Button variant="outline" onClick={exportCsv} disabled={!d?.invoices.length}>
                <Icon name="download" size={14} /> Export
              </Button>
            )}
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={14} /> Create invoice
            </Button>
          </>
        }
      />

      {view === "payment" ? (
        <PaymentDetails />
      ) : (
        <LoadState query={query} loadingText="Loading your invoices…">
          {d && <Overview d={d} colors={colors} onOpen={setOpenId} onCreate={() => setCreating(true)} />}
        </LoadState>
      )}

      {creating && (
        <CreateInvoiceModal
          ready={d?.ready ?? []}
          clients={clients.data?.clients ?? []}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
          }}
          onAddPayment={() => {
            setCreating(false);
            setView("payment");
          }}
        />
      )}
      {openId && <InvoiceDrawer id={openId} onClose={() => setOpenId("")} />}
    </div>
  );
}

function Overview({
  d,
  colors,
  onOpen,
  onCreate,
}: {
  d: InvoicesOverview;
  colors: Map<string, string>;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [clientId, setClientId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const forClient = <T extends { client?: InvoiceClient | null }>(rows: T[]) => (clientId === "all" ? rows : rows.filter((r) => r.client?.id === clientId));
  const invoices = forClient(d.invoices);
  const byClient = forClient(d.byClient);
  const ready = forClient(d.ready);

  // Totals for the picked client (or everyone).
  const sum = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.amountCents, 0);
  const count = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).length;
  const readyCents = ready.reduce((t, r) => t + r.amountCents, 0);
  const readySecs = ready.reduce((t, r) => t + r.seconds, 0);
  const totalInvoiced = byClient.reduce((t, r) => t + r.paidCents + r.outstandingCents, 0);
  const shown = invoices.filter((i) => status === "all" || i.status === status);

  // Every client that has invoices or time ready, for the picker.
  const pickable = new Map<string, InvoiceClient>();
  [...d.invoices, ...d.ready].forEach((r) => r.client && pickable.set(r.client.id, r.client));
  const pickLabel = clientId === "all" ? "All clients" : clientLabel(pickable.get(clientId));
  const color = (id?: string) => (id ? (colors.get(id) ?? "#94a3b8") : "#94a3b8");

  return (
    <>
      <Dropdown
        label="Client"
        value={clientId}
        onChange={setClientId}
        className="tt-pill"
        items={[
          { value: "all", label: "All clients", lead: <span className="tt-chip tt-chip--all">ALL</span> },
          ...[...pickable.values()].map((c) => ({
            value: c.id,
            label: clientLabel(c),
            lead: <span className="tt-dot" style={{ background: color(c.id) }} />,
          })),
        ]}
      >
        <span className={cn("tt-chip", clientId === "all" && "tt-chip--all")} style={clientId !== "all" ? { background: color(clientId) } : undefined}>
          {clientId === "all" ? "ALL" : initials(pickLabel)}
        </span>
        <span className="tt-pill__text">
          <span className="tt-pill__kicker">CLIENT</span>
          <strong>{pickLabel}</strong>
        </span>
        <span className="inv-earned-chip">{formatCentsExact(sum("paid"))} earned</span>
      </Dropdown>

      <div className="inv-stats">
        <Stat label="Total earned" value={formatCentsExact(sum("paid"))} note={`${pickLabel} · paid invoices`} tone="green" />
        <Stat label="Outstanding" value={formatCentsExact(sum("sent"))} note={`${count("sent")} sent, waiting for payment`} tone="blue" />
        <Stat label="Drafts" value={formatCentsExact(sum("draft"))} note={`${count("draft")} not sent yet`} />
        <Stat
          label="Ready to invoice"
          value={formatCentsExact(readyCents)}
          note={readySecs ? `${hoursLabel(readySecs)} not invoiced yet` : "Nothing waiting"}
          action={readySecs ? onCreate : undefined}
        />
      </div>

      <section className="card inv-card">
        <header className="inv-card__head">
          <span className="stack stack--2">
            <h3 className="inv-card__title">Earnings by client</h3>
            <span className="text-small">How much each client has paid you, and what’s still owed</span>
          </span>
          <span className="inv-card__total">
            Total invoiced <strong>{formatCentsExact(totalInvoiced)}</strong>
          </span>
        </header>
        {byClient.length ? (
          <div className="table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="is-num">Invoices</th>
                  <th className="is-num">Hours</th>
                  <th className="is-num">Rate</th>
                  <th className="is-num">Paid</th>
                  <th className="is-num">Outstanding</th>
                  <th>Share of earnings</th>
                </tr>
              </thead>
              <tbody>
                {byClient.map((r) => (
                  <tr key={r.client.id}>
                    <td>
                      <span className="inv-client">
                        <span className="inv-initials" style={{ ["--c" as string]: color(r.client.id) }}>
                          {initials(clientLabel(r.client))}
                        </span>
                        <span className="stack stack--2">
                          <strong>{clientLabel(r.client)}</strong>
                          <span className="text-small">{periodLabel(r.periodStart, r.periodEnd)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="is-num">{r.invoices}</td>
                    <td className="is-num">{hoursLabel(r.seconds)}</td>
                    <td className="is-num">{r.rateCents != null ? `${formatCentsExact(r.rateCents)} / hr` : "—"}</td>
                    <td className="is-num inv-paid">{formatCentsExact(r.paidCents)}</td>
                    <td className="is-num inv-owed">{formatCentsExact(r.outstandingCents)}</td>
                    <td>
                      <span className="inv-share">
                        <span className="inv-share__track">
                          <span style={{ width: `${r.sharePct}%`, background: color(r.client.id) }} />
                        </span>
                        <strong>{r.sharePct}%</strong>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="report-empty">No invoices yet. Create one from your billable time and each client’s totals show up here.</p>
        )}
      </section>

      <section className="card inv-card">
        <header className="inv-card__head">
          <span className="stack stack--2">
            <h3 className="inv-card__title">All invoices</h3>
            <span className="text-small">Built from your billable hours in the Time tracker</span>
          </span>
          <div className="inv-seg" role="group" aria-label="Filter by status">
            {(["all", "draft", "sent", "paid"] as StatusFilter[]).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : STATUS[s].label} · {s === "all" ? invoices.length : count(s)}
              </button>
            ))}
          </div>
        </header>
        {shown.length ? (
          <div className="table-scroll">
            <table className="inv-table inv-table--list">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Period</th>
                  <th className="is-num">Hours</th>
                  <th className="is-num">Rate</th>
                  <th className="is-num">Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <InvoiceRow key={i.id} i={i} color={color(i.client?.id)} onOpen={() => onOpen(i.id)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="report-empty">{invoices.length ? "No invoices with this status." : "No invoices yet. Use Create invoice to bill a client for your time."}</p>
        )}
      </section>
    </>
  );
}

function InvoiceRow({ i, color, onOpen }: { i: VaInvoiceRow; color: string; onOpen: () => void }) {
  const name = clientLabel(i.client);
  return (
    <tr>
      <td>
        <button type="button" className="inv-number" onClick={onOpen}>
          {i.number}
        </button>
        <span className="text-small">{i.sentAt ? `Issued ${formatShort(i.sentAt)}` : `Created ${formatShort(i.createdAt)}`}</span>
      </td>
      <td>
        <span className="inv-client">
          <span className="inv-initials" style={{ ["--c" as string]: color }}>
            {initials(name)}
          </span>
          <strong>{name}</strong>
        </span>
      </td>
      <td>{periodLabel(i.periodStart, i.periodEnd)}</td>
      <td className="is-num">{hoursLabel(i.seconds)}</td>
      <td className="is-num">{formatCentsExact(i.rateCents)}</td>
      <td className="is-num">
        <strong>{formatCentsExact(i.amountCents)}</strong>
      </td>
      <td>{i.status === "paid" && i.paidAt ? `Paid ${formatShort(i.paidAt)}` : i.dueDate ? formatShort(i.dueDate) : "—"}</td>
      <td>
        <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
      </td>
      <td className="is-num">
        <Button size="sm" variant="outline" onClick={onOpen}>
          View
        </Button>
      </td>
    </tr>
  );
}

function Stat({ label, value, note, tone, action }: { label: string; value: string; note: string; tone?: "green" | "blue"; action?: () => void }) {
  return (
    <div className={cn("card inv-stat", tone && `is-${tone}`)}>
      <span className="inv-stat__label">{label}</span>
      <strong className="inv-stat__value">{value}</strong>
      <span className="inv-stat__note">
        {note}
        {action && (
          <button type="button" className="inv-stat__link" onClick={action}>
            Invoice it <Icon name="arrowRight" size={12} />
          </button>
        )}
      </span>
    </div>
  );
}
