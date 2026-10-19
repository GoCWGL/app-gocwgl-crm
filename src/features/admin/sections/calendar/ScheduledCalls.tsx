"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, Field, FormError, Input, LoadState, Select } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import type { BookingOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { addDaysIso, formatFull, formatTime, getTimeZone, isoDateIn, isoToZoned, todayIso, zonedToIso } from "@/utils/format/dates";
import { useBookings, useCalendars, useCancelBooking, useCreateBooking, useUpdateBooking } from "@/utils/hooks/useCalendar";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

function dayStatus(day: string, today: string): { label: string; tone: Tone } {
  if (day === today) return { label: "Today", tone: "amber" };
  return day < today ? { label: "Completed", tone: "slate" } : { label: "Upcoming", tone: "green" };
}

const isCancelled = (b: BookingOut) => /cancel/i.test(b.status);

/** Calls from 7 days ago to 14 days ahead, grouped by day in the business time zone. */
export function ScheduledCalls() {
  const { notify } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const [range] = useState(() => {
    const now = Date.now();
    return { start: new Date(now - 7 * 864e5).toISOString(), end: new Date(now + 14 * 864e5).toISOString() };
  });
  const bookings = useBookings(range);
  const calendars = useCalendars().data ?? [];
  const booked = useAllContacts({ stage: "booked" }).data ?? [];
  const cancel = useCancelBooking();
  const [editing, setEditing] = useState<{ booking?: BookingOut; contactId?: string } | null>(null);

  const tz = getTimeZone();
  const today = todayIso();
  const live = (bookings.data ?? []).filter((b) => !isCancelled(b)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const unscheduled = booked.filter((c) => !c.callAt && !live.some((b) => b.contactId === c.id && b.startsAt >= range.start));
  const calName = (id: string) => calendars.find((c) => c.id === id)?.name ?? "Call";

  const days = [...new Set(live.map((b) => isoDateIn(new Date(b.startsAt), tz)))].map((day) => ({
    day,
    label: `${formatFull(day)}${day === today ? " · Today" : ""}`,
    status: dayStatus(day, today),
    items: live.filter((b) => isoDateIn(new Date(b.startsAt), tz) === day),
  }));

  return (
    <div className="card-row">
      <section className="card schedule">
        <FormError error={cancel.error} />
        <LoadState query={bookings} loadingText="Loading calls…">
          {days.map((day) => (
            <div key={day.day}>
              <h3 className="schedule__day">{day.label}</h3>
              {day.items.map((b) => (
                <div className="list-row" key={b.id}>
                  <span className="schedule__time">
                    <span className="schedule__dot" aria-hidden="true" />
                    {formatTime(b.startsAt)}
                  </span>
                  <div className="stack stack--2 u-grow">
                    <span className="u-strong">{b.name || b.email}</span>
                    <span className="text-small">
                      {calName(b.calendarId)} · {b.email}
                    </span>
                  </div>
                  <Badge tone={day.status.tone} size="lg">
                    {day.status.label}
                  </Badge>
                  {canWrite && day.day >= today && (
                    <>
                      <Button size="sm" onClick={() => setEditing({ booking: b })}>
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(b.id, { onSuccess: () => notify(`Call with ${b.name || b.email} cancelled.`) })}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
          {days.length === 0 && <p className="text-muted">No calls scheduled in the next two weeks.</p>}
        </LoadState>
      </section>

      <section className="card card--flat">
        <h3 className="card-title">Needs a time</h3>
        <p className="text-muted">Marked “Call booked” in the pipeline but no time picked yet.</p>
        <div>
          {unscheduled.map((c) => (
            <div className="list-row u-semibold" key={c.id}>
              <span className="u-grow">
                {contactName(c)} <span className="u-muted">· {c.email}</span>
              </span>
              {canWrite && calendars.length > 0 && (
                <Button size="sm" variant="primary" onClick={() => setEditing({ contactId: c.id })}>
                  Book a time
                </Button>
              )}
            </div>
          ))}
        </div>
        {unscheduled.length === 0 && <span className="text-muted">Everyone booked has a time.</span>}
        {editing && (
          <BookingForm
            key={editing.booking?.id ?? editing.contactId}
            booking={editing.booking}
            contactId={editing.contactId}
            onDone={(message) => {
              setEditing(null);
              if (message) notify(message);
            }}
          />
        )}
      </section>
    </div>
  );
}

/** Book a call for a contact, or move an existing booking. */
function BookingForm({ booking, contactId, onDone }: { booking?: BookingOut; contactId?: string; onDone: (message?: string) => void }) {
  const calendars = useCalendars().data ?? [];
  const create = useCreateBooking();
  const update = useUpdateBooking();
  const tz = getTimeZone();
  const start = booking ? isoToZoned(booking.startsAt, tz) : { day: addDaysIso(todayIso(), 1), time: "10:00" };
  const [calendarId, setCalendarId] = useState(booking?.calendarId ?? calendars.find((c) => c.isActive)?.id ?? calendars[0]?.id ?? "");
  const [day, setDay] = useState(start.day);
  const [time, setTime] = useState(start.time);
  const [outside, setOutside] = useState(false);
  const pending = create.isPending || update.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const startsAt = zonedToIso(day, time, tz);
    if (booking) {
      update.mutate({ id: booking.id, body: { startsAt, allowOutsideHours: outside } }, { onSuccess: () => onDone("Call rescheduled.") });
    } else {
      create.mutate({ calendarId, startsAt, contactId, allowOutsideHours: outside }, { onSuccess: () => onDone("Call booked.") });
    }
  };

  return (
    <form className="inset stack stack--10" onSubmit={submit}>
      <span className="kicker">{booking ? "RESCHEDULE CALL" : "BOOK A CALL"}</span>
      {!booking && (
        <Field label="Calendar" htmlFor="bk-cal">
          <Select id="bk-cal" value={calendarId} options={calendars.map((c) => ({ value: c.id, label: c.name }))} onChange={(e) => setCalendarId(e.target.value)} />
        </Field>
      )}
      <div className="form-grid form-grid--narrow">
        <Field label="Day" htmlFor="bk-day">
          <Input id="bk-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Time" htmlFor="bk-time">
          <Input id="bk-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Checkbox label="Allow a time outside working hours" checked={outside} onChange={() => setOutside(!outside)} />
      <FormError error={create.error ?? update.error} />
      <div className="cluster cluster--end">
        <Button onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending || !calendarId}>
          {pending ? "Saving…" : booking ? "Move call" : "Book call"}
        </Button>
      </div>
    </form>
  );
}
