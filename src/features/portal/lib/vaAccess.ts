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
 * Whether the team turned on the Funnel menu for this client (the client profile's Portal menu switch). Off by
 * default: until then the whole Funnel menu is hidden and the Funnels page opens the dashboard. `known` is false
 * while loading.
 */
export function useFunnelMenu(): { known: boolean; has: boolean } {
  const overview = useOverview(30);
  return { known: overview.isSuccess, has: overview.data?.showFunnelPackages === true };
}

/**
 * The CRM packages ("Request CRM") and VA packages ("Request VA") show unless the team turned them off for this client;
 * the Funnel packages ("Request Funnel", with the whole Funnel menu) only once the team turns them on.
 */
export function useShowPackages(kind: "crm" | "funnels" | "va"): boolean {
  const overview = useOverview(30).data;
  if (kind === "va") return overview?.showVaPackages !== false;
  if (kind === "funnels") return overview?.showFunnelPackages === true;
  return overview?.showCrmPackages !== false;
}

/**
 * Whether the client wants the time tracker (VA tracker) and Attendance: on when any of their VA requests (not
 * cancelled, declined or inactive) turned it on. Off by default, so the Time & activity menu stays hidden until then.
 */
export function useVaTools(): { timeTracker: boolean; attendance: boolean; known: boolean } {
  const query = useVaRequests();
  const requests = (query.data ?? []).filter((r) => !["cancelled", "declined", "inactive"].includes(r.status));
  return {
    timeTracker: requests.some((r) => r.wantsTimeTracker === true),
    attendance: requests.some((r) => r.wantsAttendance === true),
    known: query.isSuccess,
  };
}
