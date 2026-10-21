"use client";

import { useState, type ReactNode } from "react";
import { Button, ErrorState, Icon, Loading } from "@/components/ui";
import { MONTHS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { PublicCalendarOut } from "@/utils/api/models";
import { todayIso } from "@/utils/format/dates";
import { usePublicSlots } from "@/utils/hooks/useCalendar";

const DOW_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "2:00 PM" in the calendar's time zone, so slots match the days and the zone label shown. */
export const slotTime = (slot: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot));

/** "Wednesday, October 21 at 2:00 PM" in the calendar's time zone. */
export const slotDateTime = (slot: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(slot),
  );

type BookingWidgetProps = {
  slug: string;
  info: Pick<PublicCalendarOut, "name" | "durationMin" | "location" | "description">;
  /** Off: no days can be picked. */
  active: boolean;
  /** Zone to show before the first slots load (the API sends the business zone with the slots). */
  timeZone?: string;
  /** Extra content under the calendar details (errors, notes). */
  aside?: ReactNode;
  /** Shown above the slots, e.g. the preview's "this is only a preview" note. */
  notice?: ReactNode;
  onConfirm: (slot: string, timeZone: string) => void;
  /** Clears the preview's notice when the visitor picks something else. */
  onChange?: () => void;
};

/** Date and time picker for a booking calendar (live slots from /public/booking/{slug}). */
export function BookingWidget({ slug, info, active, timeZone = "", aside, notice, onConfirm, onChange }: BookingWidgetProps) {
  const today = todayIso();
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "YYYY-MM"
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const slotsQuery = usePublicSlots(active ? slug : "", date);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstOffset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const slots = slotsQuery.data?.slots ?? [];
  const zone = slotsQuery.data?.timezone ?? timeZone;

  const dateText = date
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`))
    : active
      ? "Pick a date"
      : "This calendar is turned off";

  return (
    <div className="booking-preview__body">
      <div className="booking-preview__info">
        <h2 className="booking-preview__title">{info.name}</h2>
        <span className="booking-preview__meta">
          <Icon name="clock" />
          {info.durationMin} min
        </span>
        {info.location && (
          <span className="booking-preview__meta">
            <Icon name="video" />
            {info.location}
          </span>
        )}
        {info.description && <p className="text-body u-muted">{info.description}</p>}
        {aside}
      </div>

      <div className="booking-preview__calendar">
        <h3 className="section-title">Select a Date &amp; Time</h3>
        <div className="cluster cluster--between">
          <span className="cluster cluster--6 cluster--nowrap">
            <Button size="sm" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => shift(-1)}>
              ‹
            </Button>
            <span className="card-title">
              {MONTHS[m - 1]} {y}
            </span>
            <Button size="sm" aria-label="Next month" onClick={() => shift(1)}>
              ›
            </Button>
          </span>
          <span className="text-small">{zone}</span>
        </div>
        <div className="month-grid">
          {DOW_HEADERS.map((d) => (
            <span key={d} className="month-grid__dow">
              {d}
            </span>
          ))}
          {Array.from({ length: firstOffset }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = `${month}-${pad(i + 1)}`;
            const open = active && day >= today;
            return (
              <div className="month-grid__cell" key={day}>
                {open ? (
                  <button
                    type="button"
                    className="month-grid__day"
                    aria-pressed={date === day}
                    aria-label={day}
                    onClick={() => {
                      setDate(day);
                      setTime("");
                      onChange?.();
                    }}
                  >
                    {i + 1}
                  </button>
                ) : (
                  <span className="month-grid__day month-grid__day--off">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="booking-preview__slots">
        <span className="card-title">{dateText}</span>
        {notice}
        <div className="slot-list">
          {slotsQuery.isFetching && <Loading inline text="Finding open times…" />}
          {slotsQuery.isError && <ErrorState error={slotsQuery.error} inline />}
          {slots.map((slot) => (
            <div className="cluster cluster--6 cluster--nowrap" key={slot}>
              <button
                type="button"
                className={cn("slot", time === slot && "slot--selected")}
                onClick={() => {
                  setTime(slot);
                  onChange?.();
                }}
              >
                {slotTime(slot, zone)}
              </button>
              {time === slot && (
                <Button variant="primary" size="lg" className="u-grow" onClick={() => onConfirm(slot, zone)}>
                  Confirm
                </Button>
              )}
            </div>
          ))}
          {!!date && slotsQuery.isSuccess && slots.length === 0 && <span className="text-muted">No open times on this day.</span>}
        </div>
      </div>
    </div>
  );
}
