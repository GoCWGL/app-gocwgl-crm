import { addDaysIso, isoDateIn, todayIso, zonedToIso } from "@/utils/format/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The visitor's own time zone (what the booking page shows by default). */
export function browserZone(fallback = "UTC"): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

/** "GMT+08:00" for `zone` right now. */
export function offsetLabel(zone: string, at: Date = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  return name === "GMT" ? "GMT+00:00" : (name ?? "GMT");
}

const offsetMinutes = (label: string) => {
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(label);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

/** Every time zone the browser knows, as select options sorted by offset: "(GMT+08:00) Asia/Manila". */
export function zoneOptions(include: string[] = []): Array<{ value: string; label: string }> {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const zones = new Set([...(intl.supportedValuesOf?.("timeZone") ?? []), ...include.filter(Boolean)]);
  return [...zones]
    .map((zone) => ({ zone, offset: offsetLabel(zone) }))
    .sort((a, b) => offsetMinutes(a.offset) - offsetMinutes(b.offset) || a.zone.localeCompare(b.zone))
    .map(({ zone, offset }) => ({ value: zone, label: `(${offset}) ${zone.replace(/_/g, " ")}` }));
}

/** The business days ("YYYY-MM-DD", 1 or 2) that the visitor's `day` in `viewZone` overlaps. */
export function businessDays(day: string, viewZone: string, businessZone: string): string[] {
  const first = isoDateIn(new Date(zonedToIso(day, "00:00", viewZone)), businessZone);
  const last = isoDateIn(new Date(zonedToIso(day, "23:59", viewZone)), businessZone);
  return first === last ? [first] : [first, last];
}

type OpenHours = Array<{ d: string; start: string; end: string }>;

/**
 * Whether the visitor's `day` (in `viewZone`) can have open times: some business hours fall inside it, they haven't
 * ended yet, and they're inside the booking window. Days that fail are grayed out.
 */
export function dayIsOpen(
  day: string,
  {
    viewZone,
    businessZone,
    openHours,
    bookableUntil,
  }: { viewZone: string; businessZone: string; openHours?: OpenHours; bookableUntil?: string },
): boolean {
  if (day < todayIso(viewZone)) return false;
  const dayStart = zonedToIso(day, "00:00", viewZone);
  const dayEnd = zonedToIso(addDaysIso(day, 1), "00:00", viewZone);
  const now = new Date().toISOString();
  const businessToday = todayIso(businessZone);
  return businessDays(day, viewZone, businessZone).some((d) => {
    if (d < businessToday || (bookableUntil && d > bookableUntil)) return false;
    if (!openHours) return true; // not loaded yet: let the day be picked and its times decide
    const rule = openHours.find((h) => h.d === WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]);
    if (!rule) return false;
    const opens = zonedToIso(d, rule.start, businessZone);
    const closes = zonedToIso(d, rule.end, businessZone);
    return opens < dayEnd && closes > dayStart && closes > now;
  });
}
