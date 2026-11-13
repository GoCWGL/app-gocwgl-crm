import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import type { VaStatus, VaSummary } from "@/utils/api/models";

export const VA_STATUS: Record<VaStatus, { label: string; tab: string; tone: Tone; icon: IconName; hint: string }> = {
  onboarding: { label: "Onboarding", tab: "Onboarding", tone: "amber", icon: "rocket", hint: "Getting set up" },
  active: { label: "Active", tab: "Active VAs", tone: "green", icon: "circleCheck", hint: "Working with clients" },
  inactive: { label: "Inactive", tab: "Inactive VAs", tone: "slate", icon: "clock", hint: "Paused or left" },
};

/** In tab order: People › VAs › Onboarding, Active, Inactive. */
export const VA_STATUSES = Object.keys(VA_STATUS) as VaStatus[];

/** Whether they can sign in to the VA portal yet. */
export const LOGIN_STATUS = {
  active: { label: "Can sign in", tone: "green" },
  invited: { label: "Invited", tone: "sky" },
  none: { label: "No login yet", tone: "slate" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

/** The tab a VA is listed under (a deactivated account counts as inactive). */
export function vaTab(va: Pick<VaSummary, "status" | "isActive">): VaStatus {
  return va.isActive ? va.status : "inactive";
}

/** "$8.00/hr", or "—" when not set. */
export function rateText(cents: number | null | undefined, format: (cents: number) => string): string {
  return cents == null ? "—" : `${format(cents)}/hr`;
}

/**
 * The rate to show for a VA: what GoCWGL pays them, or, when the team hasn't set that, the rate the VA asks
 * for on their resume (marked as asking, since it never sets their pay).
 */
export function vaRate(va: Pick<VaSummary, "hourlyRateCents" | "askingRateCents">): { cents: number | null; asking: boolean } {
  if (va.hourlyRateCents != null) return { cents: va.hourlyRateCents, asking: false };
  return { cents: va.askingRateCents ?? null, asking: va.askingRateCents != null };
}
