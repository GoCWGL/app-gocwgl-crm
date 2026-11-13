import type { MyClientOut, ShiftOut } from "@/utils/api/models";

/** Kinds of work a VA logs time against (the tag on each entry). */
export const WORK_CATEGORIES = [
  "Lead follow-up",
  "Calls & meetings",
  "CRM updates",
  "Email & inbox",
  "Calendar & scheduling",
  "Social media",
  "Content & design",
  "Customer support",
  "Data entry",
  "Bookkeeping",
  "Research",
  "Reporting",
  "Admin",
  "Training",
  "Other",
] as const;

/** Each client keeps one color everywhere (dots, the split bar); internal work is ink. */
const CLIENT_COLORS = ["#D49B0B", "#0891B2", "#7C3AED", "#DB2777", "#059669", "#EA580C", "#2563EB", "#9333EA"];
export const INTERNAL_COLOR = "#0B1424";
export const INTERNAL_LABEL = "GoCWGL (internal)";

export function clientColors(clients: MyClientOut[] | undefined): Map<string, string> {
  return new Map((clients ?? []).map((c, i) => [c.id, CLIENT_COLORS[i % CLIENT_COLORS.length]]));
}

export const clientLabel = (c: { name: string; company: string } | null | undefined) => (c ? c.company || c.name : INTERNAL_LABEL);
export const entryClient = (e: ShiftOut) => clientLabel(e.client);

/** 10800 → "3:00:00". */
export function hms(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- Date ranges (the browser's own time zone)
export type RangeKey = "today" | "week" | "lastWeek" | "month" | "lastMonth";
export const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** [start, end) for a preset; weeks start on Monday. */
export function rangeFor(key: RangeKey, now = new Date()): { start: Date; end: Date } {
  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  switch (key) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "week":
      return { start: monday, end: addDays(monday, 7) };
    case "lastWeek":
      return { start: addDays(monday, -7), end: monday };
    case "month":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
    case "lastMonth":
      return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 1) };
  }
}

const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** "Oct 26 – Nov 1" (the end is exclusive). */
export const rangeLabel = (r: { start: Date; end: Date }) => {
  const last = addDays(r.end, -1);
  return r.start.getTime() === last.getTime() ? md(r.start) : `${md(r.start)} – ${md(last)}`;
};

/** "2026-10-30" for a local date. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayKey = () => dayKey(new Date());

/** "Today · Fri, Oct 30", "Yesterday · Thu, Oct 29", "Wed, Oct 28". */
export function dayHeading(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (key === todayKey()) return `Today · ${label}`;
  if (key === dayKey(addDays(new Date(), -1))) return `Yesterday · ${label}`;
  return label;
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Local "YYYY-MM-DD" and "HH:MM" for form fields. */
export function toLocalParts(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return { day: dayKey(d), time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
}
export function fromLocalParts(day: string, time: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min).toISOString();
}

/** Save rows as a CSV the browser downloads. */
export function downloadCsv(name: string, header: string[], rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const blob = new Blob([[header, ...rows].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}
