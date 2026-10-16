"use client";

import { Badge } from "@/components/ui";
import { WEEK_DAYS } from "@/data/admin";
import type { Tone } from "@/lib/tones";
import { useAdmin } from "../../state/AdminContext";

const DAY_ORDER: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

/** Wednesday is "today" in the sample data. */
function dayStatus(day: string): { label: string; tone: Tone } {
  if (day === "Wed") return { label: "Today", tone: "amber" };
  return DAY_ORDER[day] < 2 ? { label: "Completed", tone: "slate" } : { label: "Upcoming", tone: "green" };
}

export function ScheduledCalls() {
  const { state } = useAdmin();
  const booked = state.contacts.filter((c) => c.stage === "booked");
  const scheduled = booked.filter((c) => c.day);
  const unscheduled = booked.filter((c) => !c.day);

  const days = WEEK_DAYS.map(([dow, date]) => ({
    label: `${dow}, Oct ${date}${dow === "Wed" ? " · Today" : ""}`,
    status: dayStatus(dow),
    items: scheduled.filter((c) => c.day === dow),
  })).filter((d) => d.items.length);

  return (
    <div className="card-row">
      <section className="card schedule">
        {days.map((day) => (
          <div key={day.label}>
            <h3 className="schedule__day">{day.label}</h3>
            {day.items.map((c) => (
              <div className="list-row" key={c.id}>
                <span className="schedule__time">
                  <span className="schedule__dot" aria-hidden="true" />
                  {c.time}
                </span>
                <div className="stack stack--2 u-grow">
                  <span className="u-strong">{c.name}</span>
                  <span className="text-small">Discovery Call · {c.email}</span>
                </div>
                <Badge tone={day.status.tone} size="lg">
                  {day.status.label}
                </Badge>
              </div>
            ))}
          </div>
        ))}
        {days.length === 0 && <p className="text-muted">No calls scheduled this week.</p>}
      </section>

      <section className="card card--flat">
        <h3 className="card-title">Needs a time</h3>
        <p className="text-muted">Marked “Call booked” in the pipeline but no time picked yet.</p>
        <div>
          {unscheduled.map((c) => (
            <div className="list-row u-semibold" key={c.id}>
              {c.name} <span className="u-muted">· {c.email}</span>
            </div>
          ))}
        </div>
        {unscheduled.length === 0 && <span className="text-muted">Everyone booked has a time.</span>}
      </section>
    </div>
  );
}
