import { useEffect, useState } from "react";

/** 4520 → "1h 15m"; under an hour "15m"; under a minute "0m". */
export function formatDuration(seconds: number): string {
  const m = Math.max(0, Math.floor(seconds / 60));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

/** 4520 → "01:15:20", for a running clock. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

/** The current time, re-rendering every `ms`, so running timers tick between refetches. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
