"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Button, Field, FormError, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import { CALENDAR_SWATCHES, DURATIONS, LOCATIONS, type DayAvailability } from "@/data/admin";
import { toneClass } from "@/lib/tones";
import { cn, slugify } from "@/lib/utils";
import type { CalendarOut, CalendarUpdate, DayHours } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useDeleteCalendar, useUpdateCalendar } from "@/utils/hooks/useCalendar";
import { useSettings } from "@/utils/hooks/useSettings";
import { useAdmin } from "../../state/AdminContext";
import { HoursEditor, hoursError, toHours } from "./Availability";

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
export function EditCalendarDrawer({ calendar: cal, onClose }: { calendar: CalendarOut; onClose: () => void }) {
  const { notify } = useAdmin();
  const shared = toHours(useSettings().data?.availability);
  const updateCal = useUpdateCalendar();
  const deleteCal = useDeleteCalendar();
  const [draft, setDraft] = useState<Draft>({
    name: cal.name,
    slug: cal.slug,
    desc: cal.description,
    dur: String(cal.durationMin),
    loc: cal.location,
    color: cal.color,
    on: cal.isActive,
    customHours: !!cal.hours,
    hours: cal.hours ? toHours(cal.hours) : shared,
  });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  const durations: string[] = DURATIONS.map(String);
  const locations: string[] = [...LOCATIONS];

  const save = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const slug = slugify(draft.slug);
    if (!name) return setError("Give the calendar a name.");
    if (!slug) return setError("Add a URL ending, e.g. discovery-call.");
    if (draft.customHours) {
      const bad = hoursError(draft.hours);
      if (bad) return setError(bad);
      if (!draft.hours.some((h) => h.on)) return setError("Turn on at least one day, or use your weekly hours.");
    }
    const body: CalendarUpdate = {
      name,
      slug,
      description: draft.desc.trim(),
      durationMin: Number(draft.dur) as CalendarUpdate["durationMin"],
      location: draft.loc as CalendarUpdate["location"],
      color: draft.color,
      isActive: draft.on,
      hours: draft.customHours ? (draft.hours as DayHours[]) : null,
    };
    // A taken booking link comes back as 409 duplicate_slug with a message for the user.
    updateCal.mutate(
      { id: cal.id, body },
      {
        onSuccess: () => {
          notify(`${name} was updated.`);
          onClose();
        },
        onError: (err) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err)),
      },
    );
  };

  const remove = () =>
    deleteCal.mutate(cal.id, {
      onSuccess: () => {
        notify(`${cal.name} was deleted.`);
        onClose();
      },
    });

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
            <Button variant="danger-solid" onClick={remove} disabled={deleteCal.isPending}>
              Yes, delete calendar
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={updateCal.isPending}>
            {updateCal.isPending ? "Saving…" : "Save changes"}
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
              onClick={() => set({ customHours: custom, hours: custom ? draft.hours : shared })}
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
      <FormError error={deleteCal.error} />
    </Modal>
  );
}
