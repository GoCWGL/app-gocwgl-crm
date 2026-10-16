"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import { CALENDAR_SWATCHES, DURATIONS, LOCATIONS, type BookingCalendar, type DayAvailability } from "@/data/admin";
import { toMinutes } from "@/lib/dates";
import { toneClass } from "@/lib/tones";
import { cn, slugify } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";
import { HoursEditor } from "./Availability";

type Draft = {
  name: string;
  slug: string;
  desc: string;
  dur: string;
  loc: string;
  color: string;
  on: boolean;
  customHours: boolean;
  hours: DayAvailability[];
};

/** Edit a booking calendar: name, booking link, bio, duration, location, color and hours. */
export function EditCalendarDrawer({ calendar: cal, onClose }: { calendar: BookingCalendar; onClose: () => void }) {
  const { state, update } = useAdmin();
  const [draft, setDraft] = useState<Draft>({
    name: cal.name,
    slug: cal.slug,
    desc: cal.desc,
    dur: String(cal.dur),
    loc: cal.loc,
    color: cal.color,
    on: cal.on,
    customHours: !!cal.hours,
    hours: (cal.hours ?? state.availability).map((a) => ({ ...a })),
  });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  const durations = DURATIONS.includes(draft.dur) ? DURATIONS : [...DURATIONS, draft.dur];
  const locations = LOCATIONS.includes(draft.loc) ? LOCATIONS : [...LOCATIONS, draft.loc];

  const save = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const slug = slugify(draft.slug);
    if (!name) return setError("Give the calendar a name.");
    if (!slug) return setError("Add a URL ending, e.g. discovery-call.");
    const dup = state.calendars.find((c) => c.id !== cal.id && c.slug === slug);
    if (dup) return setError(`“${dup.name}” already uses /${slug}.`);
    if (draft.customHours) {
      const bad = draft.hours.find((h) => h.on && toMinutes(h.end) <= toMinutes(h.start));
      if (bad) return setError(`${bad.d}: the end time must be after the start time.`);
      if (!draft.hours.some((h) => h.on)) return setError("Turn on at least one day, or use your weekly hours.");
    }

    update((s) => ({
      calendars: s.calendars.map((c) =>
        c.id !== cal.id
          ? c
          : {
              ...c,
              name,
              slug,
              desc: draft.desc.trim(),
              dur: Number(draft.dur),
              loc: draft.loc,
              color: draft.color,
              on: draft.on,
              hours: draft.customHours ? draft.hours : undefined,
            },
      ),
      toast: `${name} was updated.`,
    }));
    onClose();
  };

  const remove = () => {
    update((s) => ({ calendars: s.calendars.filter((c) => c.id !== cal.id), toast: `${cal.name} was deleted.` }));
    onClose();
  };

  return (
    <Modal
      open
      variant="drawer"
      width={540}
      onClose={onClose}
      onSubmit={save}
      titleId="ecal-title"
      kicker="EDIT CALENDAR"
      title={draft.name.trim() || cal.name}
      subtitle={`book.[yourdomain].com/${slugify(draft.slug) || "…"}`}
      media={<span className="edit-calendar__dot" style={{ "--cal": draft.color } as CSSProperties} aria-hidden="true" />}
      footer={
        <>
          {confirmDelete ? (
            <Button variant="danger-solid" onClick={remove}>
              Yes, delete calendar
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save changes
          </Button>
        </>
      }
    >
      <div className="cluster cluster--between cluster--nowrap">
        <div className="stack stack--2">
          <span className="text-strong">Taking bookings</span>
          <span className="text-small">{draft.on ? "Clients can book this calendar." : "The booking page shows it as turned off."}</span>
        </div>
        <Toggle label="Turn calendar on or off" checked={draft.on} onChange={() => set({ on: !draft.on })} />
      </div>

      <div className="stack stack--10">
        <span className="kicker">DETAILS</span>
        <Field label="Calendar name" htmlFor="ecal-name">
          <Input id="ecal-name" value={draft.name} aria-invalid={!!error && !draft.name.trim()} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Booking link" htmlFor="ecal-slug" hint="Letters, numbers and dashes. Old links stop working when you change it.">
          <div className="input-group">
            <span className="input-group__addon">book.[yourdomain].com/</span>
            <Input
              id="ecal-slug"
              mono
              spellCheck={false}
              autoComplete="off"
              value={draft.slug}
              aria-invalid={!!error && !slugify(draft.slug)}
              onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })}
              onBlur={() => set({ slug: slugify(draft.slug) })}
            />
          </div>
        </Field>
        <Field label="Bio / description" htmlFor="ecal-desc" hint="Shown to clients on the booking page.">
          <Textarea id="ecal-desc" rows={4} value={draft.desc} placeholder="What is this call about?" onChange={(e) => set({ desc: e.target.value })} />
        </Field>
        <div className="form-grid form-grid--narrow">
          <Field label="Duration" htmlFor="ecal-dur">
            <Select id="ecal-dur" value={draft.dur} options={durations.map((d) => ({ value: d, label: `${d} min` }))} onChange={(e) => set({ dur: e.target.value })} />
          </Field>
          <Field label="Location" htmlFor="ecal-loc">
            <Select id="ecal-loc" value={draft.loc} options={locations} onChange={(e) => set({ loc: e.target.value })} />
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
                aria-pressed={draft.color === sw.hex}
                style={{ "--swatch": sw.hex } as CSSProperties}
                onClick={() => set({ color: sw.hex })}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="stack stack--10">
        <span className="kicker">AVAILABILITY</span>
        <div className="cluster cluster--6" role="radiogroup" aria-label="Availability">
          {(
            [
              [false, "Use my weekly hours"],
              [true, "Custom hours"],
            ] as const
          ).map(([custom, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={draft.customHours === custom}
              className={cn("status-choice", toneClass("cyan"))}
              onClick={() => set({ customHours: custom, hours: custom ? draft.hours : state.availability.map((a) => ({ ...a })) })}
            >
              {label}
            </button>
          ))}
        </div>
        {draft.customHours ? (
          <div className="inset inset--soft edit-calendar__hours">
            <HoursEditor hours={draft.hours} onChange={(hours) => set({ hours })} />
          </div>
        ) : (
          <span className="text-small">
            Follows the hours under Calendar › Availability, shared with other calendars. Pick “Custom hours” to set different times just for
            this calendar.
          </span>
        )}
      </div>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
