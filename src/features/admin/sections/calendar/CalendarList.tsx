"use client";

import { useState, type CSSProperties } from "react";
import { FormError, LoadState, Toggle } from "@/components/ui";
import { bookingUrl } from "@/features/public/links";
import { cn, copyToClipboard } from "@/lib/utils";
import type { BookingOut, CalendarOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { useBookings, useCalendars, useUpdateCalendar } from "@/utils/hooks/useCalendar";
import { useMe } from "@/utils/hooks/useUsers";
import { BookingPreview } from "./BookingPreview";
import { CalendarEmbedModal } from "./CalendarEmbedModal";
import { EditCalendarDrawer } from "./EditCalendarDrawer";

/** The public booking page in this app (/book/{slug}). */
export const bookingLink = (cal: Pick<CalendarOut, "slug">) => bookingUrl(cal.slug);

const isLive = (b: BookingOut) => !/cancel/i.test(b.status);

/** Booking calendars (event types) with a live preview of the booking page. */
export function CalendarList() {
  const canWrite = canWriteCrm(useMe().data);
  const calendars = useCalendars();
  const update = useUpdateCalendar();
  // Upcoming = the next 7 days, fixed once per visit so the query key stays stable.
  const [range] = useState(() => {
    const now = new Date();
    return { start: now.toISOString(), end: new Date(now.getTime() + 7 * 864e5).toISOString() };
  });
  const bookings = useBookings(range).data ?? [];
  const [previewId, setPreviewId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [editId, setEditId] = useState("");
  const [embedId, setEmbedId] = useState("");

  const list = calendars.data ?? [];
  const preview = list.find((c) => c.id === previewId);
  const editing = list.find((c) => c.id === editId);
  const embedding = list.find((c) => c.id === embedId);

  return (
    <div className="page-stack">
      {preview && <BookingPreview key={preview.id} calendar={preview} onClose={() => setPreviewId("")} />}
      {editing && <EditCalendarDrawer key={`edit-${editing.id}`} calendar={editing} onClose={() => setEditId("")} />}
      {embedding && <CalendarEmbedModal key={`embed-${embedding.id}`} calendar={embedding} onClose={() => setEmbedId("")} />}
      <FormError error={update.error} />

      <LoadState query={calendars} isEmpty={!list.length} empty="No calendars yet. Create one with “+ New calendar”.">
        <div className="calendar-grid">
          {list.map((cal) => {
            const upcoming = bookings.filter((b) => b.calendarId === cal.id && isLive(b)).length;
            return (
              <article key={cal.id} className={cn("calendar-card", !cal.isActive && "calendar-card--off")} style={{ "--cal": cal.color } as CSSProperties}>
                <div className="calendar-card__stripe" />
                <div className="calendar-card__body">
                  <div className="cluster cluster--between cluster--nowrap">
                    <div className="stack stack--4">
                      <h3 className="calendar-card__name">{cal.name}</h3>
                      <span className="text-muted">
                        {cal.durationMin} min · {cal.location}
                      </span>
                    </div>
                    {canWrite && (
                      <Toggle
                        label="Turn calendar on or off"
                        checked={cal.isActive}
                        onChange={(on) => update.mutate({ id: cal.id, body: { isActive: on } })}
                      />
                    )}
                  </div>
                  <span className="calendar-card__link">{bookingLink(cal)}</span>
                  <span className="text-small">
                    {upcoming} upcoming · {cal.isActive ? "Taking bookings" : "Turned off"}
                    {cal.hours && " · Custom hours"}
                  </span>
                </div>
                <div className="calendar-card__actions">
                  {canWrite && (
                    <button type="button" className="calendar-card__action" onClick={() => setEditId(cal.id)}>
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="calendar-card__action calendar-card__action--cyan"
                    onClick={() => {
                      copyToClipboard(bookingLink(cal));
                      setCopiedId(cal.id);
                    }}
                  >
                    {copiedId === cal.id ? "Link copied" : "Copy link"}
                  </button>
                  <button type="button" className="calendar-card__action" onClick={() => setEmbedId(cal.id)}>
                    Embed
                  </button>
                  <button type="button" className="calendar-card__action" onClick={() => setPreviewId(cal.id)}>
                    Preview
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </LoadState>
    </div>
  );
}
