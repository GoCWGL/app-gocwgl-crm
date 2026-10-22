"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Button, Field, FormError, IconButton, Input, Select } from "@/components/ui";
import { CALENDAR_SWATCHES, DURATIONS, LOCATIONS } from "@/data/admin";
import { slugify } from "@/lib/utils";
import type { CalendarCreate } from "@/utils/api/models";
import { useCreateCalendar } from "@/utils/hooks/useCalendar";
import { useAdmin } from "../../state/AdminContext";

export function NewCalendarForm({ onClose }: { onClose: () => void }) {
  const { notify } = useAdmin();
  const create = useCreateCalendar();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<CalendarCreate["durationMin"]>(30);
  const [location, setLocation] = useState<CalendarCreate["location"]>("Google Meet");
  const [color, setColor] = useState("#0891B2");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // The slug must be unique: the API answers 409 duplicate_slug and the message says so.
    create.mutate(
      { name: trimmed, durationMin: duration, location, color, slug: slugify(trimmed), isActive: true, description: "Book a time that works for you." },
      {
        onSuccess: () => {
          notify(`${trimmed} was created.`);
          onClose();
        },
      },
    );
  };

  return (
    <form className="card new-calendar" onSubmit={submit}>
      <div className="cluster cluster--between">
        <h2 className="card-title">Create a new calendar</h2>
        <IconButton label="Close" size="lg" ghost onClick={onClose}>
          ×
        </IconButton>
      </div>
      <div className="form-grid">
        <Field label="Calendar name" htmlFor="cal-name">
          <Input id="cal-name" placeholder="e.g. Sales Call" value={name} onChange={(e) => (setName(e.target.value), create.reset())} />
        </Field>
        <Field label="Duration" htmlFor="cal-dur">
          <Select
            id="cal-dur"
            value={String(duration)}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
            onChange={(e) => setDuration(Number(e.target.value) as CalendarCreate["durationMin"])}
          />
        </Field>
        <Field label="Location" htmlFor="cal-loc" hint={location === "Zoom" ? "Each booking gets its own Zoom meeting once Zoom is connected in Integrations." : undefined}>
          <Select id="cal-loc" value={location} options={[...LOCATIONS]} onChange={(e) => setLocation(e.target.value as CalendarCreate["location"])} />
        </Field>
      </div>
      <Field label="Color">
        <div className="cluster" role="group" aria-label="Calendar color">
          {CALENDAR_SWATCHES.map((sw) => (
            <button
              key={sw.hex}
              type="button"
              className="swatch swatch--lg"
              aria-label={sw.name}
              aria-pressed={color === sw.hex}
              style={{ "--swatch": sw.hex } as CSSProperties}
              onClick={() => setColor(sw.hex)}
            />
          ))}
        </div>
      </Field>
      <FormError error={create.error} />
      <div className="cluster cluster--end">
        <Button size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create calendar"}
        </Button>
      </div>
    </form>
  );
}
