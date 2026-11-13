"use client";

import { useState } from "react";
import { Avatar, Button, ConfirmDialog, Icon } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { RaiseRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useDecideRaise, useRaiseRequests } from "@/utils/hooks/useClientWork";

const rate = (cents: number) => `${formatCentsExact(cents)}/h`;

/** Client portal › VAs: raise requests waiting for an answer ($1/h, at most every 6 months per VA). */
export function RaiseRequests({ readOnly }: { readOnly: boolean }) {
  const pending = (useRaiseRequests().data ?? []).filter((r) => r.status === "pending");
  const [deciding, setDeciding] = useState<{ r: RaiseRequestOut; approve: boolean } | null>(null);
  if (!pending.length) return null;

  return (
    <section className="card rr-panel" aria-labelledby="rr-title">
      <header className="rr-panel__head">
        <span className="rr-panel__icon" aria-hidden="true">
          <Icon name="trendUp" size={18} />
        </span>
        <span className="stack stack--2">
          <strong id="rr-title">
            {pending.length === 1 ? "A rate request is waiting for you" : `${pending.length} rate requests are waiting for you`}
          </strong>
          <span className="text-small">
            A VA can change their rate for you once, then ask for $1 more an hour every 6 months. Nothing changes until you approve; then it applies to time
            they log from that point.
          </span>
        </span>
      </header>
      <ul className="rr-list">
        {pending.map((r) => (
          <li key={r.id} className="rr-item">
            <Avatar name={r.vaName} tone={avatarTone(r.vaId)} />
            <span className="stack stack--2 u-grow u-minw0">
              <strong>
                {r.vaName} <span className="rr-item__kind">{r.kind === "rate" ? "New rate" : "$1 raise"}</span>
              </strong>
              <span className="rr-item__rates">
                {rate(r.fromCents)} <Icon name="arrowRight" size={12} /> <strong>{rate(r.toCents)}</strong>
                <span className="text-small"> · asked {formatShort(r.createdAt)}</span>
              </span>
              {r.note && <span className="rr-item__note">“{r.note}”</span>}
            </span>
            {!readOnly && (
              <span className="cluster cluster--6">
                <Button size="sm" variant="outline" onClick={() => setDeciding({ r, approve: false })}>
                  Decline
                </Button>
                <Button size="sm" variant="primary" onClick={() => setDeciding({ r, approve: true })}>
                  Approve
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {deciding && <Decide r={deciding.r} approve={deciding.approve} onClose={() => setDeciding(null)} />}
    </section>
  );
}

function Decide({ r, approve, onClose }: { r: RaiseRequestOut; approve: boolean; onClose: () => void }) {
  const decide = useDecideRaise();
  return (
    <ConfirmDialog
      title={`${approve ? "Approve" : "Decline"} ${r.vaName}’s ${r.kind === "rate" ? "new rate" : "raise"}?`}
      confirmLabel={approve ? `Approve ${rate(r.toCents)}` : "Decline"}
      icon={approve ? "trendUp" : "close"}
      pending={decide.isPending}
      error={decide.error}
      onConfirm={() => decide.mutate({ id: r.id, approve }, { onSuccess: onClose })}
      onClose={onClose}
    >
      {approve
        ? `Their rate for your work goes from ${rate(r.fromCents)} to ${rate(r.toCents)}, for time they log from now on. We’ll let them know.`
        : `Their rate stays at ${rate(r.fromCents)}. We’ll let them know; they can ask for a $1 raise every 6 months.`}
    </ConfirmDialog>
  );
}
