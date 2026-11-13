type JobDates = { start?: string | null; end?: string | null; current?: boolean | null };
type School = { school?: string | null; degree?: string | null; field?: string | null; start?: string | null; end?: string | null; year?: string | null };

/** "Jan 2021 – Present", "Jan 2021 – Mar 2023". */
export function jobDates(j: JobDates): string {
  const end = j.current ? "Present" : j.end || (j.start ? "Present" : "");
  return [j.start ?? "", end].filter(Boolean).join(" – ");
}

/** "Bachelor's degree in Business Administration" (older entries: their free-text degree). */
export function schoolTitle(e: School): string {
  const degree = (e.degree ?? "").trim();
  const field = (e.field ?? "").trim();
  if (degree && field) return `${degree} in ${field}`;
  return degree || field || e.school || "";
}

/** "2015 – 2019", "2022 – Present"; older entries: their one year. */
export function schoolDates(e: School): string {
  if (e.start || e.end) return [e.start, e.end || (e.start ? "Present" : "")].filter(Boolean).join(" – ");
  return e.year ?? "";
}

/** Filled in: a school or a course (a new entry starts with "Bachelor's degree" picked, which alone isn't an entry). */
export const hasSchool = (e: School) => !!((e.school ?? "").trim() || (e.field ?? "").trim());

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Jan 2022" → { month: 1, year: 2022 }; "2022" → { year }; "Jan" → { month }; anything else → { other }. */
export function parseMonthYear(value: string | null | undefined): { month?: number; year?: number; other?: string } {
  const v = (value ?? "").trim();
  if (!v) return {};
  const m = /^([A-Za-z]{3})[A-Za-z]*\.?(?:\s+(\d{4}))?$/.exec(v);
  if (m) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) + 1;
    if (month > 0) return { month, year: m[2] ? Number(m[2]) : undefined };
  }
  if (/^\d{4}$/.test(v)) return { year: Number(v) };
  return { other: v };
}

export function formatMonthYear(month?: number, year?: number): string {
  return [month ? MONTHS[month - 1] : "", year ? String(year) : ""].filter(Boolean).join(" ");
}

/** A comparable number for "Jan 2022" / "2022" (null when there's no year). */
export function dateOrder(value: string | null | undefined): number | null {
  const p = parseMonthYear(value);
  return p.year ? p.year * 12 + (p.month ?? 1) : null;
}
