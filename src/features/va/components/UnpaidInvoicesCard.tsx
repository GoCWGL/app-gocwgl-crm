"use client";

import { useState } from "react";
import { Badge, Button, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatLong, formatShort, todayIso } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useInvoicesOverview } from "@/utils/hooks/useVaInvoices";
import { useVaAccess } from "../lib/access";
import { clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";
import { InvoiceDrawer } from "../sections/invoices/InvoiceDrawer";
import { MarkPaidButton, TRACKING_NOTE, isOverdue, toVerify, unpaidInvoices } from "../sections/invoices/MarkPaid";

/**
 * VA portal › Dashboard: the daily payment check. Every sent invoice that isn't marked paid yet, highlighted at the top
 * with Mark paid on each, because GoCWGL tracks client payments from it. Once everything is paid it's a short
 * all-clear line (nothing when the VA has no invoices).
 */
export function UnpaidInvoicesCard() {
  const va = useVaAccess().ready;
  const query = useInvoicesOverview(va);
  const { goTo } = useVa();
  const [openId, setOpenId] = useState("");
  const all = query.data?.invoices ?? [];
  if (!all.some((i) => i.status !== "draft")) return null;

  const today = todayIso();
  const unpaid = unpaidInvoices(all);
  const owed = unpaid.reduce((t, i) => t + i.amountCents, 0);
  const late = unpaid.filter((i) => isOverdue(i, today)).length;

  if (!unpaid.length)
    return (
      <section className="card pay-check pay-check--clear">
        <Icon name="check" size={16} />
        <span>
          <strong>All your sent invoices are marked paid.</strong> {TRACKING_NOTE}
        </span>
      </section>
    );

  return (
    <section className="card pay-check" aria-labelledby="pay-check-title">
      <header className="pay-check__head">
        <span className="pay-check__icon" aria-hidden="true">
          <Icon name="invoice" size={18} />
        </span>
        <span className="pay-check__heading">
          <span className="pay-check__kicker">Today’s payment check · {formatLong(today)}</span>
          <h3 id="pay-check-title" className="pay-check__title">
            Has a client paid you? Mark it as paid.
          </h3>
          <span className="pay-check__why">
            <Icon name="shield" size={13} /> {TRACKING_NOTE}
          </span>
        </span>
        <span className="pay-check__sum">
          <strong>{formatCentsExact(owed)}</strong>
          <span>
            {unpaid.length} unpaid{late ? ` · ${late} overdue` : ""}
          </span>
        </span>
      </header>

      <ul className="pay-check__list">
        {unpaid.map((i) => {
          const overdue = isOverdue(i, today);
          return (
            <li key={i.id} className={cn("pay-check__row", overdue && "is-overdue")}>
              <span className="pay-check__who">
                <strong>{clientLabel(i.client)}</strong>
                <span>
                  {i.number}
                  {i.sentAt ? ` · sent ${formatShort(i.sentAt)}` : ""}
                </span>
              </span>
              <span className="pay-check__due">
                {toVerify(i) ? (
                  <Badge tone="amber">Client marked paid {formatShort(i.clientPaidAt)}</Badge>
                ) : i.dueDate ? (
                  `${overdue ? "Overdue since" : "Due"} ${formatShort(i.dueDate)}`
                ) : (
                  "No due date"
                )}
              </span>
              <strong className="pay-check__amt">{formatCentsExact(i.amountCents)}</strong>
              <span className="pay-check__actions">
                <Button size="sm" variant="outline" onClick={() => setOpenId(i.id)}>
                  View
                </Button>
                <MarkPaidButton invoice={i} />
              </span>
            </li>
          );
        })}
      </ul>

      <button type="button" className="pay-check__more" onClick={() => goTo("invoices")}>
        All invoices <Icon name="arrowRight" size={12} />
      </button>
      {openId && <InvoiceDrawer id={openId} onClose={() => setOpenId("")} />}
    </section>
  );
}
