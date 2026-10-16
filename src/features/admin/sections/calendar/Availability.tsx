"use client";

import type { DayAvailability } from "@/data/admin";
import { useAdmin } from "../../state/AdminContext";

/** Weekly working hours used by every calendar without its own custom hours. */
export function Availability() {
  const { state, update } = useAdmin();

  return (
    <section className="card availability">
      <div className="stack stack--2">
        <h2 className="card-title">Weekly hours</h2>
        <span className="text-small">Used by all calendars without custom hours · Pacific Time (US &amp; Canada)</span>
      </div>
      <HoursEditor hours={state.availability} onChange={(availability) => update({ availability })} />
    </section>
  );
}

/** One row per weekday: on/off checkbox plus start and end times. */
export function HoursEditor({
  hours,
  onChange,
}: {
  hours: DayAvailability[];
  onChange: (hours: DayAvailability[]) => void;
}) {
  const patch = (i: number, p: Partial<DayAvailability>) => onChange(hours.map((a, k) => (k === i ? { ...a, ...p } : a)));

  return (
    <div>
      {hours.map((a, i) => (
        <div className="list-row" key={a.d}>
          <label className="availability__day">
            <input type="checkbox" checked={a.on} onChange={() => patch(i, { on: !a.on })} />
            {a.d}
          </label>
          {a.on ? (
            <div className="cluster cluster--8 cluster--nowrap">
              <input className="input input--auto" type="time" aria-label={`${a.d} start time`} value={a.start} onChange={(e) => patch(i, { start: e.target.value })} />
              <span className="u-muted">–</span>
              <input className="input input--auto" type="time" aria-label={`${a.d} end time`} value={a.end} onChange={(e) => patch(i, { end: e.target.value })} />
            </div>
          ) : (
            <span className="text-muted">Unavailable</span>
          )}
        </div>
      ))}
    </div>
  );
}
