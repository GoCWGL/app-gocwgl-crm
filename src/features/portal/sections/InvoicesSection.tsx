"use client";

import { PaymentLines } from "@/features/va/sections/invoices/PaymentLines";
import { useState } from "react";
import { Avatar, Badge, Button, LoadState, Modal, StatGrid, TabBar } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { ClientVaInvoice } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { usePortalBilling } from "@/utils/hooks/useBilling";
import { useVaInvoiceForClient, useVaInvoicesForClient } from "@/utils/hooks/useClientWork";
import { hm } from "../lib/vaTeam";
import { BillingSection } from "./BillingSection";

type View = "vas" | "gocwgl";

/** Client portal › Invoices: invoices from your VAs, and from GoCWGL. */
export function InvoicesSection() {
  const vaInvoices = useVaInvoicesForClient();
  const gocwgl = usePortalBilling();
  const [view, setView] = useState<View>("vas");
  const vaOpen = (vaInvoices.data ?? []).filter((i) => i.status === "sent").length;
  const gOpen = (gocwgl.data?.invoices ?? []).filter((i) => i.status === "Sent" || i.status === "Overdue").length;

  return (
    <div className="page-stack">
      <TabBar
        label="Invoices"
        value={view}
        onChange={setView}
        options={[
          { value: "vas", label: "From your VAs", hint: "For their hours", icon: "users", tone: "cyan", count: vaInvoices.data ? vaOpen || vaInvoices.data.length : "–" },
          { value: "gocwgl", label: "From GoCWGL", hint: "Plans and builds", icon: "invoice", tone: "pink", count: gocwgl.data ? gOpen || gocwgl.data.invoices.length : "–" },
        ]}
      />
      {view === "vas" ? <VaInvoices /> : <BillingSection />}
    </div>
  );
}

function VaInvoices() {
  const query = useVaInvoicesForClient();
  const [openId, setOpenId] = useState("");
  const rows = query.data ?? [];
  const sum = (list: ClientVaInvoice[]) => list.reduce((n, i) => n + i.amountCents, 0);
  const pending = rows.filter((i) => i.status === "sent");

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Waiting for payment", value: formatCentsExact(sum(pending)), tone: pending.length ? "amber" : "slate" },
          { label: "Paid", value: formatCentsExact(sum(rows.filter((i) => i.status === "paid"))), tone: "green" },
          { label: "Invoices", value: String(rows.length), tone: "cyan" },
        ]}
      />
      <p className="text-muted">Your VAs invoice you directly for their hours. Open an invoice for the breakdown and how to pay it.</p>
      <LoadState query={query} loadingText="Loading invoices…" isEmpty={!rows.length} empty="No invoices from your VAs yet.">
        <section className="card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>VA</th>
                <th>Period</th>
                <th>Hours</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="is-clickable" onClick={() => setOpenId(i.id)}>
                  <td>
                    <button type="button" className="cp-link" onClick={() => setOpenId(i.id)}>
                      {i.number}
                    </button>
                  </td>
                  <td>
                    <span className="cluster cluster--8">
                      <Avatar name={i.va.name} tone={avatarTone(i.va.id)} size="sm" />
                      {i.va.name}
                    </span>
                  </td>
                  <td>
                    {formatShort(i.periodStart)} – {formatShort(i.periodEnd)}
                  </td>
                  <td>{hm(i.seconds)}</td>
                  <td className="text-strong">{formatCentsExact(i.amountCents)}</td>
                  <td>
                    <InvoiceBadge i={i} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </LoadState>
      {openId && <VaInvoiceModal id={openId} onClose={() => setOpenId("")} />}
    </div>
  );
}

function InvoiceBadge({ i }: { i: ClientVaInvoice }) {
  if (i.status === "paid") return <Badge tone="green" dot>Paid {i.paidAt ? formatShort(i.paidAt) : ""}</Badge>;
  const late = i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <Badge tone={late ? "red" : "amber"} dot>
      {late ? "Overdue" : "Pending"}
      {i.dueDate ? ` · due ${formatShort(i.dueDate)}` : ""}
    </Badge>
  );
}

function VaInvoiceModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useVaInvoiceForClient(id);
  const inv = q.data;
  return (
    <Modal
      open
      variant="drawer"
      width={560}
      onClose={onClose}
      titleId="va-invoice"
      kicker="VA INVOICE"
      title={inv ? inv.number : "Invoice"}
      subtitle={inv ? `${inv.va.name} · ${formatShort(inv.periodStart)} – ${formatShort(inv.periodEnd)}` : undefined}
      footer={
        <>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <LoadState query={q} loadingText="Loading invoice…">
        {inv && (
          <div className="stack stack--16">
            <div className="cluster cluster--between">
              <InvoiceBadge i={inv} />
              <strong className="cp-invoice__total">{formatCentsExact(inv.amountCents)}</strong>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.category}>
                    <td>{l.category || "Work"}</td>
                    <td>{hm(l.seconds)}</td>
                    <td>{formatCentsExact(l.rateCents)}/hr</td>
                    <td className="text-strong">{formatCentsExact(l.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inv.payment && (
              <section className="cp-pay">
                <span className="kicker kicker--sm">HOW TO PAY</span>
                <strong>{inv.payment.label}</strong>
                <PaymentLines payment={inv.payment} payNow={inv.status !== "paid"} />
              </section>
            )}
            {inv.note && <p className="va-pre">{inv.note}</p>}
          </div>
        )}
      </LoadState>
    </Modal>
  );
}
