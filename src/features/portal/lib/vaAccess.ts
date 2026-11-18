"use client";

import { useClientTrainings, useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
import { useOverview } from "@/utils/hooks/usePortal";

/**
 * Whether this client has an active VA (one working with them now). Until then the "My VA team" and
 * "Learn & support" menus stay hidden. `known` is false while loading.
 */
export function useHasVaWork(): { known: boolean; has: boolean } {
  const team = useVaTeam();
  return { known: team.isSuccess, has: (team.data ?? []).length > 0 };
}

/** Whether GoCWGL has assigned this client any training. Until then the Training menu stays hidden. */
export function useHasTraining(): { known: boolean; has: boolean } {
  const trainings = useClientTrainings();
  return { known: trainings.isSuccess, has: (trainings.data ?? []).length > 0 };
}

/**
 * The CRM packages ("Request CRM") show unless the team turned them off for this client; the Funnel packages
 * ("Request Funnel") and VA packages ("Request VA") only once the team turns them on.
 */
export function useShowPackages(kind: "crm" | "funnels" | "va"): boolean {
  const overview = useOverview(30).data;
  if (kind === "va") return overview?.showVaPackages === true;
  if (kind === "funnels") return overview?.showFunnelPackages === true;
  return overview?.showCrmPackages !== false;
}

/**
 * Whether the client wants the time tracker (VA tracker) and Attendance: on when any of their VA requests (not
 * cancelled, declined or inactive) turned it on. Off by default, so the Time & activity menu stays hidden until then.
 */
export function useVaTools(): { timeTracker: boolean; attendance: boolean } {
  const requests = (useVaRequests().data ?? []).filter((r) => !["cancelled", "declined", "inactive"].includes(r.status));
  return {
    timeTracker: requests.some((r) => r.wantsTimeTracker === true),
    attendance: requests.some((r) => r.wantsAttendance === true),
  };
}
