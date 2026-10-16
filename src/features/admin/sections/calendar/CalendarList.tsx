"use client";

import { useState, type CSSProperties } from "react";
import { Toggle } from "@/components/ui";
import type { BookingCalendar } from "@/data/admin";
import { cn, copyToClipboard } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";
import { BookingPreview } from "./BookingPreview";

export const bookingLink = (cal: BookingCalendar) => `book.[yourdomain].com/${cal.slug}`;

/** Booking calendars (event types) with a live preview of the booking page. */
export function CalendarList() {
  const { state, update } = useAdmin();
  const [previewId, setPreviewId] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const scheduledThisWeek = state.contacts.filter((c) => c.stage === "booked" && c.day && ["Wed", "Thu", "Fri"].includes(c.day)).length;
  const preview = state.calendars.find((c) => c.id === previewId);

  const toggle = (id: string) =>
    update((s) => ({ calendars: s.calendars.map((c) => (c.id === id ? { ...c, on: !c.on } : c)) }));

  return (
    <div className="page-stack">
      {preview && <BookingPreview key={preview.id} calendar={preview} onClose={() => setPreviewId("")} />}

      <div className="calendar-grid">
        {state.calendars.map((cal) => (
          <article key={cal.id} className={cn("calendar-card", !cal.on && "calendar-card--off")} style={{ "--cal": cal.color } as CSSProperties}>
            <div className="calendar-card__stripe" />
            <div className="calendar-card__body">
              <div className="cluster cluster--between cluster--nowrap">
                <div className="stack stack--4">
                  <h3 className="calendar-card__name">{cal.name}</h3>
                  <span className="text-muted">
                    {cal.dur} min · {cal.loc}
                  </span>
                </div>
                <Toggle label="Turn calendar on or off" checked={cal.on} onChange={() => toggle(cal.id)} />
              </div>
              <span className="calendar-card__link">{bookingLink(cal)}</span>
              <span className="text-small">
                {cal.id === "discovery" ? scheduledThisWeek : 0} upcoming · {cal.on ? "Taking bookings" : "Turned off"}
              </span>
            </div>
            <div className="calendar-card__actions">
              <button
                type="button"
                className="calendar-card__action calendar-card__action--cyan"
                onClick={() => {
                  copyToClipboard(`https://${bookingLink(cal)}`);
                  setCopiedId(cal.id);
                }}
              >
                {copiedId === cal.id ? "Link copied" : "Copy link"}
              </button>
              <button type="button" className="calendar-card__action" onClick={() => setPreviewId(cal.id)}>
                Preview booking page
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
