"use client";

import { useState } from "react";
import { Button, Checkbox, FormError, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AgreementClientOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useAcceptAgreement, useMyAgreement } from "@/utils/hooks/useVaPortal";
import { useVaAccess } from "../lib/access";
import { formatDay, VaAgreementTerms } from "./VaAgreementTerms";

/** "$5.00/hr", or "Not set" while the VA has no rate. */
function Rate({ cents }: { cents: number | null | undefined }) {
  if (cents == null) return <strong className="agr-tile__unset">Not set</strong>;
  return (
    <strong>
      {formatCentsExact(cents)}
      <em>/hr</em>
    </strong>
  );
}

/** How far through the monitoring period a client is: 0–1, and the month it's in ("Month 2 of 6"). */
function progress(c: AgreementClientOut, months: number): { share: number; month: number } {
  const start = new Date(c.startedAt).getTime();
  const end = new Date(`${c.monitoringEndsOn}T00:00:00Z`).getTime();
  const share = end > start ? Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) : 1;
  return { share, month: Math.min(months, Math.floor(share * months) + 1) };
}

/**
 * VA portal › Dashboard: the VA agreement. When there's something to agree to (a new client match, or the agreement
 * itself) it's shown in full with a sign-off; afterwards, what the VA keeps per client and when the full rate starts.
 */
export function AgreementCard({ show }: { show: "pending" | "signed" }) {
  const access = useVaAccess();
  const query = useMyAgreement(access.ready);
  const accept = useAcceptAgreement();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const a = query.data;
  // The dashboard puts it above the stats while there's something to sign, below them once it's signed.
  if (!a || a.pending !== (show === "pending")) return null;

  const waiting = a.clients.filter((c) => !c.acceptedAt);
  // Staff viewing as the VA can see it, but only the VA can agree.
  const canAgree = !access.staff;

  /** One sign-off covers every client waiting (or the agreement itself when none is). */
  const signOff = async () => {
    for (const id of waiting.length ? waiting.map((c) => c.client.id) : [null]) await accept.mutateAsync(id);
  };

  if (a.pending) {
    const title = waiting.length
      ? `You’ve been matched with ${waiting.length === 1 ? (waiting[0].client.company || waiting[0].client.name) : `${waiting.length} new clients`}`
      : "Your GoCWGL VA agreement";
    return (
      <section className="agr agr--pending" aria-labelledby="agr-title">
        <header className="agr__head">
          <span className="agr__seal" aria-hidden="true">
            <Icon name="clipboard" size={20} />
          </span>
          <span className="agr__heading">
            <span className="agr__kicker">
              <span className="agr__pulse" aria-hidden="true" /> Action needed · VA agreement
            </span>
            <h3 id="agr-title" className="agr__title">
              {title}
            </h3>
            <span className="agr__sub">Please read the agreement below and sign off before you start working.</span>
          </span>
          <span className="agr__private">
            <Icon name="lock" size={12} /> You and GoCWGL
          </span>
        </header>

        <div className="agr__body">
          <VaAgreementTerms feeCents={a.feeCents} months={a.months} />

          <aside className="agr__side">
            {waiting.length > 0 && (
              <div className="stack stack--8">
                <span className="agr__label">{waiting.length === 1 ? "Your new client" : "Your new clients"}</span>
                {waiting.map((c) => (
                  <ClientTile key={c.client.id} c={c} months={a.months} />
                ))}
              </div>
            )}
            <div className="agr-sign">
              <span className="agr__label">Sign-off</span>
              <Checkbox
                brand
                checked={agreed}
                disabled={!canAgree}
                onChange={(e) => setAgreed(e.target.checked)}
                label="I’ve read the GoCWGL VA agreement and I agree to it."
              />
              <FormError error={accept.error} />
              <Button onClick={signOff} disabled={!canAgree || !agreed || accept.isPending}>
                <Icon name="check" size={14} /> {accept.isPending ? "Saving…" : "Agree and continue"}
              </Button>
              {!canAgree && <span className="text-small">Only the VA can agree to this. You’re viewing their portal.</span>}
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="agr" aria-labelledby="agr-title">
      <header className="agr__head">
        <span className="agr__seal agr__seal--done" aria-hidden="true">
          <Icon name="circleCheck" size={20} />
        </span>
        <span className="agr__heading">
          <span className="agr__kicker agr__kicker--muted">Your VA agreement</span>
          <h3 id="agr-title" className="agr__title">
            {a.acceptedAt ? `Signed ${formatShort(a.acceptedAt)}` : "VA agreement"}
          </h3>
          <span className="agr__sub">
            For your first {a.months} months with each client, {formatCentsExact(a.feeCents)} an hour comes off your invoices automatically. GoCWGL
            bills it to the client with the maintenance fee.
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={13} /> {open ? "Hide agreement" : "View agreement"}
        </Button>
      </header>
      {open && <VaAgreementTerms feeCents={a.feeCents} months={a.months} />}
      {a.clients.length > 0 ? (
        <div className="agr__tiles">
          {a.clients.map((c) => (
            <ClientTile key={c.client.id} c={c} months={a.months} />
          ))}
        </div>
      ) : (
        <span className="agr__empty">
          <Icon name="users" size={15} /> When you’re matched with a client, they show up here with the day your full rate starts.
        </span>
      )}
    </section>
  );
}

/** One client: where the VA is in the monitoring period, what they keep now, and their full rate after. */
function ClientTile({ c, months }: { c: AgreementClientOut; months: number }) {
  const name = c.client.company || c.client.name;
  const p = progress(c, months);
  return (
    <div className={cn("agr-tile", !c.inMonitoring && "agr-tile--full")}>
      <div className="agr-tile__top">
        <span className="agr-tile__avatar" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="agr-tile__who">
          <strong>{name}</strong>
          <span>Matched {formatDay(c.startedAt.slice(0, 10))}</span>
        </span>
        <span className={cn("agr-tile__chip", c.inMonitoring ? "is-monitoring" : "is-full")}>
          {c.inMonitoring ? `Month ${p.month} of ${months}` : "Full rate"}
        </span>
      </div>
      {c.inMonitoring && (
        <div
          className="agr-tile__bar"
          role="progressbar"
          aria-label={`Monitoring period for ${name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.share * 100)}
        >
          <span style={{ width: `${Math.max(4, p.share * 100)}%` }} />
        </div>
      )}
      <div className="agr-tile__pay">
        {c.inMonitoring ? (
          <>
            <span className="agr-tile__rate">
              <small>You keep now</small>
              <Rate cents={c.takeHomeCents} />
            </span>
            <Icon name="arrowRight" size={14} className="agr-tile__arrow" />
            <span className="agr-tile__rate agr-tile__rate--next">
              <small>From {formatDay(c.monitoringEndsOn)}</small>
              <Rate cents={c.rateCents} />
            </span>
          </>
        ) : (
          <span className="agr-tile__rate agr-tile__rate--next">
            <small>Full rate since {formatDay(c.monitoringEndsOn)}</small>
            <Rate cents={c.rateCents} />
          </span>
        )}
      </div>
    </div>
  );
}
