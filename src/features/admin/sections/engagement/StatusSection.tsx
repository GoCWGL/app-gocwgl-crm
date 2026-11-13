"use client";

import { useState } from "react";
import { Avatar, Icon, LoadState, SearchBox } from "@/components/ui";
import { formatDuration, useNow } from "@/lib/duration";
import { avatarTone, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaStatusRow } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { useVaStatus } from "@/utils/hooks/useShifts";
import { useAdmin } from "../../state/AdminContext";

type State = VaStatusRow["state"];
type Filter = "all" | State;
type View = "list" | "grid";

const STATES: State[] = ["working", "on_break", "offline"];
const STATE: Record<State, { label: string; group: string; tone: Tone }> = {
  working: { label: "Working", group: "Working now", tone: "green" },
  on_break: { label: "On break", group: "On a break", tone: "amber" },
  offline: { label: "Offline", group: "Offline", tone: "slate" },
};
/** A full day on the clock, for the "today" bars. */
const DAY_SECONDS = 8 * 3600;

const clientOf = (r: VaStatusRow) => (r.shift?.client ? r.shift.client.company || r.shift.client.name : "");

function localTime(now: number, tz: string): string {
  try {
    return new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || undefined });
  } catch {
    return "";
  }
}

/** Engagement › Status: which VAs are working right now, on a break, or offline. */
export function StatusSection() {
  const { update } = useAdmin();
  const query = useVaStatus();
  const board = query.data;
  const rows = board?.vas ?? [];
  const now = useNow(15_000);
  // Running clocks keep counting between the 30-second refreshes.
  const drift = query.dataUpdatedAt ? Math.max(0, (now - query.dataUpdatedAt) / 1000) : 0;
  const live = (r: VaStatusRow) => r.workedTodaySeconds + (r.state === "working" ? drift : 0);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const open = (r: VaStatusRow) => update({ tab: "vas", vaFullId: r.vaId, vaId: "" });

  const shown = rows.filter(
    (r) => (filter === "all" || r.state === filter) && (!q || `${r.name} ${r.email} ${r.headline} ${clientOf(r)} ${r.shift?.note ?? ""}`.toLowerCase().includes(q)),
  );
  const count = (s: State) => rows.filter((r) => r.state === s).length;
  const onClock = count("working") + count("on_break");
  const totalToday = rows.reduce((t, r) => t + live(r), 0);
  const workedToday = rows.filter((r) => live(r) > 0).length;
  const clientsNow = new Set(rows.filter((r) => r.state !== "offline" && r.shift?.client).map((r) => r.shift!.client!.id)).size;
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
            <strong>{board ? onClock : "–"}</strong>
            <span>
              of {rows.length} VA{rows.length === 1 ? "" : "s"} on the clock
            </span>
          </h2>
          <div
            className="pulse__bar"
            role="img"
            aria-label={STATES.map((s) => `${count(s)} ${STATE[s].label.toLowerCase()}`).join(", ")}
          >
            {rows.length ? (
              STATES.filter((s) => count(s)).map((s) => (
                <span key={s} className={`tone-${STATE[s].tone}`} style={{ flexGrow: count(s) }} />
              ))
            ) : (
              <span className="is-empty" />
            )}
          </div>
          <div className="pulse__legend" role="group" aria-label="Filter by status">
            {STATES.map((s) => (
              <button
                key={s}
                type="button"
                className={cn("pulse__key", `tone-${STATE[s].tone}`)}
                aria-pressed={filter === s}
                onClick={() => setFilter(filter === s ? "all" : s)}
              >
                <span className="pulse__swatch" aria-hidden="true" />
                <span className="pulse__key-label">{STATE[s].label}</span>
                <strong>{board ? count(s) : "–"}</strong>
                {rows.length > 0 && <span className="pulse__pct">{Math.round((count(s) / rows.length) * 100)}%</span>}
              </button>
            ))}
          </div>
        </div>

        <dl className="pulse__metrics">
          <div className="pulse__metric">
            <dt>Hours today</dt>
            <dd>{board ? formatDuration(totalToday) : "–"}</dd>
            <span>Across all VAs</span>
          </div>
          <div className="pulse__metric">
            <dt>Avg per VA</dt>
            <dd>{board ? formatDuration(workedToday ? totalToday / workedToday : 0) : "–"}</dd>
            <span>
              {workedToday} VA{workedToday === 1 ? "" : "s"} clocked time today
            </span>
          </div>
          <div className="pulse__metric">
            <dt>Clients covered</dt>
            <dd>{board ? clientsNow : "–"}</dd>
            <span>Being worked on right now</span>
          </div>
        </dl>
      </section>

      <div className="card card--flat board">
        <div className="course-toolbar status-toolbar">
          <div className="filter-track" role="group" aria-label="Filter by status">
            {(["all", ...STATES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={cn("filter-pill", f !== "all" && `tone-${STATE[f].tone}`)}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f !== "all" && <span className="filter-pill__dot" aria-hidden="true" />}
                {f === "all" ? "All VAs" : STATE[f].label}
                <span className="filter-pill__count">{f === "all" ? rows.length : count(f)}</span>
              </button>
            ))}
          </div>
          <div className="course-toolbar__tools">
            <SearchBox label="Search VAs" placeholder="Search VAs, clients, notes" value={search} onChange={setSearch} />
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "list"} aria-label="List view" title="List view" onClick={() => setView("list")}>
                <Icon name="textLong" size={15} />
              </button>
              <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => setView("grid")}>
                <Icon name="grid" size={15} />
              </button>
            </div>
          </div>
        </div>

        <LoadState query={query} loadingText="Loading VA status…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className="board__empty-icon tone-green" aria-hidden="true">
                <Icon name="pulse" size={18} />
              </span>
              <span className="text-strong">
                {!rows.length
                  ? "No VAs yet"
                  : q
                    ? `No matches for “${search.trim()}”`
                    : `No VAs ${filter === "offline" ? "offline" : filter === "on_break" ? "on a break" : "working"} right now`}
              </span>
              <span className="text-small">{rows.length ? "Try another filter." : "Add VAs from People › VAs; they clock in from Time tracker in their portal."}</span>
            </div>
          ) : view === "list" ? (
            <div className="roster" role="table" aria-label="VA status">
              <div className="roster__head" role="row">
                <span role="columnheader">VA</span>
                <span role="columnheader">Current activity</span>
                <span role="columnheader">In status</span>
                <span role="columnheader">Today</span>
                <span role="columnheader">Local time</span>
                <span aria-hidden="true" />
              </div>
              {STATES.map((s) => {
                const group = shown.filter((r) => r.state === s);
                if (!group.length) return null;
                return (
                  <div key={s} role="rowgroup" className={`roster__group tone-${STATE[s].tone}`}>
                    <div className="roster__group-title">
                      <span className="status-chip__dot" aria-hidden="true" />
                      {STATE[s].group}
                      <span className="roster__group-count">{group.length}</span>
                    </div>
                    {group.map((r) => (
                      <RosterRow key={r.vaId} row={r} now={now} worked={live(r)} onOpen={() => open(r)} />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="status-grid">
              {shown.map((r) => (
                <StatusCard key={r.vaId} row={r} now={now} worked={live(r)} onOpen={() => open(r)} />
              ))}
            </div>
          )}
        </LoadState>
      </div>
    </div>
  );
}

type RowProps = { row: VaStatusRow; now: number; worked: number; onOpen: () => void };

/** What they're doing, in a line: client and note, or when they were last around. */
function Activity({ row: r, now }: { row: VaStatusRow; now: number }) {
  if (r.state === "offline") {
    return (
      <span className="roster__activity is-muted">
        <span className="text-small">{r.lastSeenAt ? `Last seen ${formatRelative(r.lastSeenAt, new Date(now))}` : "Hasn’t clocked in yet"}</span>
      </span>
    );
  }
  const client = clientOf(r);
  return (
    <span className="roster__activity">
      <span className="roster__client">
        <Icon name={r.state === "working" ? "briefcase" : "clock"} size={13} />
        {r.state === "on_break" ? "Paused" : client ? "" : "Working"}
        {client && <strong>{client}</strong>}
      </span>
      {r.shift?.note && <span className="roster__note">{r.shift.note}</span>}
    </span>
  );
}

function sinceSeconds(r: VaStatusRow, now: number) {
  return r.since ? (now - new Date(r.since).getTime()) / 1000 : 0;
}

function TodayBar({ worked }: { worked: number }) {
  return (
    <span className="today-bar" title={`${formatDuration(worked)} of an 8-hour day`}>
      <span className="today-bar__value">{formatDuration(worked)}</span>
      <span className="today-bar__track">
        <span style={{ width: `${Math.min(100, (worked / DAY_SECONDS) * 100)}%` }} />
      </span>
    </span>
  );
}

function RosterRow({ row: r, now, worked, onOpen }: RowProps) {
  const s = STATE[r.state];
  return (
    <button type="button" role="row" className={cn("roster__row", `is-${r.state}`)} onClick={onOpen}>
      <span role="cell" className="roster__va">
        <span className="presence">
          <Avatar name={r.name} tone={avatarTone(r.vaId)} size="md" />
          <span className="presence__dot" aria-hidden="true" />
        </span>
        <span className="stack stack--2 u-minw0">
          <span className="roster__name">{r.name}</span>
          <span className="text-small u-truncate">{r.headline || r.email}</span>
        </span>
      </span>
      <span role="cell">
        <Activity row={r} now={now} />
      </span>
      <span role="cell" className="roster__since">
        {r.state === "offline" ? (
          <span className="text-small">—</span>
        ) : (
          <>
            <strong>{formatDuration(sinceSeconds(r, now))}</strong>
            <span className="text-small">{s.label.toLowerCase()}</span>
          </>
        )}
      </span>
      <span role="cell">
        <TodayBar worked={worked} />
      </span>
      <span role="cell" className="roster__local" title={r.timezone}>
        {localTime(now, r.timezone)}
      </span>
      <span className="roster__chev" aria-hidden="true">
        <Icon name="chevronRight" size={15} />
      </span>
    </button>
  );
}

function StatusCard({ row: r, now, worked, onOpen }: RowProps) {
  const s = STATE[r.state];
  return (
    <button type="button" className={cn("status-card", `is-${r.state}`, `tone-${s.tone}`)} onClick={onOpen}>
      <span className="status-card__head">
        <span className="presence">
          <Avatar name={r.name} tone={avatarTone(r.vaId)} size="md" />
          <span className="presence__dot" aria-hidden="true" />
        </span>
        <span className="stack stack--2 u-grow u-minw0">
          <span className="roster__name">{r.name}</span>
          <span className="text-small u-truncate">{r.headline || r.email}</span>
        </span>
        <span className="status-chip">
          <span className="status-chip__dot" aria-hidden="true" />
          {s.label}
          {r.state !== "offline" && <span className="status-chip__time">{formatDuration(sinceSeconds(r, now))}</span>}
        </span>
      </span>
      <Activity row={r} now={now} />
      <span className="status-card__foot">
        <TodayBar worked={worked} />
        <span className="status-card__local" title={r.timezone}>
          <Icon name="globe" size={12} /> {localTime(now, r.timezone)}
        </span>
      </span>
    </button>
  );
}
