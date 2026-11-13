"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Dropdown, Field, FormError, Icon, IconButton, Input, LoadState, Modal, SegmentedControl, Select, Toggle } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNow } from "@/lib/duration";
import { qk } from "@/utils/hooks/keys";
import { cn } from "@/lib/utils";
import type { MyClientOut, MyShiftOut, ShiftOut } from "@/utils/api/models";
import { codeSuggestions, EntryLabelChips, ProjectCodeInput, TagPicker, type TagColor, type TimeTag } from "../components/EntryLabels";
import { useVaAccess } from "../lib/access";
import { formatCentsExact } from "@/utils/format/money";
import {
  useAddEntry,
  useAddClientTag,
  useClockIn,
  useClockOut,
  useDeleteEntry,
  useMyClients,
  useMyShift,
  useTimeEntries,
  useToggleBreak,
  useUpdateEntry,
} from "@/utils/hooks/useShifts";
import {
  INTERNAL_COLOR,
  INTERNAL_LABEL,
  RANGES,
  WORK_CATEGORIES,
  clientColors,
  clientLabel,
  dayHeading,
  dayKey,
  downloadCsv,
  entryClient,
  fromLocalParts,
  hms,
  rangeFor,
  rangeLabel,
  timeOf,
  toLocalParts,
  todayKey,
  type RangeKey,
} from "../lib/time";

/** 6300 → "1h 45m". */
const hm = (secs: number) => `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}m`;

/** "" = internal work (no client). */
const INTERNAL = "internal";
type ClientFilter = "all" | typeof INTERNAL | string;

/** VA portal › Time tracker: a running timer and the time log by day, with earnings. Clients see the same time in their VA tracker. */
export function TimeTrackerSection() {
  // The VA themself, or staff in "View as VA" (owners and admins can run the VA's timer; other staff only look).
  const { ready, readOnly } = useVaAccess();
  return <Tracker enabled={ready} readOnly={readOnly} />;
}

