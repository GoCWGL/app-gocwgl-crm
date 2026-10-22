"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, Input, Textarea } from "@/components/ui";
import type { PublicBookingOut, PublicCalendarOut } from "@/utils/api/models";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useBookPublic } from "@/utils/hooks/useCalendar";

type Picked = { slot: string; zone: string };

type Props = {
  slug: string;
  info: Pick<PublicCalendarOut, "name" | "durationMin" | "location">;
  picked: Picked;
  onBack: () => void;
  onBooked: (email: string, booking: PublicBookingOut) => void;
  onTaken: () => void;
};

const part = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(new Date(iso));

/**
 * "Your details": the picked call on the left (with "Change time"), the form on the right. The guest becomes a
 * contact at "Call booked" with their name, company, phone and note.
 */
export function BookingDetailsForm({ slug, info, picked, onBack, onBooked, onTaken }: Props) {
  const book = useBookPublic(slug);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", notes: "", website: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const errors = fieldErrors(book.error);
  const end = new Date(new Date(picked.slot).getTime() + info.durationMin * 60_000).toISOString();
  const clock = (iso: string) => part(iso, picked.zone, { hour: "numeric", minute: "2-digit" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() };
    book.mutate(
      { startsAt: picked.slot, ...trimmed, company: form.company.trim(), timezone: picked.zone },
      {
        onSuccess: (booking) => onBooked(trimmed.email, booking),
        onError: (err) => hasCode(err, "slot_unavailable") && onTaken(),
      },
    );
  };

  return (
    <div className="book-details">
      <aside className="book-details__summary">
        <button type="button" className="book-details__back" onClick={onBack}>
          <Icon path="M15 18l-6-6 6-6" size={16} />
          Change time
        </button>
        <span className="book-details__kicker">YOU’RE BOOKING</span>
        <h1 className="book-details__title">{info.name}</h1>
        <div className="book-details__when">
          <div className="book-details__tile" aria-hidden="true">
            <span className="book-details__tile-month">{part(picked.slot, picked.zone, { month: "short" }).toUpperCase()}</span>
            <span className="book-details__tile-day">{part(picked.slot, picked.zone, { day: "numeric" })}</span>
          </div>
          <div className="book-details__when-text">
            <strong>{part(picked.slot, picked.zone, { weekday: "long", month: "long", day: "numeric" })}</strong>
            <span>
              {clock(picked.slot)} – {clock(end)}
            </span>
          </div>
        </div>
        <ul className="book-details__facts">
          <li>
            <Icon name="clock" size={15} />
            {info.durationMin} minutes
          </li>
          {info.location && (
            <li>
              <Icon name="video" size={15} />
              {info.location}
            </li>
          )}
          <li>
            <Icon name="globe" size={15} />
            {picked.zone.replace(/_/g, " ")}
          </li>
        </ul>
      </aside>

      <form className="book-details__form" onSubmit={submit}>
        <div className="stack stack--4">
          <h2 className="book-details__heading">Your details</h2>
          <span className="text-small">We’ll send the confirmation and meeting link to your email.</span>
        </div>

        <div className="book-details__row">
          <Field label="First name" htmlFor="bk-first" required error={errors.firstName}>
            <Input id="bk-first" autoComplete="given-name" required value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field label="Last name" htmlFor="bk-last" required error={errors.lastName}>
            <Input id="bk-last" autoComplete="family-name" required value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Email" htmlFor="bk-email" required error={errors.email}>
          <Input
            id="bk-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <div className="book-details__row">
          <Field label="Phone" htmlFor="bk-phone" hint="Optional" error={errors.phone}>
            <Input id="bk-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Company" htmlFor="bk-company" hint="Optional" error={errors.company}>
            <Input
              id="bk-company"
              autoComplete="organization"
              value={form.company}
              onChange={(e) => set({ company: e.target.value })}
            />
          </Field>
        </div>
        <Field label="What would you like to discuss?" htmlFor="bk-notes" hint="Optional. Helps us prepare for the call." error={errors.notes}>
          <Textarea
            id="bk-notes"
            rows={4}
            placeholder="Your goals, questions, or anything we should know beforehand."
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
        {/* Honeypot: hidden from people, bots fill it in and the API drops the booking. */}
        <input
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="website"
          value={form.website}
          onChange={(e) => set({ website: e.target.value })}
        />
        {book.isError && !Object.keys(errors).length && !hasCode(book.error, "slot_unavailable") && (
          <p className="text-error" role="alert">
            {errorMessage(book.error)}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" block disabled={book.isPending}>
          {book.isPending ? "Confirming…" : "Confirm booking"}
        </Button>
        <p className="book-details__privacy">
          <Icon name="lock" size={13} />
          Your details are only used to arrange and follow up on this call.
        </p>
      </form>
    </div>
  );
}
