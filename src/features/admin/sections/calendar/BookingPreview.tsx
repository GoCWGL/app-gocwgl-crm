"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { BUSY_TIMES, WEEK_DAYS, type BookingCalendar } from "@/data/admin";
import { formatTime12, toMinutes, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";
import { bookingLink } from "./CalendarList";

const DOW_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const FIRST_OF_MONTH_OFFSET = (new Date(2026, 9, 1).getDay() + 6) % 7;

/** What a client sees on the public booking page for October 2026. */
export function BookingPreview({ calendar, onClose }: { calendar: BookingCalendar; onClose: () => void }) {
  const { state } = useAdmin();
  const [date, setDate] = useState(0);
  const [time, setTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const hours = calendar.hours ?? state.availability;
  const availabilityOn = (day: number) => hours.find((a) => a.d === WEEKDAYS_SHORT[new Date(2026, 9, day).getDay()]);

  const bookedTimes = (day: number) =>
    state.contacts
      .filter((c) => c.stage === "booked" && c.day && WEEK_DAYS.find(([d]) => d === c.day)?.[1] === String(day))
      .map((c) => c.time);

  const busyTimes = (day: number) =>
    Object.entries(state.calendarConnections).flatMap(([id, conn]) =>
      conn.connected && conn.conflicts ? (BUSY_TIMES[id]?.[day] ?? []) : [],
    );

  const slots: string[] = [];
  if (date) {
    const a = availabilityOn(date)!;
    const taken = [...bookedTimes(date), ...busyTimes(date)];
    for (let m = toMinutes(a.start); m + calendar.dur <= toMinutes(a.end); m += 30) {
      const label = formatTime12(m);
      if (!taken.includes(label)) slots.push(label);
    }
  }

  const dateText = date
    ? `${WEEKDAYS[new Date(2026, 9, date).getDay()]}, October ${date}`
    : calendar.on
      ? "Pick a date"
      : "This calendar is turned off";

  return (
    <section className="booking-preview" aria-label="Booking page preview">
      <div className="booking-preview__bar">
        <span className="field__label">Booking page preview · what your client sees at {bookingLink(calendar)}</span>
        <Button size="sm" onClick={onClose}>
          Close preview
        </Button>
      </div>
      <div className="booking-preview__body">
        <div className="booking-preview__info">
          <span className="u-muted u-semibold">[Your Name]</span>
          <h2 className="booking-preview__title">{calendar.name}</h2>
          <span className="booking-preview__meta">
            <Icon name="clock" />
            {calendar.dur} min
          </span>
          <span className="booking-preview__meta">
            <Icon name="video" />
            {calendar.loc}
          </span>
          <p className="text-body u-muted">{calendar.desc}</p>
        </div>

        <div className="booking-preview__calendar">
          <h3 className="section-title">Select a Date &amp; Time</h3>
          <div className="cluster cluster--between">
            <span className="card-title">October 2026</span>
            <span className="text-small">Pacific Time (US &amp; Canada)</span>
          </div>
          <div className="month-grid">
            {DOW_HEADERS.map((d) => (
              <span key={d} className="month-grid__dow">
                {d}
              </span>
            ))}
            {Array.from({ length: FIRST_OF_MONTH_OFFSET }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const open = calendar.on && day >= 14 && !!availabilityOn(day)?.on;
              return (
                <div className="month-grid__cell" key={day}>
                  {open ? (
                    <button
                      type="button"
                      className="month-grid__day"
                      aria-pressed={date === day}
                      aria-label={`October ${day}`}
                      onClick={() => {
                        setDate(day);
                        setTime("");
                        setConfirmed(false);
                      }}
                    >
                      {day}
                    </button>
                  ) : (
                    <span className="month-grid__day month-grid__day--off">{day}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="booking-preview__slots">
          <span className="card-title">{dateText}</span>
          {confirmed && (
            <div className="notice notice--success u-strong">
              Booked for {time}. The client gets a confirmation email and appears in Clients and Pipeline.
            </div>
          )}
          <div className="slot-list">
            {slots.map((slot) => (
              <div className="cluster cluster--6 cluster--nowrap" key={slot}>
                <button
                  type="button"
                  className={cn("slot", time === slot && "slot--selected")}
                  onClick={() => {
                    setTime(slot);
                    setConfirmed(false);
                  }}
                >
                  {slot}
                </button>
                {time === slot && (
                  <Button variant="primary" size="lg" className="u-grow" onClick={() => setConfirmed(true)}>
                    Confirm
                  </Button>
                )}
              </div>
            ))}
            {!!date && slots.length === 0 && <span className="text-muted">No open times on this day.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
