"use client";

import { useEffect, useState } from "react";
import { Badge, Button, ConfirmDialog, Icon, LoadState, SegmentedControl, StatGrid } from "@/components/ui";
import type { VaAttendanceClient } from "@/utils/api/models";
import { useAttendanceClockIn, useAttendanceClockOut, useMyAttendance } from "@/utils/hooks/useAttendance";
import { ATTENDANCE_RANGES, AttendanceDays, useAttendanceRange } from "../components/AttendanceDays";
import { useVaAccess } from "../lib/access";
import { browserZone, minutesLabel, scheduleLabel, statusBadge, timeAt, whenLabel } from "../lib/attendance";
import { clientLabel, hms, rangeLabel } from "../lib/time";

/**
 * VA portal › Attendance: clock in when you start work for a client and clock out when you stop. Each client sets
 * your schedule; clocking in after its start (plus a few minutes' grace) shows them you were late.
 */
export function AttendanceSection() {
  const { ready } = useVaAccess();
  const { range, setRange, start, end, dates } = useAttendanceRange();
  const data = useMyAttendance(start, end, ready);
  const clients = data.data?.clients ?? [];
  const summary = data.data?.summary;
  // Running clock-ins tick forward between refreshes.
  const now = useNow();
  const since = Math.max(0, (now - data.dataUpdatedAt) / 1000);

  return (
    <div className="page-stack">
      <LoadState
        query={data}
        loadingText="Loading your attendance…"
        isEmpty={!clients.length}
        empty="No clients yet. Once GoCWGL places you with a client, you clock in and out for them here."
      >
        <section className="att-clients" aria-label="Clock in for a client">
          {clients.map((c) => (
            <ClientClock key={c.client.id} row={c} since={since} now={now} />
          ))}
        </section>

        <div className="cp-toolbar">
          <h2 className="att-heading">Your work days</h2>
          <span className="u-spacer" />
          <SegmentedControl label="Date range" options={ATTENDANCE_RANGES} value={range} onChange={setRange} size="sm" />
          <span className="cp-toolbar__range">
            <Icon name="calendar" size={14} /> {rangeLabel(dates)}
          </span>
        </div>

        {summary && (
          <StatGrid
            items={[
              { label: "On time", value: String(summary.onTime), tone: "green" },
              { label: "Late", value: String(summary.late), tone: summary.late ? "red" : "slate" },
              { label: "Absent", value: String(summary.absent), tone: summary.absent ? "red" : "slate" },
              { label: "Time clocked in", value: hms(summary.workedSeconds), tone: "cyan" },
            ]}
          />
        )}

        <AttendanceDays
          whoLabel="Client"
          rows={(data.data?.days ?? []).map((d) => ({ ...d, who: { id: d.client.id, name: clientLabel(d.client) } }))}
          empty="No work days in this range yet."
        />
      </LoadState>
    </div>
  );
}