function Tracker({ enabled, readOnly }: { enabled: boolean; readOnly: boolean }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [editing, setEditing] = useState<ShiftOut | "new" | null>(null);
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const clients = useMyClients(enabled);
  const shift = useMyShift(enabled);
  const entries = useTimeEntries(range.start.toISOString(), range.end.toISOString(), enabled);
  const now = useNow(1000);
  const colors = useMemo(() => clientColors(clients.data?.clients), [clients.data]);

  // Running time keeps counting between refreshes (not during a break).
  const running = shift.data?.shift ?? null;
  const ticking = shift.data?.state === "working";
  const entryDrift = entries.dataUpdatedAt ? Math.max(0, (now - entries.dataUpdatedAt) / 1000) : 0;
  const live = (e: ShiftOut) => {
    const extra = !e.endedAt && ticking && e.id === running?.id ? entryDrift : 0;
    const secs = e.workedSeconds + extra;
    const cents = e.billable && e.rateCents ? e.earningsCents + (extra * e.rateCents) / 3600 : e.earningsCents;
    return { secs, cents };
  };

  const all = entries.data ?? [];
  const codes = useMemo(() => codeSuggestions(entries.data ?? []), [entries.data]);
  // Tag colors per client, for the chips on each entry.
  const tagColors = useMemo(() => {
    const m = new Map<string, Map<string, TagColor>>();
    (clients.data?.clients ?? []).forEach((c) => m.set(c.id, new Map(c.tags.map((t) => [t.name, t.color as TagColor]))));
    return m;
  }, [clients.data]);
  const shown = all.filter((e) => filter === "all" || (filter === INTERNAL ? !e.client : e.client?.id === filter));
  const totals = shown.reduce(
    (t, e) => {
      const { secs, cents } = live(e);
      t.secs += secs;
      t.cents += cents;
      if (e.billable) t.billable += secs;
      return t;
    },
    { secs: 0, cents: 0, billable: 0 },
  );

  // Today, from the timer's own data (whatever range is picked).
  const shiftDrift = shift.dataUpdatedAt && ticking ? Math.max(0, (now - shift.dataUpdatedAt) / 1000) : 0;
  const todaySecs = (shift.data?.workedTodaySeconds ?? 0) + shiftDrift;
  const todayCents =
    (shift.data?.today ?? []).reduce((t, e) => t + e.earningsCents, 0) +
    (running?.billable && running.rateCents ? (shiftDrift * running.rateCents) / 3600 : 0);

  // Split by client for the bar.
  const split = new Map<string, { label: string; color: string; secs: number }>();
  for (const e of all) {
    const key = e.client?.id ?? INTERNAL;
    const row = split.get(key) ?? {
      label: entryClient(e),
      color: e.client ? (colors.get(e.client.id) ?? "#94a3b8") : INTERNAL_COLOR,
      secs: 0,
    };
    row.secs += live(e).secs;
    split.set(key, row);
  }
  const splitRows = [...split.entries()].sort((a, b) => b[1].secs - a[1].secs);
  const splitTotal = splitRows.reduce((t, [, r]) => t + r.secs, 0);

  // Days, newest first.
  const days = new Map<string, ShiftOut[]>();
  for (const e of shown) {
    const k = dayKey(new Date(e.startedAt));
    days.set(k, [...(days.get(k) ?? []), e]);
  }

  const filterLabel =
    filter === "all" ? "All clients" : filter === INTERNAL ? INTERNAL_LABEL : clientLabel(clients.data?.clients.find((c) => c.id === filter));
  const filterHours = (key: ClientFilter) =>
    hm(all.filter((e) => key === "all" || (key === INTERNAL ? !e.client : e.client?.id === key)).reduce((t, e) => t + live(e).secs, 0));

  const exportCsv = () =>
    downloadCsv(
      `time-${dayKey(range.start)}-to-${dayKey(new Date(range.end.getTime() - 1))}.csv`,
      ["Date", "Start", "End", "Client", "Type", "Project code", "Tags", "Category", "Description", "Tasks completed", "Billable", "Hours", "Rate", "Earnings"],
      [...shown]
        .reverse()
        .map((e) => [
          dayKey(new Date(e.startedAt)),
          timeOf(e.startedAt),
          e.endedAt ? timeOf(e.endedAt) : "running",
          entryClient(e),
          e.kind === "countdown" ? "Countdown" : "Timer",
          e.projectCode,
          e.tags.join(", "),
          e.category,
          e.note,
          (e.tasksDone ?? []).join("; "),
          e.billable ? "yes" : "no",
          (live(e).secs / 3600).toFixed(2),
          e.rateCents ? (e.rateCents / 100).toFixed(2) : "",
          (live(e).cents / 100).toFixed(2),
        ]),
    );

  const clientItems = [
    {
      value: "all",
      label: "All clients",
      meta: filterHours("all"),
    },
    ...(clients.data?.clients ?? [])
      .filter((c) => c.active || all.some((e) => e.client?.id === c.id))
      .map((c) => ({
        value: c.id,
        label: `${clientLabel(c)}${c.active ? "" : " (past)"}`,
        meta: filterHours(c.id),
      })),
    {
      value: INTERNAL,
      label: INTERNAL_LABEL,
      meta: filterHours(INTERNAL),
    },
  ];

  return (
    <div className="page-stack tt">
      <TimerBar
        readOnly={readOnly}
        shift={shift.data}
        clients={clients.data?.clients ?? []}
        colors={colors}
        now={now}
        fetchedAt={shift.dataUpdatedAt}
        onManual={() => setEditing("new")}
        codes={codes}
      />

      <section className="tt2-log" aria-labelledby="tt2-log-title">
        <header className="tt2-log__head">
          <div className="stack stack--2">
            <h2 id="tt2-log-title" className="tt2-log__title">
              Time log
            </h2>
            <span className="text-small">
              {rangeLabel(range)}
              {filter === "all" ? "" : ` · ${filterLabel}`}
            </span>
          </div>
          <div className="tt2-log__controls">
            <SegmentedControl label="Date range" options={RANGES} value={rangeKey} onChange={setRangeKey} size="sm" />
            <Select
              size="sm"
              aria-label="Show time for"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={clientItems.map((c) => ({ value: c.value, label: `${c.label} · ${c.meta}` }))}
            />
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!shown.length}>
              <Icon name="download" size={14} /> Export
            </Button>
          </div>
        </header>

        <div className="tt2-stats">
          <div className="tt2-stat">
            <span className="tt2-stat__label">Today</span>
            <strong className="tt2-stat__value">{hms(todaySecs)}</strong>
            <span className="tt2-stat__note">{formatCentsExact(todayCents)} earned</span>
          </div>
          <div className="tt2-stat">
            <span className="tt2-stat__label">{RANGES.find((r) => r.value === rangeKey)?.label ?? ""}</span>
            <strong className="tt2-stat__value">{hms(totals.secs)}</strong>
            <span className="tt2-stat__note">{shown.length} {shown.length === 1 ? "entry" : "entries"}</span>
          </div>
          <div className="tt2-stat">
            <span className="tt2-stat__label">Billable</span>
            <strong className="tt2-stat__value">{hms(totals.billable)}</strong>
            <span className="tt2-stat__note">Counts toward earnings</span>
          </div>
          <div className="tt2-stat tt2-stat--money">
            <span className="tt2-stat__label">Earnings</span>
            <strong className="tt2-stat__value">{formatCentsExact(totals.cents)}</strong>
            <span className="tt2-stat__note">Billable hours × client rate</span>
          </div>
        </div>

        {splitTotal > 0 && (
          <div className="tt-split tt2-split">
            <div className="tt-split__bar" role="img" aria-label={splitRows.map(([, r]) => `${r.label} ${hms(r.secs)}`).join(", ")}>
              {splitRows.map(([k, r]) => (
                <span key={k} style={{ flexGrow: r.secs, background: r.color }} title={`${r.label} · ${hms(r.secs)}`} />
              ))}
            </div>
            <ul className="tt-split__legend">
              {splitRows.map(([k, r]) => (
                <li key={k}>
                  <span className="tt-dot" style={{ background: r.color }} />
                  {r.label} · <strong>{hm(r.secs)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <LoadState query={entries} loadingText="Loading your time…">
        {days.size === 0 ? (
          <div className="card tt-empty">
            <Icon name="clock" size={22} />
            <span className="text-strong">No time logged {filter === "all" ? "" : `for ${filterLabel} `}in this range</span>
            <span className="text-small">Press Start when you begin working, or add time you forgot with the clock button.</span>
          </div>
        ) : (
          [...days.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([day, list]) => {
              const dayTotals = list.reduce(
                (t, e) => ({
                  secs: t.secs + live(e).secs,
                  cents: t.cents + live(e).cents,
                }),
                { secs: 0, cents: 0 },
              );
              return (
                <section key={day} className="card tt-day">
                  <header className="tt-day__head">
                    <strong>{dayHeading(day)}</strong>
                    <span className="tt-day__totals">
                      <span className="text-small">Total:</span>
                      <strong className="tt-mono">{hms(dayTotals.secs)}</strong>
                      <span className="tt-money">{formatCentsExact(dayTotals.cents)}</span>
                    </span>
                  </header>
                  {list.map((e) => (
                    <EntryRow
                      key={e.id}
                      e={e}
                      secs={live(e).secs}
                      cents={live(e).cents}
                      color={e.client ? (colors.get(e.client.id) ?? "#94a3b8") : INTERNAL_COLOR}
                      canResume={!e.client || !!clients.data?.clients.find((c) => c.id === e.client?.id && c.active)}
                      isRunning={!e.endedAt}
                      tagColors={e.client ? tagColors.get(e.client.id) : undefined}
                      onEdit={() => setEditing(e)}
                    />
                  ))}
                </section>
              );
            })
        )}
      </LoadState>

      {editing && <EntryModal entry={editing === "new" ? null : editing} clients={clients.data?.clients ?? []} codes={codes} onClose={() => setEditing(null)} />}
    </div>
  );
}


// ---------------------------------------------------------------- The timer
function TimerBar({
  readOnly = false,
  shift,
  clients,
  colors,
  now,
  fetchedAt,
  onManual,
  codes,
}: {
  codes: string[];
  shift: MyShiftOut | undefined;
  clients: MyClientOut[];
  colors: Map<string, string>;
  now: number;
  fetchedAt: number;
  onManual: () => void;
  readOnly?: boolean;
}) {
  const active = clients.filter((c) => c.active);
  const running = shift?.shift ?? null;
  const onBreak = shift?.state === "on_break";
  const start = useClockIn();
  const stop = useClockOut();
  const pause = useToggleBreak();
  const save = useUpdateEntry();
  const addTag = useAddClientTag();
  // What the next timer will be (while stopped).
  const [note, setNote] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [category, setCategory] = useState<string>(WORK_CATEGORIES[0]);
  const [billable, setBillable] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [code, setCode] = useState("");
  // Bumped after a start so the project code box empties for the next timer.
  const [round, setRound] = useState(0);
  // Timer counts up; Countdown is project work with a set time for the day (stops by itself).
  const [mode, setMode] = useState<TimerMode>("timer");
  const [planned, setPlanned] = useState(2 * 3600);
  const [tasks, setTasksDone] = useState<string[]>([]);
  const chosenClient = clientId || active[0]?.id || INTERNAL;
  const isBillable = billable ?? chosenClient !== INTERNAL;

  const elapsed = running ? (onBreak ? running.workedSeconds : running.workedSeconds + Math.max(0, (now - fetchedAt) / 1000)) : 0;
  const shownMode: TimerMode = running ? (running.kind === "countdown" ? "countdown" : "timer") : mode;
  const plannedNow = running?.plannedSeconds ?? planned;
  const remaining = Math.max(0, plannedNow - elapsed);
  const progress = shownMode === "countdown" && running ? Math.min(1, elapsed / (plannedNow || 1)) : 0;
  // A countdown that hits zero stops on the server; reload so the page shows it stopped.
  const qc = useQueryClient();
  const finished = useRef("");
  useEffect(() => {
    if (!running || shownMode !== "countdown" || remaining > 0 || finished.current === running.id) return;
    finished.current = running.id;
    void qc.invalidateQueries({ queryKey: qk.myShift });
    void qc.invalidateQueries({ queryKey: qk.myTime });
  }, [running, shownMode, remaining, qc]);
  const shownClient = running ? (running.client?.id ?? INTERNAL) : chosenClient;
  const shownCategory = running ? running.category : category;
  const shownBillable = running ? running.billable : isBillable;
  const clientTags = (clients.find((c) => c.id === shownClient)?.tags ?? []) as TimeTag[];
  const clientName = shownClient === INTERNAL ? INTERNAL_LABEL : clientLabel(clients.find((c) => c.id === shownClient));

  const begin = (e?: FormEvent) => {
    e?.preventDefault();
    start.mutate(
      {
        contactId: chosenClient === INTERNAL ? null : chosenClient,
        note: note.trim(),
        category,
        billable: isBillable,
        tags,
        projectCode: code,
        kind: mode,
        ...(mode === "countdown" ? { plannedSeconds: planned, tasksDone: tasks } : {}),
      },
      {
        onSuccess: () => {
          setNote("");
          setTags([]);
          setCode("");
          setTasksDone([]);
          setRound((r) => r + 1);
        },
      },
    );
  };
  const change = (body: Parameters<typeof save.mutate>[0]["body"]) => running && save.mutate({ id: running.id, body });

  const color = shownClient === INTERNAL ? INTERNAL_COLOR : (colors.get(shownClient) ?? "#94a3b8");
  const pick = (v: string) =>
    running
      ? change({
          contactId: v === INTERNAL ? null : v,
          billable: v !== INTERNAL,
        })
      : (setClientId(v), setBillable(null), setTags([]));

  return (
    <form
      className={cn("tt3", running && "is-running", onBreak && "is-break", shownMode === "countdown" && "is-countdown")}
      onSubmit={running ? (e) => e.preventDefault() : begin}
    >
      <fieldset className="tt2-timer__lock" disabled={readOnly}>
        <header className="tt3__head">
          <div className="tt3-modes" role="tablist" aria-label="Timer type">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={shownMode === m.value}
                className={cn("tt3-modes__opt", shownMode === m.value && "is-on")}
                disabled={!!running}
                title={running ? "Stop the running timer to switch" : undefined}
                onClick={() => setMode(m.value)}
              >
                <Icon name={m.icon} size={14} />
                <span className="stack stack--0">
                  <strong>{m.label}</strong>
                  <span>{m.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <span className={cn("tt3__state", running && (onBreak ? "is-break" : "is-on"))}>
            <span className="tt2-pulse" aria-hidden="true" />
            {running ? (onBreak ? "On a break · paused" : `Running since ${timeOf(running.startedAt)}`) : "Ready to start"}
          </span>
          <IconButton label="Add time manually" size="sm" onClick={onManual}>
            <Icon name="plus" size={15} />
          </IconButton>
        </header>

        <div className="tt3__body">
          <div className="tt3__main">
            <ClientPicker clients={active} colors={colors} value={shownClient} running={!!running} fallback={{ label: clientName, color }} onChange={pick} />
            <label className="tt3__field">
              <span className="tt3__label">{shownMode === "countdown" ? "Project description" : "What are you working on?"}</span>
              <input
                className="tt2-timer__input"
                placeholder={shownMode === "countdown" ? "e.g. Build the new landing page" : `What are you working on${shownClient === INTERNAL ? "" : ` for ${clientName}`}?`}
                value={running ? undefined : note}
                defaultValue={running ? running.note : undefined}
                key={running?.id ?? "idle"}
                maxLength={300}
                onChange={running ? undefined : (e) => setNote(e.target.value)}
                onBlur={running ? (e) => e.target.value.trim() !== running.note && change({ note: e.target.value }) : undefined}
              />
            </label>
            <div className="tt2-timer__meta">
              <Dropdown
                label="Category"
                value={shownCategory || "Other"}
                items={WORK_CATEGORIES.map((c) => ({ value: c, label: c }))}
                onChange={(v) => (running ? change({ category: v }) : setCategory(v))}
                className="tt2-cat"
              >
                <Icon name="folder" size={13} />
                <span>{shownCategory || "No category"}</span>
              </Dropdown>
              <button
                type="button"
                className={cn("tt2-chip tt2-bill", shownBillable && "is-on")}
                aria-pressed={shownBillable}
                onClick={() => (running ? change({ billable: !running.billable }) : setBillable(!isBillable))}
              >
                <Icon name="dollar" size={13} /> {shownBillable ? "Billable" : "Not billable"}
              </button>
              <ProjectCodeInput
                key={running ? `run-${running.id}` : `idle-${round}`}
                initial={running ? running.projectCode : code}
                onCommit={(c) => (running ? change({ projectCode: c }) : setCode(c))}
                suggestions={codes}
                compact
              />
              {shownClient !== INTERNAL && (
                <TagPicker
                  options={clientTags}
                  value={running ? running.tags : tags}
                  onChange={(t) => (running ? change({ tags: t }) : setTags(t))}
                  clientName={clientName}
                  disabled={readOnly}
                  onCreate={(name) => addTag.mutateAsync({ contactId: shownClient, name }).then((t) => t.name)}
                />
              )}
            </div>
            {shownMode === "countdown" && (
              <TaskList
                key={running ? `run-${running.id}` : `idle-${round}`}
                initial={running ? (running.tasksDone ?? []) : tasks}
                onCommit={(t) => (running ? change({ tasksDone: t }) : setTasksDone(t))}
              />
            )}
          </div>

          <div className="tt3__side" style={{ ["--client" as string]: color }}>
            {shownMode === "countdown" && !running && <DurationPicker value={planned} onChange={setPlanned} />}
            <span className="tt3__clock-label">
              {shownMode === "countdown" ? (running ? `Left of ${hm(plannedNow)}` : "Countdown") : running ? "Time on this task" : "Timer"}
            </span>
            <span className={cn("tt2-clock", shownMode === "countdown" && remaining <= 300 && running && "is-low")} aria-live="off">
              {hms(shownMode === "countdown" ? (running ? remaining : planned) : elapsed)}
            </span>
            {shownMode === "countdown" && (
              <span className="tt3-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <span style={{ width: `${progress * 100}%` }} />
              </span>
            )}
            <div className="tt2-actions">
              {running && shownMode === "countdown" && (
                <Button size="sm" variant="outline" onClick={() => change({ plannedSeconds: Math.min(86_400, plannedNow + 1800) })}>
                  +30 min
                </Button>
              )}
              {running && (
                <IconButton label={onBreak ? "Back to work" : "Take a break"} size="sm" onClick={() => pause.mutate()} disabled={pause.isPending}>
                  <Icon name={onBreak ? "play" : "pause"} size={15} />
                </IconButton>
              )}
              {running ? (
                <button type="button" className="tt2-go is-stop" disabled={stop.isPending} onClick={() => stop.mutate()} aria-label="Stop">
                  <span className="tt2-go__square" aria-hidden="true" />
                  Stop
                </button>
              ) : (
                <button type="submit" className="tt2-go" disabled={start.isPending} aria-label={shownMode === "countdown" ? "Start the countdown" : "Start the timer"}>
                  <Icon name="play" size={16} />
                  {shownMode === "countdown" ? "Start countdown" : "Start"}
                </button>
              )}
            </div>
          </div>
        </div>
      </fieldset>
      <FormError error={start.error ?? stop.error ?? pause.error ?? save.error} />
    </form>
  );
}

/** "Working for": the client the timer is for. Big, first, searchable when there are many. */
function ClientPicker({
  clients,
  colors,
  value,
  running,
  fallback,
  onChange,
}: {
  clients: MyClientOut[];
  colors: Map<string, string>;
  value: string;
  running: boolean;
  /** Shown when the running entry's client is no longer on the active list. */
  fallback: { label: string; color: string };
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const options = [
    ...clients.map((c) => ({
      id: c.id,
      label: clientLabel(c),
      sub: c.company && c.name ? c.name : "",
      color: colors.get(c.id) ?? "#94a3b8",
      month: c.monthSeconds,
    })),
    {
      id: INTERNAL,
      label: INTERNAL_LABEL,
      sub: "Not billed to a client",
      color: INTERNAL_COLOR,
      month: null as number | null,
    },
  ];
  const term = q.trim().toLowerCase();
  const list = term ? options.filter((o) => `${o.label} ${o.sub}`.toLowerCase().includes(term)) : options;
  const current = options.find((o) => o.id === value) ?? {
    id: value,
    label: fallback.label,
    sub: "",
    color: fallback.color,
    month: null,
  };
  const initials = (label: string) =>
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="tt2-client" ref={box}>
      <button type="button" className="tt2-client__btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="tt2-client__tile" style={{ background: current.color }} aria-hidden="true">
          {current.id === INTERNAL ? "GO" : initials(current.label)}
        </span>
        <span className="stack stack--0 u-grow">
          <span className="tt2-client__kicker">{running ? "WORKING FOR" : "TRACK TIME FOR"}</span>
          <strong className="tt2-client__name">{current.label}</strong>
        </span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="tt2-client__menu" role="listbox" aria-label="Clients">
          {options.length > 6 && (
            <label className="tt2-client__search">
              <Icon name="search" size={14} />
              <input autoFocus placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
            </label>
          )}
          <ul>
            {list.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  className={cn("tt2-client__item", o.id === value && "is-current")}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="tt2-client__tile tt2-client__tile--sm" style={{ background: o.color }} aria-hidden="true">
                    {o.id === INTERNAL ? "GO" : initials(o.label)}
                  </span>
                  <span className="stack stack--0 u-grow">
                    <strong>{o.label}</strong>
                    {o.sub && <span className="text-tiny">{o.sub}</span>}
                  </span>
                  {o.month != null && (
                    <span className="tt2-client__hours">
                      {Math.floor(o.month / 3600)}h {Math.floor((o.month % 3600) / 60)}m this month
                    </span>
                  )}
                  {o.id === value && <Icon name="check" size={14} />}
                </button>
              </li>
            ))}
            {!list.length && <li className="tt2-client__empty">No clients match.</li>}
          </ul>
          {running && <p className="tt2-client__hint">Changing the client moves the running time to them.</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- One entry
function EntryRow({
  e,
  secs,
  cents,
  color,
  canResume,
  isRunning,
  tagColors,
  onEdit,
}: {
  tagColors?: Map<string, TagColor>;
  e: ShiftOut;
  secs: number;
  cents: number;
  color: string;
  canResume: boolean;
  isRunning: boolean;
  onEdit: () => void;
}) {
  const resume = useClockIn();
  const remove = useDeleteEntry();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={cn("tt-row", isRunning && "is-running")}>
      <span className="tt-row__what">
        <span className="tt-row__note">{e.note || <span className="u-muted">No description</span>}</span>
        <span className="tt-row__client" style={{ color: e.client ? "#7a5a00" : undefined }}>
          <span className="tt-dot" style={{ background: color }} />
          {entryClient(e)}
        </span>
        {e.category && <span className="tt-tag">{e.category}</span>}
        <EntryLabelChips tags={e.tags} projectCode={e.projectCode} colors={tagColors} />
        {e.kind === "countdown" && (
          <span className="tt-kind" title={e.plannedSeconds ? `Countdown of ${hm(e.plannedSeconds)}` : "Countdown"}>
            <Icon name="bolt" size={10} /> Countdown{e.plannedSeconds ? ` · ${hm(e.plannedSeconds)}` : ""}
          </span>
        )}
        {(e.tasksDone?.length ?? 0) > 0 && (
          <ul className="tt-tasks-done" aria-label="Tasks completed">
            {e.tasksDone!.map((t, i) => (
              <li key={i}>
                <Icon name="check" size={11} /> {t}
              </li>
            ))}
          </ul>
        )}
      </span>
      <span className={cn("tt-row__bill", e.billable && "is-on")} title={e.billable ? "Billable" : "Not billable"}>
        $
      </span>
      <span className="tt-row__range">
        {timeOf(e.startedAt)} – {e.endedAt ? timeOf(e.endedAt) : <strong className="tt-live">now</strong>}
      </span>
      <strong className="tt-row__dur">{hms(secs)}</strong>
      <span className="tt-row__money">{e.billable && e.rateCents ? formatCentsExact(cents) : "—"}</span>
      <span className="tt-row__tools">
        <IconButton label="Edit" size="sm" onClick={onEdit}>
          <Icon name="edit" size={13} />
        </IconButton>
        <IconButton
          label="Start again"
          size="sm"
          disabled={isRunning || !canResume || resume.isPending}
          onClick={() =>
            resume.mutate({
              contactId: e.client?.id ?? null,
              tags: e.tags.filter((t) => tagColors?.has(t)),
              projectCode: e.projectCode,
              note: e.note,
              category: e.category,
              billable: e.billable,
              stopRunning: true,
            })
          }
        >
          <Icon name="play" size={13} />
        </IconButton>
        {confirm ? (
          <Button size="sm" variant="danger-solid" disabled={remove.isPending} onClick={() => remove.mutate(e.id)}>
            Delete
          </Button>
        ) : (
          <IconButton label="Delete" size="sm" onClick={() => setConfirm(true)}>
            <Icon name="close" size={13} />
          </IconButton>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Add / edit an entry
function EntryModal({
  entry,
  clients,
  codes,
  onClose,
}: {
  entry: ShiftOut | null;
  clients: MyClientOut[];
  codes: string[];
  onClose: () => void;
}) {
  const add = useAddEntry();
  const save = useUpdateEntry();
  const addTag = useAddClientTag();
  const start = entry ? toLocalParts(entry.startedAt) : { day: todayKey(), time: "09:00" };
  const end = entry?.endedAt ? toLocalParts(entry.endedAt) : { day: start.day, time: "10:00" };
  const running = !!entry && !entry.endedAt;
  const [note, setNote] = useState(entry?.note ?? "");
  const [clientId, setClientId] = useState(entry ? (entry.client?.id ?? INTERNAL) : (clients.find((c) => c.active)?.id ?? INTERNAL));
  const [category, setCategory] = useState(entry?.category ?? WORK_CATEGORIES[0]);
  const [billable, setBillable] = useState(entry?.billable ?? clientId !== INTERNAL);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [projectCode, setProjectCode] = useState(entry?.projectCode ?? "");
  const [tasksDone, setTasksDone] = useState<string[]>(entry?.tasksDone ?? []);
  const client = clients.find((c) => c.id === clientId);
  const [day, setDay] = useState(start.day);
  const [from, setFrom] = useState(start.time);
  const [to, setTo] = useState(end.time);
  const busy = add.isPending || save.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const startedAt = fromLocalParts(day, from);
    // An end earlier than the start runs past midnight.
    let endedAt = fromLocalParts(day, to);
    if (endedAt <= startedAt) endedAt = new Date(new Date(endedAt).getTime() + 86_400_000).toISOString();
    const body = {
      contactId: clientId === INTERNAL ? null : clientId,
      note: note.trim(),
      category,
      billable,
      tags: clientId === INTERNAL ? [] : tags,
      projectCode,
      ...(entry?.kind === "countdown" ? { tasksDone } : {}),
      startedAt,
      ...(running ? {} : { endedAt }),
    };
    if (entry) save.mutate({ id: entry.id, body }, { onSuccess: onClose });
    else add.mutate({ ...body, endedAt }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="tt-entry"
      kicker="TIME TRACKER"
      title={entry ? "Edit time entry" : "Add time"}
      subtitle={entry ? undefined : "Log time you forgot to track."}
      width={560}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : entry ? "Save" : "Add time"}
          </Button>
        </>
      }
    >
      <div className="stack stack--14">
        <FormError error={add.error ?? save.error} />
        <Field label="What did you work on?" htmlFor="tt-note">
          <Input
            id="tt-note"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Replied to 9 new website leads"
            autoFocus
          />
        </Field>
        <div className="form-grid">
          <Field label="Client" htmlFor="tt-client">
            <Select
              id="tt-client"
              value={clientId}
              options={[
                ...clients.map((c) => ({
                  value: c.id,
                  label: `${clientLabel(c)}${c.active ? "" : " (past client)"}`,
                })),
                { value: INTERNAL, label: INTERNAL_LABEL },
              ]}
              onChange={(e) => {
                setClientId(e.target.value);
                setBillable(e.target.value !== INTERNAL);
                // Tags belong to a client: keep only the ones the new client also has.
                const next = clients.find((c) => c.id === e.target.value)?.tags.map((t) => t.name) ?? [];
                setTags((ts) => ts.filter((t) => next.includes(t)));
              }}
            />
          </Field>
          <Field label="Category" htmlFor="tt-cat">
            <Select
              id="tt-cat"
              value={category}
              options={WORK_CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
          <Field label="Project code (optional)" htmlFor="tt-code">
            <ProjectCodeInput id="tt-code" initial={projectCode} onCommit={setProjectCode} suggestions={codes} />
          </Field>
          <Field label="Tags">
            {clientId === INTERNAL ? (
              <span className="text-small">Internal work has no tags.</span>
            ) : (
              <TagPicker
                options={(client?.tags ?? []) as TimeTag[]}
                value={tags}
                onChange={setTags}
                clientName={client ? clientLabel(client) : "The client"}
                onCreate={client?.active ? (name) => addTag.mutateAsync({ contactId: clientId, name }).then((t) => t.name) : undefined}
              />
            )}
          </Field>
          {entry?.kind === "countdown" && (
            <div className="form-grid__full">
              <TaskList initial={tasksDone} onCommit={setTasksDone} />
            </div>
          )}
          <Field label="Date" htmlFor="tt-day">
            <Input id="tt-day" type="date" max={todayKey()} value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <div className="form-grid tt-times">
            <Field label="Start" htmlFor="tt-from">
              <Input id="tt-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="End" htmlFor="tt-to">
              <Input
                id="tt-to"
                type="time"
                value={running ? "" : to}
                disabled={running}
                placeholder="Running"
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <Toggle checked={billable} onChange={setBillable} label="Billable: counts toward your earnings" showLabel />
      </div>
    </Modal>
  );
}


type TimerMode = "timer" | "countdown";
const MODES: Array<{ value: TimerMode; label: string; hint: string; icon: "clock" | "bolt" }> = [
  { value: "timer", label: "Timer", hint: "Counts up as you work", icon: "clock" },
  { value: "countdown", label: "Countdown", hint: "Project time for today", icon: "bolt" },
];
const DURATIONS = [1800, 3600, 2 * 3600, 4 * 3600, 8 * 3600];

/** How long a countdown runs: quick picks, or hours and minutes. */
function DurationPicker({ value, onChange }: { value: number; onChange: (secs: number) => void }) {
  const h = Math.floor(value / 3600);
  const m = Math.round((value % 3600) / 60);
  const set = (hh: number, mm: number) => onChange(Math.min(86_400, Math.max(60, (hh || 0) * 3600 + (mm || 0) * 60)));
  return (
    <div className="tt3-duration">
      <span className="tt3__label">Time for today</span>
      <div className="tt3-duration__picks">
        {DURATIONS.map((d) => (
          <button key={d} type="button" className={cn("tt3-duration__pick", value === d && "is-on")} onClick={() => onChange(d)}>
            {d < 3600 ? `${d / 60}m` : `${d / 3600}h`}
          </button>
        ))}
      </div>
      <div className="tt3-duration__custom">
        <label>
          <input type="number" min={0} max={24} value={h} aria-label="Hours" onChange={(e) => set(Number(e.target.value), m)} />
          <span>h</span>
        </label>
        <label>
          <input type="number" min={0} max={59} step={5} value={m} aria-label="Minutes" onChange={(e) => set(h, Number(e.target.value))} />
          <span>m</span>
        </label>
      </div>
    </div>
  );
}

/** Countdown: what got done, one row each. Saves as rows change. Uncontrolled: give it a key to start over. */
function TaskList({ initial, onCommit }: { initial: string[]; onCommit: (tasks: string[]) => void }) {
  const [rows, setRows] = useState<string[]>(initial.length ? initial : [""]);
  const save = (next: string[]) => {
    const clean = next.map((x) => x.trim()).filter(Boolean);
    if (JSON.stringify(clean) !== JSON.stringify(initial)) onCommit(clean);
  };
  const add = () => setRows((r) => [...r, ""]);
  const done = rows.filter((x) => x.trim()).length;
  return (
    <div className="tt3-tasks">
      <div className="tt3-tasks__head">
        <span className="tt3__label">Tasks completed</span>
        <span className="tt3-tasks__count">{done}</span>
      </div>
      <ol className="tt3-tasks__list">
        {rows.map((t, i) => (
          <li key={i}>
            <span className="tt3-tasks__check" aria-hidden="true">
              <Icon name="check" size={11} />
            </span>
            <input
              value={t}
              maxLength={300}
              placeholder={i === 0 ? "e.g. Set up the page layout" : "Another task done"}
              aria-label={`Task ${i + 1}`}
              onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={() => save(rows)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save(rows);
                  add();
                }
              }}
            />
            {rows.length > 1 && (
              <button
                type="button"
                className="tt3-tasks__remove"
                aria-label={`Remove task ${i + 1}`}
                onClick={() => {
                  const next = rows.filter((_, j) => j !== i);
                  setRows(next);
                  save(next);
                }}
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="tt3-tasks__add" onClick={add}>
        <Icon name="plus" size={13} /> Add task
      </button>
    </div>
  );
}
