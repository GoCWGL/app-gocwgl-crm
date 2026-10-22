"use client";

import { useState, type ReactNode } from "react";
import { Button, ErrorState, Icon, Loading } from "@/components/ui";
import { MONTHS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { PublicCalendarOut } from "@/utils/api/models";
import { isoDateIn, todayIso } from "@/utils/format/dates";
import { usePublicSlots } from "@/utils/hooks/useCalendar";
import { ZonePicker } from "./ZonePicker";
import { browserZone, businessDays, dayIsOpen } from "./zones";

/** Weeks start on Sunday. */
const DOW_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "2:00 PM" in the calendar's time zone, so slots match the days and the zone label shown. */
export const slotTime = (slot: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot));

type BookingWidgetProps = {
  slug: string;
  /** The open weekdays, booking window and business zone come from the public calendar (not the admin's copy). */
  info: Pick<PublicCalendarOut, "name" | "durationMin" | "location" | "description"> &
    Partial<Pick<PublicCalendarOut, "openHours" | "bookableUntil" | "timezone">>;
  /** Off: no days can be picked. */
  active: boolean;
  /** The business zone until the calendar's own arrives (the API sends it with the calendar and the slots). */
  timeZone?: string;
  /** The zone the visitor views times in (default: their device's). Pass both to keep it when the widget remounts. */
  viewZone?: string;
  onViewZoneChange?: (zone: string) => void;
  /** Extra content under the calendar details (errors, notes). */
  aside?: ReactNode;
  /** Shown above the slots, e.g. the preview's "this is only a preview" note. */
  notice?: ReactNode;
  onConfirm: (slot: string, timeZone: string) => void;
  /** Clears the preview's notice when the visitor picks something else. */
  onChange?: () => void;
};

/**
 * Date and time picker for a booking calendar (live slots from /public/booking/{slug}). Days without hours, past
 * days and days past the booking window are grayed out. Times show in the zone the visitor picks under the dates;
 * a visitor's day can span two business days, so both are asked for.
 */
export function BookingWidget({
  slug,
  info,
  active,
  timeZone = "",
  viewZone: viewZoneProp,
  onViewZoneChange,
  aside,
  notice,
  onConfirm,
  onChange,
}: BookingWidgetProps) {
  const businessZone = info.timezone || timeZone || browserZone();
  const [ownZone, setOwnZone] = useState(() => browserZone(businessZone));
  const viewZone = viewZoneProp ?? ownZone;
  const today = todayIso(viewZone);
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "YYYY-MM"
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [firstDay, secondDay = ""] = date ? businessDays(date, viewZone, businessZone) : [""];
  const firstQuery = usePublicSlots(active ? slug : "", firstDay);
  const secondQuery = usePublicSlots(active ? slug : "", secondDay);
  const limits = { viewZone, businessZone, openHours: info.openHours, bookableUntil: info.bookableUntil };

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstOffset = new Date(y, m - 1, 1).getDay(); // Sunday = 0
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const slots = [...new Set([...(firstQuery.data?.slots ?? []), ...(secondDay ? (secondQuery.data?.slots ?? []) : [])])]
    .filter((slot) => isoDateIn(new Date(slot), viewZone) === date)
    .sort();
  const fetching = firstQuery.isFetching || (!!secondDay && secondQuery.isFetching);
  const failed = firstQuery.isError ? firstQuery : secondDay && secondQuery.isError ? secondQuery : null;
  const loaded = firstQuery.isSuccess && (!secondDay || secondQuery.isSuccess);

  const pickZone = (zone: string) => {
    setOwnZone(zone);
    onViewZoneChange?.(zone);
    setDate("");
    setTime("");
    onChange?.();
  };

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
            const open = active && dayIsOpen(day, limits);
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
        <ZonePicker value={viewZone} businessZone={businessZone} onChange={pickZone} />
      </div>

      <div className="booking-preview__slots">
        <span className="card-title">{dateText}</span>
        {notice}
        {/* Keyed so the times fade in again when the day or the zone changes. */}
        <div className="slot-list" key={`${date}|${viewZone}`}>
          {fetching && <Loading inline text="Finding open times…" />}
          {failed && <ErrorState error={failed.error} inline />}
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
                {slotTime(slot, viewZone)}
              </button>
              {time === slot && (
                <Button variant="primary" size="lg" className="u-grow" onClick={() => onConfirm(slot, viewZone)}>
                  Confirm
                </Button>
              )}
            </div>
          ))}
          {!!date && loaded && !fetching && slots.length === 0 && <span className="text-muted">No open times on this day.</span>}
        </div>
      </div>
    </div>
  );
}