function ClientClock({ row, since, now }: { row: VaAttendanceClient; since: number; now: number }) {
  const { readOnly } = useVaAccess();
  const clockIn = useAttendanceClockIn();
  const clockOut = useAttendanceClockOut();
  const { client, schedule, today } = row;
  const name = clientLabel(client);
  const badge = statusBadge(today);
  const busy = clockIn.isPending || clockOut.isPending;
  // Clocking in or out asks first, so a stray click can't end (or start) the work day.
  const [confirm, setConfirm] = useState<"in" | "out" | null>(null);
  const close = () => {
    setConfirm(null);
    clockIn.reset();
    clockOut.reset();
  };
  const endsAt = today.scheduledEndAt ? new Date(today.scheduledEndAt).getTime() : 0;
  const earlyBy = today.clockedIn && endsAt > now ? Math.round((endsAt - now) / 60_000) : 0;
  const local = browserZone();
  // The client's hours in the VA's own time zone, when they differ.
  const yourTime =
    schedule && schedule.timezone !== local && today.scheduledStartAt && today.scheduledEndAt
      ? `${timeAt(today.scheduledStartAt)} – ${timeAt(today.scheduledEndAt)} your time`
      : "";

  return (
    <article className={`card att-clock is-${today.clockedIn && today.status !== "late" ? "in" : today.status}`}>
      <header className="att-clock__head">
        <div className="stack stack--2 u-grow">
          <strong className="att-clock__name">{name}</strong>
          {client.company && client.name && <span className="text-small">{client.name}</span>}
        </div>
        {today.clockedIn ? (
          <Badge tone="green" dot>
            Clocked in
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
        {schedule ? (
          <span className="stack stack--2">
            <span>{scheduleLabel(schedule)}</span>
            {yourTime && <span className="text-tiny">{yourTime}</span>}
          </span>
        ) : (
          <span>No schedule yet. Your client sets it; until then, clock-ins aren’t marked late.</span>
        )}
      </div>

      {today.clockedIn && today.clockInAt ? (
        <div className="att-clock__now">
          <span className="att-clock__timer">{hms(today.workedSeconds + since)}</span>
          <span className="text-small">
            Since {timeAt(today.clockInAt)}
            {today.status === "late" && ` · ${minutesLabel(today.minutesLate ?? 0)} late`}
            {today.status === "on_time" && " · on time"}
          </span>
        </div>
      ) : today.clockOutAt ? (
        <p className="text-small att-clock__note">
          Clocked out at {timeAt(today.clockOutAt)} after {hms(today.workedSeconds)}. Clocked out by mistake? Clock back in.
        </p>
      ) : today.nextShiftAt ? (
        <p className="text-small att-clock__note">Next shift {whenLabel(today.nextShiftAt)}.</p>
      ) : null}

      <footer className="att-clock__foot">
        {today.clockedIn ? (
          <Button variant="outline" size="lg" disabled={busy || readOnly} onClick={() => setConfirm("out")}>
            <Icon name="pause" size={15} /> {clockOut.isPending ? "Clocking out…" : "Clock out"}
          </Button>
        ) : (
          <Button variant="primary" size="lg" disabled={busy || readOnly} onClick={() => setConfirm("in")}>
            <Icon name="play" size={15} /> {clockIn.isPending ? "Clocking in…" : today.clockOutAt ? "Clock back in" : "Clock in"}
          </Button>
        )}
      </footer>

      {confirm === "out" && (
        <ConfirmDialog
          title={`Clock out for ${name}?`}
          confirmLabel="Clock out"
          icon="pause"
          pending={clockOut.isPending}
          error={clockOut.error}
          onClose={close}
          onConfirm={() => clockOut.mutate(client.id, { onSuccess: () => setConfirm(null) })}
        >
          <p>
            You’ve been clocked in for <b>{hms(today.workedSeconds + since)}</b>
            {today.clockInAt && ` since ${timeAt(today.clockInAt)}`}. This ends your work day for {name}.
          </p>
          {earlyBy > 0 && today.scheduledEndAt && (
            <p className="text-small">
              Your shift ends at {timeAt(today.scheduledEndAt)}. Clocking out now shows your client you left {minutesLabel(earlyBy)} early.
            </p>
          )}
        </ConfirmDialog>
      )}
      {confirm === "in" && (
        <ConfirmDialog
          title={`${today.clockOutAt ? "Clock back in" : "Clock in"} for ${name}?`}
          confirmLabel={today.clockOutAt ? "Clock back in" : "Clock in"}
          icon="play"
          pending={clockIn.isPending}
          error={clockIn.error}
          onClose={close}
          onConfirm={() => clockIn.mutate(client.id, { onSuccess: () => setConfirm(null) })}
        >
          <p>
            {today.clockOutAt
              ? `You clocked out at ${timeAt(today.clockOutAt)}. Clocking back in continues today’s work day for ${name}.`
              : `This starts your work day for ${name} at ${timeAt(new Date(now).toISOString())}. Your client sees when you clock in.`}
          </p>
          {today.status === "missing" && (
            <p className="text-small">Your shift started {minutesLabel(today.minutesLate ?? 0)} ago, so this clock-in counts as late.</p>
          )}
        </ConfirmDialog>
      )}
    </article>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
