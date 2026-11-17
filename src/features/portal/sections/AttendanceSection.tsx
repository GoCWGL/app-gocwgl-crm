"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Field, FormError, Icon, Input, LoadState, Modal, SegmentedControl, Select, StatGrid } from "@/components/ui";
import { TIME_ZONES } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { ATTENDANCE_RANGES, AttendanceDays, useAttendanceRange } from "@/features/va/components/AttendanceDays";
import { browserZone, minutesLabel, scheduleLabel, STATUS_FILTERS, statusBadge, timeAt, WEEKDAYS, whenLabel, zoneShort } from "@/features/va/lib/attendance";
import { downloadCsv, hms, rangeLabel } from "@/features/va/lib/time";
import type { ClientAttendanceVa } from "@/utils/api/models";
import { useClearSchedule, useSetSchedule, useTeamAttendance } from "@/utils/hooks/useAttendance";
import { usePortal } from "../state/PortalContext";

/**
 * Client portal › VA › Attendance: when each VA clocked in and out for you, and whether they were on time for the
 * schedule you set. A day with a shift and no clock-in shows as absent.
 */
export function AttendanceSection() {
  const { readOnly } = usePortal();
  const { range, setRange, start, end, dates } = useAttendanceRange();
  const data = useTeamAttendance(start, end);
  const vas = data.data?.vas ?? [];
  const [vaId, setVaId] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["value"]>("");
  const [editing, setEditing] = useState<ClientAttendanceVa | null>(null);

  const days = (data.data?.days ?? []).filter((d) => (!vaId || d.va.id === vaId) && (!status || d.status === status));
  const summary = data.data?.summary;
  const inNow = vas.filter((v) => v.today.clockedIn).length;
  const lateToday = vas.filter((v) => v.today.status === "late" || v.today.status === "missing").length;

  const exportCsv = () =>
    downloadCsv(
      `va-attendance-${start}.csv`,
      ["Day", "VA", "Scheduled start", "Scheduled end", "Clock in", "Clock out", "Minutes late", "Left early (min)", "Worked (h)", "Status"],
      days.map((d) => [
        d.day,
        d.va.name,
        d.scheduledStartAt ? timeAt(d.scheduledStartAt) : "",
        d.scheduledEndAt ? timeAt(d.scheduledEndAt) : "",
        d.clockInAt ? timeAt(d.clockInAt) : "",
        d.clockOutAt ? timeAt(d.clockOutAt) : d.clockedIn ? "Clocked in" : "",
        d.minutesLate ?? "",
        d.leftEarlyMinutes ?? "",
        (d.workedSeconds / 3600).toFixed(2),
        statusBadge(d).label,
      ]),
    );

  return (
    <div className="page-stack">
      <LoadState
        query={data}
        loadingText="Loading your team’s attendance…"
        isEmpty={!vas.length}
        empty="No VA is working with you yet. Once GoCWGL places a VA with your business, their clock-ins show up here."
      >
        <StatGrid
          items={[
            { label: "Clocked in now", value: `${inNow} of ${vas.length}`, tone: inNow ? "green" : "slate" },
            { label: "Late or missing today", value: String(lateToday), tone: lateToday ? "red" : "slate" },
            { label: "Late days in range", value: String(summary?.late ?? 0), tone: summary?.late ? "orange" : "slate" },
            { label: "Absent days in range", value: String(summary?.absent ?? 0), tone: summary?.absent ? "red" : "slate" },
          ]}
        />

        <section className="att-clients" aria-label="Your VAs today">
          {vas.map((v) => (
            <VaToday key={v.va.id} row={v} onEdit={readOnly ? undefined : () => setEditing(v)} />
          ))}
        </section>

        <div className="cp-toolbar">
          <h2 className="att-heading">Attendance history</h2>
          <span className="u-spacer" />
          <SegmentedControl label="Date range" options={ATTENDANCE_RANGES} value={range} onChange={setRange} size="sm" />
          <span className="cp-toolbar__range">
            <Icon name="calendar" size={14} /> {rangeLabel(dates)}
          </span>
        </div>
        <div className="cp-toolbar cp-toolbar--filters">
          <Select size="sm" aria-label="VA" value={vaId} onChange={(e) => setVaId(e.target.value)} options={vas.map((v) => ({ value: v.va.id, label: v.va.name }))} placeholder="All VAs" />
          <Select size="sm" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={STATUS_FILTERS.filter((f) => f.value)} placeholder="All days" />
          {summary && summary.late > 0 && <span className="text-small">Late by {minutesLabel(summary.averageMinutesLate)} on average.</span>}
          <span className="u-spacer" />
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!days.length}>
            <Icon name="download" size={14} /> Export
          </Button>
        </div>

        <AttendanceDays
          whoLabel="VA"
          rows={days.map((d) => ({ ...d, who: d.va }))}
          empty={vas.some((v) => v.schedule) ? "No work days match these filters." : "No work days yet. Set a schedule for your VAs to track late and absent days."}
        />
        <p className="text-small cp-note">
          <Icon name="clock" size={13} /> Times are in your time zone. Updates every minute.
        </p>
      </LoadState>

      {editing && <ScheduleModal row={editing} fallbackZone={data.data?.timezone ?? "UTC"} onClose={() => setEditing(null)} />}
    </div>
  );
}

