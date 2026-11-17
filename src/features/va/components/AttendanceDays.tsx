"use client";

import { useState } from "react";
import { Avatar, Badge } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { AttendanceDay } from "../lib/attendance";
import { dayHeading, hms, rangeFor, RANGES, type RangeKey } from "../lib/time";
import { minutesLabel, statusBadge, timeAt } from "../lib/attendance";

export type AttendanceRow = AttendanceDay & { who: { id: string; name: string } };

/** Attendance history: one row per work day, with the schedule, clock-in / out, time and how it went. */
export function AttendanceDays({ rows, whoLabel, empty }: { rows: AttendanceRow[]; whoLabel: string; empty: string }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="card card--table att-days">
      <div className="table-scroll">
        <table className="data-table att-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>{whoLabel}</th>
              <th>Scheduled</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th className="is-num">Worked</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const badge = statusBadge(r);
              return (
                <tr key={`${r.who.id}-${r.day}`} className={`is-${r.status}`}>
                  <td className="att-table__day">{dayHeading(r.day)}</td>
                  <td>
                    <span className="att-who">
                      <Avatar name={r.who.name} tone={avatarTone(r.who.id)} size="sm" />
                      {r.who.name}
                    </span>
                  </td>
                  <td className="att-table__muted">
                    {r.scheduledStartAt && r.scheduledEndAt ? `${timeAt(r.scheduledStartAt)} – ${timeAt(r.scheduledEndAt)}` : "—"}
                  </td>
                  <td>{r.clockInAt ? timeAt(r.clockInAt) : "—"}</td>
                  <td>
                    {r.clockedIn ? (
                      <Badge tone="green" dot size="xs">
                        Clocked in
                      </Badge>
                    ) : r.clockOutAt ? (
                      <span className="stack stack--2">
                        {timeAt(r.clockOutAt)}
                        {r.forgotClockOut ? (
                          <span className="text-tiny">Forgot to clock out</span>
                        ) : r.leftEarlyMinutes ? (
                          <span className="text-tiny">Left {minutesLabel(r.leftEarlyMinutes)} early</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="is-num">{r.workedSeconds ? hms(r.workedSeconds) : "—"}</td>
                  <td>
                    <Badge tone={badge.tone} dot size="xs">
                      {badge.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The date-range presets for attendance history (weeks start on Monday). */
export const ATTENDANCE_RANGES = RANGES.filter((r) => r.value !== "today");

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The picked range as inclusive API dates, plus the [start, end) dates for its label. */
export function useAttendanceRange(initial: RangeKey = "week") {
  const [range, setRange] = useState<RangeKey>(initial);
  const r = rangeFor(range);
  const last = new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate() - 1);
  return { range, setRange, start: iso(r.start), end: iso(last), dates: r };
}
