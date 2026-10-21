"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { Button, ErrorState, Field, Icon, Input, Loading, Textarea } from "@/components/ui";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useBookPublic, usePublicCalendar } from "@/utils/hooks/useCalendar";
import { BookingWidget, slotDateTime } from "./BookingWidget";

type Picked = { slot: string; zone: string };

/** Public booking page at /book/{slug}: pick a time, leave your details, get a confirmation email. */
export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = usePublicCalendar(slug);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [booked, setBooked] = useState<(Picked & { email: string }) | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);

  let body;
  if (page.isPending) body = <Loading text="Loading calendar…" />;
  else if (page.isError)
    body = hasCode(page.error, "not_found") ? (
      <div className="booking-page__message">
        <h1 className="booking-preview__title">This booking link isn’t available</h1>
        <p className="text-muted">The calendar may have been turned off or renamed. Ask for a new link.</p>
      </div>
    ) : (
      <ErrorState error={page.error} onRetry={page.refetch} />
    );
  else if (booked)
    body = (
      <div className="booking-page__message" role="status">
        <span className="booking-page__check" aria-hidden="true">
          <Icon name="check" size={26} strokeWidth={2.6} />
        </span>
        <h1 className="booking-preview__title">You’re booked</h1>
        <p className="text-strong">
          {page.data.name} · {slotDateTime(booked.slot, booked.zone)} ({booked.zone})
        </p>
        <p className="text-muted">A confirmation is on its way to {booked.email}.</p>
      </div>
    );
  else if (picked)
    body = (
      <DetailsForm
        slug={slug}
        name={page.data.name}
        picked={picked}
        onBack={() => setPicked(null)}
        onBooked={(email) => setBooked({ ...picked, email })}
        onTaken={() => {
          setSlotTaken(true);
          setPicked(null);
        }}
      />
    );
  else
    body = (
      <BookingWidget
        slug={slug}
        info={page.data}
        active
        notice={
          slotTaken && (
            <p className="text-error" role="alert">
              Sorry, that time was just taken. Please pick another one.
            </p>
          )
        }
        onConfirm={(slot, zone) => {
          setSlotTaken(false);
          setPicked({ slot, zone });
        }}
        onChange={() => setSlotTaken(false)}
      />
    );

  return (
    <div className="booking-page">
      <header className="booking-page__bar">
        <Image className="booking-page__logo" src={logoWordmark} alt="GoCWGL" priority />
      </header>
      <main className="booking-page__main">
        <section className="booking-preview booking-page__card">{body}</section>
      </main>
    </div>
  );
}

type DetailsFormProps = {
  slug: string;
  name: string;
  picked: Picked;
  onBack: () => void;
  onBooked: (email: string) => void;
  onTaken: () => void;
};

function DetailsForm({ slug, name, picked, onBack, onBooked, onTaken }: DetailsFormProps) {
  const book = useBookPublic(slug);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", website: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const errors = fieldErrors(book.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    book.mutate(
      { startsAt: picked.slot, ...form, name: form.name.trim(), email: form.email.trim() },
      {
        onSuccess: () => onBooked(form.email.trim()),
        onError: (err) => hasCode(err, "slot_unavailable") && onTaken(),
      },
    );
  };

  return (
    <form className="booking-page__form" onSubmit={submit}>
      <Button size="sm" className="u-self-start" onClick={onBack}>
        ‹ Back
      </Button>
      <div className="stack stack--4">
        <h1 className="booking-preview__title">{name}</h1>
        <span className="booking-preview__meta">
          <Icon name="calendar" />
          {slotDateTime(picked.slot, picked.zone)} ({picked.zone})
        </span>
      </div>
      <Field label="Your name" htmlFor="bk-name" required error={errors.name}>
        <Input id="bk-name" autoComplete="name" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Email" htmlFor="bk-email" required error={errors.email}>
        <Input id="bk-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field label="Phone" htmlFor="bk-phone" error={errors.phone}>
        <Input id="bk-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label="Anything we should know before the call?" htmlFor="bk-notes" error={errors.notes}>
        <Textarea id="bk-notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
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
      <Button type="submit" variant="primary" size="lg" disabled={book.isPending}>
        {book.isPending ? "Booking…" : "Book this time"}
      </Button>
    </form>
  );
}
