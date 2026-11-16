"use client";

import { useState } from "react";
import { Avatar, Icon, LoadState, SearchBox } from "@/components/ui";
import { useNow } from "@/lib/duration";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { PresenceUserOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { usePresence } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

type Filter = "all" | "online" | "away";

const FILTERS: Array<{ value: Filter; label: string; tone?: "green" | "slate" }> = [
  { value: "all", label: "All clients" },
  { value: "online", label: "Online", tone: "green" },
  { value: "away", label: "Earlier today", tone: "slate" },
];

/**
 * Clients › Live status: which client users have their portal open right now (it checks in about once a minute),
 * and when the others who signed in over the last day were last on.
 */
export function ClientStatusSection() {
  const { openClient } = useAdmin();
  const query = usePresence();
  const now = useNow(15_000);
  const clients = (query.data?.people ?? []).filter((p) => p.role === "client");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const online = clients.filter((p) => p.online);
  const away = clients.filter((p) => !p.online);
  const businesses = new Set(online.map((p) => p.contactId || p.id)).size;
  const shown = clients.filter(
    (p) =>
      (filter === "all" || (filter === "online") === p.online) &&
      (!q || `${p.fullName} ${p.email} ${p.business ?? ""}`.toLowerCase().includes(q)),
  );
  const count = (f: Filter) => (f === "all" ? clients.length : f === "online" ? online.length : away.length);
  const updated = query.dataUpdatedAt ? formatRelative(new Date(query.dataUpdatedAt), new Date(now)) : "";

  return (
    <div className="page-stack">
      <section className="card pulse">
        <div className="pulse__main">
          <span className="pulse__live">
            <span className="live-dot" aria-hidden="true" />
            LIVE{updated && <span className="pulse__updated"> · updated {updated}</span>}
          </span>
          <h2 className="pulse__headline">
            <strong>{query.data ? online.length : "–"}</strong>
            <span>
              client{online.length === 1 ? "" : "s"} online now
            </span>
          </h2>
          <div className="pulse__bar" role="img" aria-label={`${online.length} online, ${away.length} on earlier today`}>
            {clients.length ? (
              <>
                {online.length > 0 && <span className="tone-green" style={{ flexGrow: online.length }} />}
                {away.length > 0 && <span className="tone-slate" style={{ flexGrow: away.length }} />}
              </>
            ) : (
              <span className="is-empty" />
            )}
          </div>
        </div>

        <dl className="pulse__metrics">
          <div className="pulse__metric">
            <dt>Businesses online</dt>
            <dd>{query.data ? businesses : "–"}</dd>
            <span>With someone in their portal</span>
          </div>
          <div className="pulse__metric">
            <dt>On today</dt>
            <dd>{query.data ? clients.length : "–"}</dd>
            <span>Client users in the last 24 hours</span>
          </div>
        </dl>
      </section>

      <div className="card card--flat board">
        <div className="course-toolbar status-toolbar">
          <div className="filter-track" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={cn("filter-pill", f.tone && `tone-${f.tone}`)}
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.tone && <span className="filter-pill__dot" aria-hidden="true" />}
                {f.label}
                <span className="filter-pill__count">{count(f.value)}</span>
              </button>
            ))}
          </div>
          <div className="course-toolbar__tools">
            <SearchBox label="Search clients" placeholder="Search name, email or business" value={search} onChange={setSearch} />
          </div>
        </div>

        <LoadState query={query} loadingText="Loading client status…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className="board__empty-icon tone-green" aria-hidden="true">
                <Icon name="pulse" size={18} />
              </span>
              <span className="text-strong">
                {!clients.length ? "No clients on today" : q ? `No matches for “${search.trim()}”` : filter === "online" ? "No clients online right now" : "No one else on today"}
              </span>
              <span className="text-small">
                {clients.length ? "Try another filter." : "Clients show up here while they have their portal open, and for a day after."}
              </span>
            </div>
          ) : (
            <ul className="dash-online__list client-status">
              {[...shown.filter((p) => p.online), ...shown.filter((p) => !p.online)].map((p) => (
                <ClientRow key={p.id} person={p} now={now} onOpen={p.contactId ? () => openClient(p.contactId!) : undefined} />
              ))}
            </ul>
          )}
        </LoadState>
      </div>
    </div>
  );
}

function ClientRow({ person: p, now, onOpen }: { person: PresenceUserOut; now: number; onOpen?: () => void }) {
  return (
    <li className={p.online ? "is-online" : undefined}>
      <span className={cn("presence", p.online ? "is-working" : "is-offline")}>
        <Avatar name={p.fullName || p.email} tone={avatarTone(p.id)} size="md" />
        <span className="presence__dot" aria-hidden="true" />
      </span>
      <span className="stack stack--2 u-grow">
        <span className="u-strong">{p.business || p.fullName || p.email}</span>
        <span className="text-small">{p.business ? `${p.fullName || p.email} · ${p.email}` : p.email}</span>
      </span>
      <span className={cn("text-small u-strong", p.online && "u-green")}>
        {p.online ? "Online" : `Seen ${formatRelative(p.lastSeenAt, new Date(now))}`}
      </span>
      {onOpen && (
        <button type="button" className="mini-action" onClick={onOpen}>
          Open client
        </button>
      )}
    </li>
  );
}