function VaToday({ row, onEdit }: { row: ClientAttendanceVa; onEdit?: () => void }) {
  const { va, schedule, today } = row;
  const badge = statusBadge(today);
  // Times on the card are in the schedule's time zone, like the schedule line.
  const tz = today.timezone;
  const at = (iso: string) => `${timeAt(iso, tz)}${tz === browserZone() ? "" : ` ${zoneShort(tz)}`}`;

  return (
    <article className={`card att-clock is-${today.clockedIn && today.status !== "late" ? "in" : today.status}`}>
      <header className="att-clock__head">
        <Avatar name={va.name} tone={avatarTone(va.id)} />
        <div className="stack stack--2 u-grow">
          <strong className="att-clock__name">{va.name}</strong>
          {va.headline && <span className="text-small">{va.headline}</span>}
        </div>
        {today.clockedIn ? (
          <Badge tone={today.status === "late" ? "orange" : "green"} dot>
            {today.status === "late" ? `In · ${minutesLabel(today.minutesLate ?? 0)} late` : "Clocked in"}
          </Badge>
        ) : (
          today.status !== "off" && (
            <Badge tone={badge.tone} dot>
              {badge.label}
            </Badge>
          )
        )}
      </header>

      <div className="att-clock__schedule">
        <Icon name="calendarCheck" size={14} />
        <span>{schedule ? scheduleLabel(schedule) : "No schedule set. Set one to see if they’re on time."}</span>
      </div>

      {today.clockInAt ? (
        <p className="text-small att-clock__note">
          Clocked in at <b>{at(today.clockInAt)}</b>
          {today.clockOutAt && !today.clockedIn && (
            <>
              , out at <b>{at(today.clockOutAt)}</b> ({hms(today.workedSeconds)})
              {today.leftEarlyMinutes ? `, ${minutesLabel(today.leftEarlyMinutes)} early` : ""}
            </>
          )}
          .
        </p>
      ) : today.status === "missing" || today.status === "absent" ? (
        <p className="text-small att-clock__note">Their shift started at {today.scheduledStartAt ? at(today.scheduledStartAt) : "—"} and they haven’t clocked in.</p>
      ) : today.nextShiftAt ? (
        <p className="text-small att-clock__note">Next shift {whenLabel(today.nextShiftAt)}.</p>
      ) : null}

      {onEdit && (
        <footer className="att-clock__foot">
          <Button variant={schedule ? "outline" : "primary"} size="sm" onClick={onEdit}>
            <Icon name={schedule ? "edit" : "plus"} size={14} /> {schedule ? "Edit schedule" : "Set schedule"}
          </Button>
        </footer>
      )}
    </article>
  );
}

const GRACE = [0, 5, 10, 15, 30].map((m) => ({ value: String(m), label: m ? `${m} minutes` : "None" }));

/** When a VA should work for you: their start and end time, work days, your time zone and the grace time. */
function ScheduleModal({ row, fallbackZone, onClose }: { row: ClientAttendanceVa; fallbackZone: string; onClose: () => void }) {
  const { notify } = usePortal();
  const s = row.schedule;
  const [timezone, setTimezone] = useState(s?.timezone ?? fallbackZone);
  const [startTime, setStartTime] = useState(s?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(s?.endTime ?? "17:00");
  const [days, setDays] = useState<number[]>(s?.workDays ?? [0, 1, 2, 3, 4]);
  const [grace, setGrace] = useState(String(s?.graceMinutes ?? 5));
  const [confirmClear, setConfirmClear] = useState(false);
  const save = useSetSchedule();
  const clear = useClearSchedule();
  const zones = TIME_ZONES.some((z) => z.value === timezone) ? TIME_ZONES : [{ value: timezone, label: timezone }, ...TIME_ZONES];
  const overnight = endTime <= startTime;
  const error = !days.length ? "Pick at least one work day." : startTime === endTime ? "The shift needs to end at a different time than it starts." : "";

  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    save.mutate(
      { vaId: row.va.id, body: { timezone, startTime, endTime, workDays: days, graceMinutes: Number(grace) } },
      { onSuccess: () => (notify(`Schedule saved for ${row.va.name}.`), onClose()) },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="va-schedule"
      kicker="ATTENDANCE"
      title={`${row.va.name}’s schedule`}
      subtitle="When they should work for you. Clocking in after the start plus the grace time counts as late."
      width={560}
      onSubmit={submit}
      footer={
        <>
          {s && (
            <Button variant="soft" onClick={() => setConfirmClear(true)}>
              Remove schedule
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!!error || save.isPending}>
            {save.isPending ? "Saving…" : "Save schedule"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        <div className="att-form-row">
          <Field label="Starts" htmlFor="att-start">
            <Input id="att-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="Ends" htmlFor="att-end" hint={overnight && startTime !== endTime ? "Ends the next day" : undefined}>
            <Input id="att-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </Field>
        </div>
        <Field label="Work days">
          <div className="att-days-pick" role="group" aria-label="Work days">
            {WEEKDAYS.map((label, i) => (
              <button key={label} type="button" className={cn("att-day-chip", days.includes(i) && "is-on")} aria-pressed={days.includes(i)} onClick={() => toggle(i)}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <div className="att-form-row">
          <Field label="Time zone" htmlFor="att-zone">
            <Select id="att-zone" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={zones} />
          </Field>
          <Field label="Grace time" htmlFor="att-grace" hint="Still on time within this">
            <Select id="att-grace" value={grace} onChange={(e) => setGrace(e.target.value)} options={GRACE} />
          </Field>
        </div>
        {error && <span className="form-error" role="alert">{error}</span>}
        <FormError error={save.error} />
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Remove this schedule?"
          confirmLabel="Remove schedule"
          icon="trash"
          pending={clear.isPending}
          error={clear.error}
          onClose={() => setConfirmClear(false)}
          onConfirm={() => clear.mutate(row.va.id, { onSuccess: () => (notify(`Schedule removed for ${row.va.name}.`), onClose()) })}
        >
          {row.va.name} can still clock in, but their days won’t be marked late or absent any more. Days they clocked in keep
          their on-time or late mark.
        </ConfirmDialog>
      )}
    </Modal>
  );
}
