import { formatShort } from "@/utils/format/dates";

/** Same as the API: a VA referral bonus is earned once the referred VA has tracked 8+ hours of client work a day on 30 days. */
export const BONUS_HOURS = 8;
export const BONUS_DAYS = 30;
export const BONUS_RULE = `${BONUS_HOURS}+ hours a day on ${BONUS_DAYS} days`;

/** "12 of 30 days with 8+ hours" while pending; "Earned Dec 1, 2026" once earned; "" when paid. */
export function bonusProgress(r: { bonusStatus: string; qualifyingDays?: number | null; earnedOn?: string | null; restartedOn?: string | null }): string {
  if (r.bonusStatus === "pending") {
    const progress = `${r.qualifyingDays ?? 0} of ${BONUS_DAYS} days with ${BONUS_HOURS}+ hours`;
    return r.restartedOn ? `${progress} · restarted ${formatShort(r.restartedOn)} (no clients left)` : progress;
  }
  if (r.bonusStatus === "earned" && r.earnedOn) return `Earned ${formatShort(r.earnedOn)}`;
  return "";
}
