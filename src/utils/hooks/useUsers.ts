"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/utils/api/models";
import * as api from "@/utils/api/users";
import { canUseMenu, setUser, useSession } from "@/utils/auth/session";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** The signed-in user (kept in sync with the session store). */
export function useMe() {
  const { user, status } = useSession();
  const query = useQuery({ queryKey: qk.me, queryFn: api.getMe, enabled: status === "authenticated", initialData: user ?? undefined });
  return { ...query, data: (query.data ?? user) as User | null };
}

/**
 * Whether the signed-in teammate may use any of these CRM menus. Data hooks for a menu's own data use it so a
 * teammate without that menu never requests it (the API would refuse anyway).
 */
export function useCanUseMenu(...menus: string[]): boolean {
  const me = useMe().data;
  return menus.some((m) => canUseMenu(me, m));
}

export const useUpdateMe = () =>
  useApiMutation(api.updateMe, {
    invalidate: [qk.me],
    onSuccess: (user) => setUser(user),
  });

export const useMyNotifications = () => useQuery({ queryKey: qk.myNotifications, queryFn: api.getMyNotifications });
export const useSetMyNotifications = () => useApiMutation(api.setMyNotifications, { invalidate: [qk.myNotifications] });

// ------------------------------------------------------------------ Staff team
export const useStaffTeam = (enabled = true) => useQuery({ queryKey: qk.staffTeam, queryFn: api.getStaffTeam, enabled });
export const useInviteStaff = () => useApiMutation(api.inviteStaff, { invalidate: [qk.staffTeam] });
export const useCancelStaffInvitation = () => useApiMutation(api.cancelStaffInvitation, { invalidate: [qk.staffTeam] });
export const useChangeStaffRole = () =>
  useApiMutation((v: { userId: string; role: api.StaffRole }) => api.changeStaffRole(v.userId, v.role), { invalidate: [qk.staffTeam] });
export const useChangeMenuAccess = () =>
  useApiMutation((v: { userId: string; menuAccess: string[] | null }) => api.changeMenuAccess(v.userId, v.menuAccess), {
    invalidate: [qk.staffTeam],
  });
export const useRemoveStaff = () => useApiMutation(api.removeStaff, { invalidate: [qk.staffTeam] });

// ------------------------------------------------------------------ Portal team
export const usePortalTeam = () => useQuery({ queryKey: qk.portalTeam, queryFn: api.getPortalTeam });
export const useInvitePortalMember = () => useApiMutation(api.invitePortalMember, { invalidate: [qk.portalTeam] });
export const useCancelPortalInvitation = () => useApiMutation(api.cancelPortalInvitation, { invalidate: [qk.portalTeam] });
export const useRemovePortalMember = () => useApiMutation(api.removePortalMember, { invalidate: [qk.portalTeam] });
