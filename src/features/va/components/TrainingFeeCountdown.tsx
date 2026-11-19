"use client";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AgreementClientOut } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { useMyAgreement } from "@/utils/hooks/useVaPortal";
import { useVaAccess } from "../lib/access";
import type { TrainingPeriod } from "./BillingBreakdown";
import { formatDay } from "./VaAgreementTerms";

const DAY = 86_400_000;

/** Time left before the training fee comes off a client's invoices: days, the months/days split, and the share done. */
export function feeCountdown(c: AgreementClientOut, now = Date.now()) {
  const start = new Date(c.startedAt).getTime();
  const end = new Date(`${c.monitoringEndsOn}T00:00:00Z`).getTime();
  const days = Math.max(0, Math.ceil((end - now) / DAY));
  const share = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;
  // Calendar months/days between today and the end date ("4 mo 12 d").
  const from = new Date(now);
  const to = new Date(end);
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  const anchor = Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate());
  const rest = Math.max(0, Math.ceil((end - anchor) / DAY));
  return { days, months: Math.max(0, months), rest, share };
}

const splitLabel = (months: number, rest: number) => [months && `${months} mo`, rest && `${rest} d`].filter(Boolean).join(" ") || "Today";

/** The VA's clients still in their first months (training fee on), optionally only one client. */
function useCountdownClients(clientId?: string) {
  const a = useMyAgreement(useVaAccess().ready).data;
  const clients = (a?.clients ?? []).filter((c) => c.inMonitoring && (!clientId || c.client.id === clientId));
  return { a, clients };
}

/**
 * VA portal › Invoices: for each new client (first 6 months), a countdown to the day GoCWGL's training fee stops being
 * taken off the VA's invoices and they bill their full rate. Hidden when no client is in that period.
 */
export function TrainingFeeCountdown({ clientId }: { clientId?: string }) {
  const { a, clients } = useCountdownClients(clientId);
  if (!a || !clients.length) return null;
  const fee = `${formatCentsExact(a.feeCents)}/hr`;
  return (
    <section className="card inv-card fee-cd" aria-labelledby="fee-cd-title">
      <header className="inv-card__head">
        <span className="stack stack--2">
          <h3 id="fee-cd-title" className="inv-card__title">
            Training fee countdown
          </h3>
          <span className="text-small">
            For your first {a.months} months with a new client, the {fee} training fee comes off your invoices. Then you bill your full rate.
          </span>
        </span>
      </header>
      <div className="fee-cd__grid">
        {clients.map((c) => (
          <CountdownTile key={c.client.id} c={c} months={a.months} fee={fee} />
        ))}
      </div>
    </section>
  );
}

function CountdownTile({ c, months, fee }: { c: AgreementClientOut; months: number; fee: string }) {
  const name = c.client.company || c.client.name;
  const t = feeCountdown(c);
  const soon = t.days <= 30;
  return (
    <div className={cn("fee-cd__tile", soon && "is-soon")}>
      <div className="fee-cd__top">
        <span className="fee-cd__avatar" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="fee-cd__who">
          <strong>{name}</strong>
          <span>Matched {formatDay(c.startedAt.slice(0, 10))}</span>
        </span>
      </div>
      <div className="fee-cd__count">
        <strong>{t.days}</strong>
        <span>
          {t.days === 1 ? "day" : "days"} left
          <small>{splitLabel(t.months, t.rest)}</small>
        </span>
      </div>
      <div
        className="fee-cd__bar"
        role="progressbar"
        aria-label={`${months}-month training period for ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t.share * 100)}
      >
        <span style={{ width: `${Math.max(4, t.share * 100)}%` }} />
      </div>
      <span className="fee-cd__note">
        <Icon name="calendar" size={12} /> {fee} fee comes off on <strong>{formatDay(c.monitoringEndsOn)}</strong>
      </span>
    </div>
  );
}

/** For an invoice's billing summary: how long the training fee still applies with this client (null once it's over). */
export function useTrainingPeriod(clientId?: string): TrainingPeriod | null {
  const { a, clients } = useCountdownClients(clientId);
  const c = clientId ? clients[0] : undefined;
  if (!a || !c) return null;
  return { endsOn: c.monitoringEndsOn, daysLeft: feeCountdown(c).days, feeCents: a.feeCents };
}
