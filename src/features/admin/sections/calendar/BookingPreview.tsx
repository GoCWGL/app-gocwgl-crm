"use client";

import { useState } from "react";
import { Button, ErrorState } from "@/components/ui";
import { BookingWidget, slotTime } from "@/features/booking/BookingWidget";
import type { CalendarOut } from "@/utils/api/models";
import { getTimeZone } from "@/utils/format/dates";
import { usePublicCalendar } from "@/utils/hooks/useCalendar";
import { bookingLink } from "./CalendarList";

/** What a client sees on the public booking page (live data from /public/booking/{slug}). */
export function BookingPreview({ calendar, onClose }: { calendar: CalendarOut; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState("");
  const page = usePublicCalendar(calendar.isActive ? calendar.slug : "");
  const info = page.data ?? calendar;

  return (
    <section className="booking-preview" aria-label="Booking page preview">
      <div className="booking-preview__bar">
        <span className="field__label">Booking page preview · what your client sees at {bookingLink(calendar)}</span>
        <Button size="sm" onClick={onClose}>
          Close preview
        </Button>
      </div>
      <BookingWidget
        slug={calendar.slug}
        info={info}
        active={calendar.isActive}
        timeZone={getTimeZone()}
        aside={page.isError && <ErrorState error={page.error} inline />}
        notice={
          confirmed && (
            <div className="notice notice--success u-strong">
              Preview only: a client who confirms {confirmed} gets a confirmation email and appears in Clients and Pipeline.
            </div>
          )
        }
        onConfirm={(slot, zone) => setConfirmed(slotTime(slot, zone))}
        onChange={() => setConfirmed("")}
      />
    </section>
  );
}
