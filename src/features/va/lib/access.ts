"use client";

import { isStaffAdmin, isVa, useSession } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";

/**
 * Who's using the VA portal: the VA themself, or staff in "View as VA" (a VA picked at /va?as=<id>).
 * `ready`: VA data can load. `readOnly`: staff below admin only look. `staff`: someone from the team is viewing.
 */
export function useVaAccess(): { ready: boolean; readOnly: boolean; staff: boolean } {
  const me = useMe().data;
  const { viewAsVaId } = useSession();
  if (isVa(me)) return { ready: true, readOnly: false, staff: false };
  const staff = !!me?.isStaff;
  return { ready: staff && !!viewAsVaId, readOnly: staff && !isStaffAdmin(me), staff };
}
