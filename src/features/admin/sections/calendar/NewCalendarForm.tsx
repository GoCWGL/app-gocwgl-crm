"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Button, Field, IconButton, Input, Select } from "@/components/ui";
import { CALENDAR_SWATCHES, DURATIONS, LOCATIONS } from "@/data/admin";
import { slugify } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

export function NewCalendarForm({ onClose }: { onClose: () => void }) {
  const { update } = useAdmin();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("Google Meet");
  const [color, setColor] = useState("#0891B2");

  const create = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const slug = slugify(trimmed);
    update((s) => ({
      calendars: [
        ...s.calendars,
        { id: `${slug}-${Date.now()}`, name: trimmed, dur: Number(duration), loc: location, color, slug, on: true, desc: "Book a time that works for you." },
      ],
    }));
    onClose();
  };

  return (
    <form className="card new-calendar" onSubmit={create}>
      <div className="cluster cluster--between">
        <h2 className="card-title">Create a new calendar</h2>
        <IconButton label="Close" size="lg" ghost onClick={onClose}>
          ×
        </IconButton>
      </div>
      <div className="form-grid">
        <Field label="Calendar name" htmlFor="cal-name">
          <Input id="cal-name" placeholder="e.g. Sales Call" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Duration" htmlFor="cal-dur">
          <Select id="cal-dur" value={duration} options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Location" htmlFor="cal-loc">
          <Select id="cal-loc" value={location} options={LOCATIONS} onChange={(e) => setLocation(e.target.value)} />
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
      <div className="cluster cluster--end">
        <Button size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg">
          Create calendar
        </Button>
      </div>
    </form>
  );
}
