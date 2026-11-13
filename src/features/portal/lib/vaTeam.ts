import type { Tone } from "@/lib/tones";

/** 12600 → "3h 30m"; 0 → "0h". */
export function hm(seconds: number): string {
  const m = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** 12600 → "3.5". */
export const hoursDecimal = (seconds: number) => (Math.round((seconds / 3600) * 10) / 10).toLocaleString();

export const firstName = (name: string) => name.split(" ")[0] || name;

export type VaState = "working" | "on_break" | "offline";
export const STATE_LABEL: Record<VaState, string> = { working: "Working", on_break: "On break", offline: "Offline" };
export const STATE_TONE: Record<VaState, Tone> = { working: "green", on_break: "amber", offline: "slate" };

/** "YYYY-MM-DD" for a local date. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
