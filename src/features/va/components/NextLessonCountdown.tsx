"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { qk } from "@/utils/hooks/keys";

/** "Tue, Nov 17 at 8:00 AM" in the learner's own time zone (falls back to the browser's if it's unknown). */
export function lessonOpensAt(iso: string, timeZone?: string | null): string {
  const at = new Date(iso);
  const opts = (o: Intl.DateTimeFormatOptions) => {
    try {
      return at.toLocaleString("en-US", { ...o, timeZone: timeZone || undefined });
    } catch {
      return at.toLocaleString("en-US", o);
    }
  };
  const day = (d: Date) => {
    try {
      return d.toLocaleDateString("en-CA", { timeZone: timeZone || undefined });
    } catch {
      return d.toLocaleDateString("en-CA");
    }
  };
  const time = opts({ hour: "numeric", minute: "2-digit" });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (day(at) === day(now)) return `today at ${time}`;
  if (day(at) === day(tomorrow)) return `tomorrow at ${time}`;
  return `${opts({ weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

/** "America/Denver" → "Denver time"; "UTC" stays "UTC". */
const zoneLabel = (tz?: string | null) => (!tz ? "your time" : tz === "UTC" ? "UTC" : `${tz.split("/").pop()!.replace(/_/g, " ")} time`);

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86_400), h: Math.floor((s % 86_400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * Daily pace: when the next lesson opens, as a live countdown plus the day and time in the learner's own time zone.
 * When it reaches zero the courses reload, so the lesson unlocks without refreshing the page.
 */
export function NextLessonCountdown({
  at,
  timezone,
  compact,
  className,
}: {
  at: string;
  timezone?: string | null;
  /** One short line ("Next lesson in 3h 12m"), e.g. on a course card. */
  compact?: boolean;
  className?: string;
}) {
  const target = Date.parse(at);
  const [now, setNow] = useState(() => Date.now());
  const qc = useQueryClient();
  const left = target - now;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Open now: reload the courses (VA portal and client portal) so the lesson shows as open.
  const due = left <= 0;
  useEffect(() => {
    if (!due) return;
    const id = window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: qk.myTrainings });
      qc.invalidateQueries({ queryKey: qk.portalTrainings });
    }, 1500);
    return () => window.clearTimeout(id);
  }, [due, qc]);

  const { d, h, m, s } = parts(left);
  const when = lessonOpensAt(at, timezone);

  if (compact) {
    return (
      <span className={cn("next-lesson-chip", className)} title={`Opens ${when} (${zoneLabel(timezone)})`}>
        <Icon name="clock" size={12} />
        {due ? "Next lesson is open" : `Next lesson in ${d ? `${d}d ` : ""}${h ? `${h}h ` : ""}${m}m`}
      </span>
    );
  }

  return (
    <div className={cn("next-lesson", due && "is-open", className)} role="timer" aria-live="off">
      <span className="next-lesson__icon" aria-hidden="true">
        <Icon name={due ? "circleCheck" : "clock"} size={18} />
      </span>
      <div className="next-lesson__text">
        <strong>{due ? "Your next lesson is open" : "Your next lesson opens in"}</strong>
        <span>
          {due ? "Loading it now…" : `Opens ${when}, ${zoneLabel(timezone)}`}
        </span>
      </div>
      {!due && (
        <div className="next-lesson__clock" aria-label={`${d} days ${h} hours ${m} minutes ${s} seconds`}>
          {d > 0 && (
            <span>
              <b>{d}</b>
              <i>days</i>
            </span>
          )}
          <span>
            <b>{String(h).padStart(2, "0")}</b>
            <i>hrs</i>
          </span>
          <span>
            <b>{String(m).padStart(2, "0")}</b>
            <i>min</i>
          </span>
          <span>
            <b>{String(s).padStart(2, "0")}</b>
            <i>sec</i>
          </span>
        </div>
      )}
    </div>
  );
}
