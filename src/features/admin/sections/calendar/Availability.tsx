"use client";

import type { DayAvailability } from "@/data/admin";
import { useAdmin } from "../../state/AdminContext";

/** Weekly working hours shared by every booking calendar. */
export function Availability() {
  const { state, update } = useAdmin();

  const patch = (i: number, p: Partial<DayAvailability>) =>
    update((s) => ({ availability: s.availability.map((a, k) => (k === i ? { ...a, ...p } : a)) }));

  return (
    <section className="card availability">
      <div className="stack stack--2">
        <h2 className="card-title">Weekly hours</h2>
        <span className="text-small">Shared by all your calendars · Pacific Time (US &amp; Canada)</span>
      </div>
      <div>
        {state.availability.map((a, i) => (
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
    </section>
  );
}
