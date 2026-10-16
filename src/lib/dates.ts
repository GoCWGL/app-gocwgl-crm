// The prototype runs on a fixed "today" so the sample data always lines up.
export const TODAY = new Date(2026, 9, 14);
export const TODAY_LABEL = "Wed, Oct 14, 2026";
export const TODAY_SHORT = "Oct 14";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Oct 14" → Date in 2026. */
export function parseShortDate(value: string): Date {
  const [month, day] = value.split(" ");
  return new Date(2026, MONTHS.indexOf(month), Number(day));
}

/** "2026-10-14" → Date (local time). */
export function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

/** "Oct 14, 2026" */
export function formatLongDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "Oct 21" */
export function formatShortDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function daysAgo(n: number): Date {
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n);
}

export function addDays(n: number): string {
  return formatShortDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n));
}

/** Day number relative to Oct 1 ("Sep 30" → 0, "Oct 14" → 14); used for sorting sample data. */
export function dayNumber(value: string): number {
  const [month, day] = (value || "").split(" ");
  return month === "Sep" ? Number(day) - 30 : Number(day);
}

/** "13:30" → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 810 → "1:30 PM" */
export function formatTime12(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
