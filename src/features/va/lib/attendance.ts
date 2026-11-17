import type { Tone } from "@/lib/tones";
import type { ScheduleOut, VaAttendanceDay } from "@/utils/api/models";

/** One work day, as both portals get it (minus who it was for). */
export type AttendanceDay = Omit<VaAttendanceDay, "client">;

// Attendance (VA portal and client portal): schedules, statuses and times, shared by both.

export type DayStatus = AttendanceDay["status"];

/** 0 = Monday … 6 = Sunday, as the API sends them. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "9:00 AM" from "09:00". */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "EST", "GMT+8": the short name of a time zone right now. */
export function zoneShort(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** "Mon–Fri", "Mon, Wed, Fri", "Every day". */
export function daysLabel(days: number[]): string {
  const d = [...days].sort((a, b) => a - b);
  if (d.length === 7) return "Every day";
  const run = d.length > 2 && d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  return run ? `${WEEKDAYS[d[0]]}–${WEEKDAYS[d[d.length - 1]]}` : d.map((i) => WEEKDAYS[i]).join(", ");
}

/** "Mon–Fri · 9:00 AM – 5:00 PM EST". */
export const scheduleLabel = (s: ScheduleOut) =>
  `${daysLabel(s.workDays)} · ${clockLabel(s.startTime)} – ${clockLabel(s.endTime)} ${zoneShort(s.timezone)}`;

/** A time in the viewer's own time zone ("9:07 AM"), or in `tz`. */
export const timeAt = (iso: string, tz?: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {}) });

/** "Tue 9:00 AM" when it's not today, else "9:00 AM". */
export function whenLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? timeAt(iso) : `${d.toLocaleDateString("en-US", { weekday: "short" })} ${timeAt(iso)}`;
}

/** 75 → "1 h 15 min", 12 → "12 min". */
export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The badge for a day: on time, late (by how much), absent… */
export function statusBadge(d: Pick<AttendanceDay, "status" | "minutesLate" | "clockedIn" | "scheduledStartAt">): { tone: Tone; label: string } {
  switch (d.status) {
    case "on_time":
      return { tone: "green", label: "On time" };
    case "late":
      return { tone: "red", label: `Late · ${minutesLabel(d.minutesLate ?? 0)}` };
    case "missing":
      return { tone: "amber", label: `Not clocked in · ${minutesLabel(d.minutesLate ?? 0)} late` };
    case "absent":
      return { tone: "red", label: "Absent" };
    case "upcoming":
      return { tone: "slate", label: d.scheduledStartAt ? `Starts ${timeAt(d.scheduledStartAt)}` : "Upcoming" };
    case "unscheduled":
      return { tone: "neutral", label: "No schedule" };
    default:
      return { tone: "slate", label: "Day off" };
  }
}

export const STATUS_FILTERS: Array<{ value: "" | "late" | "absent" | "on_time"; label: string }> = [
  { value: "", label: "All days" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "on_time", label: "On time" },
];
