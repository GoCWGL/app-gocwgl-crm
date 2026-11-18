"use client";

import { Avatar, Badge, Icon, LoadState } from "@/components/ui";
import { formatDuration } from "@/lib/duration";
import { avatarTone } from "@/lib/tones";
import type { MyClientOut } from "@/utils/api/models";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMyClients } from "@/utils/hooks/useShifts";
import { EntryLabelChips, type TagColor } from "../components/EntryLabels";
import { useVaAccess } from "../lib/access";
import { clientColors, clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";
import { money } from "./ClientsSection";

/**
 * VA portal › (client) › Client details: everything about the client picked under Active clients, so the VA can
 * review it while working: how to reach them, how long they've worked together, their rate, their time and earnings,
 * the other VAs on the client's team, and the client's tags. View only: the rate, raises and the like are changed on the Clients page.
 */
export function ClientDetailsSection() {
  const { client } = useVa();
  const { ready } = useVaAccess();
  const query = useMyClients(ready);
  const all = query.data?.clients ?? [];
  const c = all.find((x) => x.id === client);
  const color = clientColors(all).get(client) ?? "#94a3b8";

  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading the client…" isEmpty={!c} empty="Pick a client under Active clients in the menu.">
        {c && <ClientPage key={c.id} c={c} color={color} usual={query.data?.defaultRateCents ?? null} />}
      </LoadState>
    </div>
  );
}

function ClientPage({ c, color, usual }: { c: MyClientOut; color: string; usual: number | null }) {
  const name = clientLabel(c);
  const site = c.website ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  const tagColors = new Map(c.tags.map((t) => [t.name, t.color as TagColor]));
  // Empty if the API predates the team list (during a release the page may load before the new API is live).
  const team = c.team ?? [];
  const rateNote = c.rateSince
    ? `Fixed since ${formatShort(c.rateSince)}`
    : c.customRate
      ? "Your rate for this client"
      : usual != null
        ? "Your usual rate"
        : "";

  return (
    <>
      <section className="card va-cdp__head" style={{ ["--client" as string]: color }}>
        <Avatar name={name} size="lg" square />
        <span className="stack stack--2 u-grow u-minw0">
          <span className="va-cdp__name u-truncate">{name}</span>
          {c.company && c.name && <span className="text-small">Contact: {c.name}</span>}
          <span className="text-small">
            {c.active ? `Working together since ${formatShort(c.since)}` : `Worked together ${formatShort(c.since)} – ${c.endedAt ? formatShort(c.endedAt) : ""}`}
          </span>
        </span>
        {c.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Ended</Badge>}
      </section>

      <div className="va-cdp__grid">
        <section className="card va-cp__section va-cdp__card">
          <h3>Contact</h3>
          <dl className="va-cdp__list">
            {c.company && c.name && (
              <div>
                <dt>
                  <Icon name="user" size={13} /> Contact person
                </dt>
                <dd>{c.name}</dd>
              </div>
            )}
            <div>
              <dt>
                <Icon name="mail" size={13} /> Email
              </dt>
              <dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : "—"}</dd>
            </div>
            <div>
              <dt>
                <Icon name="phone" size={13} /> Phone
              </dt>
              <dd>{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</dd>
            </div>
            <div>
              <dt>
                <Icon name="globe" size={13} /> Website
              </dt>
              <dd>
                {site ? (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
                    {site}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card va-cp__section va-cdp__card">
          <h3>VA team</h3>
          {team.length ? (
            <ul className="va-cdp__team">
              {team.map((v) => (
                <li key={v.vaId}>
                  <Avatar name={v.name} tone={avatarTone(v.vaId)} size="sm" />
                  <span className="stack stack--2 u-grow u-minw0">
                    <span className="va-cdp__team-name">
                      {v.name}
                      {v.you && <Badge tone="brand">You</Badge>}
                    </span>
                    {v.headline && <span className="text-small u-truncate">{v.headline}</span>}
                  </span>
                  <span className="text-small va-cdp__team-since">Since {formatShort(v.since)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-small">No VAs on this client’s team yet.</span>
          )}
        </section>

        <section className="card va-cp__section va-cdp__card">
          <h3>Your rate</h3>
          <div className="va-cp__rate">
            <span className="stack stack--2">
              <strong>{money(c.rateCents)}</strong>
              {rateNote && <span className="text-small">{rateNote}</span>}
            </span>
          </div>
        </section>

        <section className="card va-cp__section va-cdp__card">
          <h3>Your time</h3>
          <dl className="va-client__stats">
            <div>
              <dt>This month</dt>
              <dd>{formatDuration(c.monthSeconds)}</dd>
            </div>
            <div>
              <dt>Earned this month</dt>
              <dd className="is-money">{formatCentsExact(c.monthEarningsCents)}</dd>
            </div>
            <div>
              <dt>All time</dt>
              <dd>{formatDuration(c.totalSeconds)}</dd>
            </div>
            <div>
              <dt>Last worked</dt>
              <dd>{c.lastWorkedAt ? formatRelative(c.lastWorkedAt) : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="card va-cp__section va-cdp__card">
          <h3>Their tags</h3>
          {c.tags.length ? (
            <EntryLabelChips tags={c.tags.map((t) => t.name)} colors={tagColors} />
          ) : (
            <span className="text-small">No tags yet. You can add one from the tag picker on the Time tracker.</span>
          )}
        </section>
      </div>
    </>
  );
}
