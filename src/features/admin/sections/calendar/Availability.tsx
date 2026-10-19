"use client";

import { useState } from "react";
import { Button, FormError, LoadState } from "@/components/ui";
import { TIME_ZONES, WEEKDAY_KEYS, type DayAvailability } from "@/data/admin";
import { toMinutes } from "@/lib/dates";
import type { DayHours } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { useSettings, useUpdateSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

/** The API's hours, one per weekday in Mon…Sun order. */
export function toHours(list: unknown): DayAvailability[] {
  const rows = (Array.isArray(list) ? list : []) as DayAvailability[];
  return WEEKDAY_KEYS.map((d) => rows.find((r) => r.d === d) ?? { d, on: false, start: "09:00", end: "17:00" });
}

export function hoursError(hours: DayAvailability[]): string {
  const bad = hours.find((h) => h.on && toMinutes(h.end) <= toMinutes(h.start));
  return bad ? `${bad.d}: the end time must be after the start time.` : "";
}

/** Weekly working hours used by every calendar without its own custom hours (stored in /admin/settings). */
export function Availability() {
  const { notify } = useAdmin();
  const canEdit = canWriteCrm(useMe().data);
  const settings = useSettings();
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<DayAvailability[] | null>(null);
  const [error, setError] = useState("");
  const hours = draft ?? toHours(settings.data?.availability);
  const zone = settings.data?.timezone ?? "";
  const zoneLabel = TIME_ZONES.find((z) => z.value === zone)?.label ?? zone;

  const submit = () => {
    const err = hoursError(hours);
    if (err) return setError(err);
    save.mutate({ availability: hours as DayHours[] }, { onSuccess: () => (setDraft(null), notify("Weekly hours saved.")) });
  };

  return (
    <section className="card availability">
      <div className="stack stack--2">
        <h2 className="card-title">Weekly hours</h2>
        <span className="text-small">Used by all calendars without custom hours{zoneLabel && ` · ${zoneLabel}`}</span>
      </div>
      <LoadState query={settings}>
        <HoursEditor hours={hours} onChange={(next) => (setDraft(next), setError(""))} disabled={!canEdit} />
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <FormError error={save.error} />
        {canEdit && (
          <div className="cluster cluster--end">
            <Button onClick={() => (setDraft(null), setError(""))} disabled={!draft || save.isPending}>
              Discard
            </Button>
            <Button variant="primary" onClick={submit} disabled={!draft || save.isPending}>
              {save.isPending ? "Saving…" : "Save hours"}
            </Button>
          </div>
        )}
      </LoadState>
    </section>
  );
}

/** One row per weekday: on/off checkbox plus start and end times. */
export function HoursEditor({
  hours,
  onChange,
  disabled,
}: {
  hours: DayAvailability[];
  onChange: (hours: DayAvailability[]) => void;
  disabled?: boolean;
}) {
  const patch = (i: number, p: Partial<DayAvailability>) => onChange(hours.map((a, k) => (k === i ? { ...a, ...p } : a)));

  return (
    <div>
      {hours.map((a, i) => (
        <div className="list-row" key={a.d}>
          <label className="availability__day">
            <input type="checkbox" checked={a.on} disabled={disabled} onChange={() => patch(i, { on: !a.on })} />
            {a.d}
          </label>
          {a.on ? (
            <div className="cluster cluster--8 cluster--nowrap">
              <input
                className="input input--auto"
                type="time"
                aria-label={`${a.d} start time`}
                value={a.start}
                disabled={disabled}
                onChange={(e) => patch(i, { start: e.target.value })}
              />
              <span className="u-muted">–</span>
              <input
                className="input input--auto"
                type="time"
                aria-label={`${a.d} end time`}
                value={a.end}
                disabled={disabled}
                onChange={(e) => patch(i, { end: e.target.value })}
              />
            </div>
          ) : (
            <span className="text-muted">Unavailable</span>
          )}
        </div>
      ))}
    </div>
  );
}
