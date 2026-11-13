"use client";

import { useClientTrainings, useVaTeam } from "@/utils/hooks/useClientWork";

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
