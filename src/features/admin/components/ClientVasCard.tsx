"use client";

import { Avatar, Badge, Icon, LoadState } from "@/components/ui";
import { formatDuration } from "@/lib/duration";
import { avatarTone } from "@/lib/tones";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useClientVas } from "@/utils/hooks/useClientWork";
import { useAdmin } from "../state/AdminContext";

/** Client profile › VAs: everyone who works with this client now, and who used to, with their rate and hours. */
export function ClientVasCard({ contactId }: { contactId: string }) {
  const { update } = useAdmin();
  const query = useClientVas(contactId);
  const vas = query.data ?? [];
  const active = vas.filter((v) => v.active).length;

  return (
    <section className="card vp-card">
      <header className="vp-card__head">
        <span className="vp-card__icon" aria-hidden="true">
          <Icon name="users" size={14} />
        </span>
        <h3 className="vp-card__title">VAs for this client</h3>
        <span className="vp-card__count">{active}</span>
        {vas.length > active && <span className="text-small">+ {vas.length - active} past</span>}
      </header>
      <LoadState query={query} loadingText="Loading their VAs…" isEmpty={!vas.length} empty="No VA works with this client yet. Add the client from a VA’s profile (People › VAs).">
        <div className="vp-clist" role="table" aria-label="VAs for this client">
          <div className="vp-clist__row vp-clist__row--head vp-clist__row--vas" role="row">
            <span role="columnheader">VA</span>
            <span role="columnheader">Since</span>
            <span role="columnheader">This month</span>
            <span role="columnheader">All time</span>
            <span role="columnheader">Rate</span>
            <span role="columnheader">Status</span>
          </div>
          {vas.map((v) => (
            <div key={v.vaId} className={`vp-clist__row vp-clist__row--vas${v.active ? "" : " is-past"}`} role="row">
              <span role="cell" className="vp-clist__who">
                <Avatar name={v.name} tone={avatarTone(v.vaId)} size="sm" />
                <button type="button" className="vp-clist__name" onClick={() => update({ tab: "vas", vaFullId: v.vaId })} title="Open VA profile">
                  <strong>{v.name}</strong>
                  <span>{[v.headline, v.email].filter(Boolean).join(" · ")}</span>
                </button>
              </span>
              <span role="cell" className="vp-clist__cell" data-label="Since">
                {formatShort(v.since)}
                {v.endedAt && <span className="vp-clist__sub"> – {formatShort(v.endedAt)}</span>}
              </span>
              <span role="cell" className="vp-clist__cell vp-clist__num" data-label="This month">
                {formatDuration(v.monthSeconds)}
              </span>
              <span role="cell" className="vp-clist__cell vp-clist__num" data-label="All time">
                {formatDuration(v.totalSeconds)}
                {v.lastWorkedAt && <span className="vp-clist__sub">last {formatRelative(v.lastWorkedAt)}</span>}
              </span>
              <span role="cell" className="vp-clist__cell vp-clist__num" data-label="Rate">
                {v.rateCents != null ? `${formatCentsExact(v.rateCents)}/h` : "—"}
                <span className="vp-clist__sub">{v.rateCents == null ? "not set" : v.customRate ? "for this client" : "usual rate"}</span>
              </span>
              <span role="cell" className="vp-clist__cell" data-label="Status">
                {v.active ? (
                  v.workingNow ? (
                    <Badge tone="green" dot>
                      Working now
                    </Badge>
                  ) : (
                    <Badge tone="green">Active</Badge>
                  )
                ) : (
                  <Badge tone="slate">Past</Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      </LoadState>
    </section>
  );
}
