"use client";

import { useState } from "react";
import { Button, ErrorState, Icon, Loading } from "@/components/ui";
import { MONTHS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalendarOut } from "@/utils/api/models";
import { formatTime, getTimeZone, todayIso } from "@/utils/format/dates";
import { usePublicCalendar, usePublicSlots } from "@/utils/hooks/useCalendar";
import { bookingLink } from "./CalendarList";

const DOW_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n: number) => String(n).padStart(2, "0");

/** What a client sees on the public booking page (live data from /public/booking/{slug}). */
export function BookingPreview({ calendar, onClose }: { calendar: CalendarOut; onClose: () => void }) {
  const today = todayIso();
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "YYYY-MM"
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const page = usePublicCalendar(calendar.isActive ? calendar.slug : "");
  const slotsQuery = usePublicSlots(calendar.isActive ? calendar.slug : "", date);
  const info = page.data ?? { name: calendar.name, durationMin: calendar.durationMin, location: calendar.location, description: calendar.description };

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstOffset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const slots = slotsQuery.data?.slots ?? [];
  const zone = slotsQuery.data?.timezone ?? getTimeZone();

  const dateText = date
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`))
    : calendar.isActive
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
          <h2 className="booking-preview__title">{info.name}</h2>
          <span className="booking-preview__meta">
            <Icon name="clock" />
            {info.durationMin} min
          </span>
          <span className="booking-preview__meta">
            <Icon name="video" />
            {info.location}
          </span>
          <p className="text-body u-muted">{info.description}</p>
          {page.isError && <ErrorState error={page.error} inline />}
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
              const open = calendar.isActive && day >= today;
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
                        setConfirmed(false);
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
          {confirmed && (
            <div className="notice notice--success u-strong">
              Preview only: a client who confirms {formatTime(time)} gets a confirmation email and appears in Clients and Pipeline.
            </div>
          )}
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
                    setConfirmed(false);
                  }}
                >
                  {formatTime(slot)}
                </button>
                {time === slot && (
                  <Button variant="primary" size="lg" className="u-grow" onClick={() => setConfirmed(true)}>
                    Confirm
                  </Button>
                )}
              </div>
            ))}
            {!!date && slotsQuery.isSuccess && slots.length === 0 && <span className="text-muted">No open times on this day.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
