/**
 * The API sends ISO 8601: date-times in UTC ("2026-10-18T14:00:00Z") and plain dates ("2026-10-18").
 * Admin views format in the business time zone (from /admin/settings); everyone else uses the browser's.
 */
let businessTimeZone: string | undefined;

export function setBusinessTimeZone(tz: string | null | undefined) {
  businessTimeZone = tz || undefined;
}

export function getTimeZone(): string {
  return businessTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

type Input = string | Date | null | undefined;

function toDate(value: Input): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // A plain date ("2026-10-18") is a calendar day, not an instant: read it as local noon so no zone shifts the day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const isPlainDate = (value: Input) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function fmt(value: Input, options: Intl.DateTimeFormatOptions, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  const timeZone = isPlainDate(value) ? undefined : getTimeZone();
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

/** "Oct 14" */
export const formatShort = (value: Input, fallback?: string) => fmt(value, { month: "short", day: "numeric" }, fallback);

/** "Oct 14, 2026" */
export const formatLong = (value: Input, fallback?: string) =>
  fmt(value, { month: "short", day: "numeric", year: "numeric" }, fallback);

/** "Wed, Oct 14, 2026" */
export const formatFull = (value: Input, fallback?: string) =>
  fmt(value, { weekday: "short", month: "short", day: "numeric", year: "numeric" }, fallback);

/** "2:00 PM" */
export const formatTime = (value: Input, fallback?: string) => fmt(value, { hour: "numeric", minute: "2-digit" }, fallback);

/** "Wed 2:00 PM" */
export const formatDayTime = (value: Input, fallback?: string) =>
  fmt(value, { weekday: "short", hour: "numeric", minute: "2-digit" }, fallback);

/** "Wed 14 Oct · 2:00 PM" (booked calls). */
export function formatCall(value: Input, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${formatTime(value)}`;
}

/** "Oct 14 · 2:00 PM" */
export const formatShortDateTime = (value: Input, fallback?: string) =>
  toDate(value) ? `${formatShort(value)} · ${formatTime(value)}` : (fallback ?? "—");

/** "just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", then "Oct 2". */
export function formatRelative(value: Input, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "—";
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatShort(value);
}

/** Today's date as "2026-10-18" in the given (or business) time zone. */
export function todayIso(timeZone: string = getTimeZone()): string {
  return isoDateIn(new Date(), timeZone);
}

/** A Date → "YYYY-MM-DD" as seen in a time zone. */
export function isoDateIn(date: Date, timeZone: string = getTimeZone()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "YYYY-MM-DD" + n days. */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/**
 * A wall-clock date and time in a time zone → ISO instant.
 * ("2026-10-20", "14:00", "America/New_York") → "2026-10-20T18:00:00.000Z"
 */
export function zonedToIso(day: string, time: string, timeZone: string = getTimeZone()): string {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = zoneOffsetMinutes(new Date(guess), timeZone);
  const first = guess - offset * 60_000;
  // Re-check once around DST changes.
  const offset2 = zoneOffsetMinutes(new Date(first), timeZone);
  return new Date(guess - offset2 * 60_000).toISOString();
}

/** Minutes the zone is ahead of UTC at that instant. */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** ISO instant → { day: "YYYY-MM-DD", time: "HH:MM" } in a time zone (for date/time inputs). */
export function isoToZoned(value: Input, timeZone: string = getTimeZone()): { day: string; time: string } {
  const date = toDate(value);
  if (!date) return { day: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Weekday index (0 = Sunday) of an ISO instant in a time zone. */
export function weekdayOf(value: Input, timeZone: string = getTimeZone()): number {
  const name = fmt(value, { weekday: "short", timeZone }, "");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}
