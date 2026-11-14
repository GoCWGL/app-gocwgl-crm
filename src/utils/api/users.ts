import { api, del, get, patch, post, put } from "./client";
import type { InvitationOut, MemberOut, ProfileUpdate, RoleChange, TeamOut, User } from "./models";

export type NotificationPrefsMap = Record<string, boolean>;

// ------------------------------------------------------------------ Profile
export const getMe = () => get<User>("/users/me");
export const updateMe = (body: ProfileUpdate) => patch<User>("/users/me", body);
/** Your headshot (PNG, JPG or WebP; the form shrinks photos first). */
export const setMyPhoto = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return api<User>("/users/me/photo", { method: "PUT", body, signal: AbortSignal.timeout(120_000) });
};
export const removeMyPhoto = () => del<User>("/users/me/photo");
/** Where your headshot is fetched from (signed in); null when you have none. */
export const myPhotoPath = (version: string | null | undefined) => (version ? `/users/me/photo?v=${encodeURIComponent(version)}` : null);
export const getMyNotifications = () => get<{ prefs: NotificationPrefsMap }>("/users/me/notifications");
export const setMyNotifications = (prefs: NotificationPrefsMap) =>
  put<{ prefs: NotificationPrefsMap }>("/users/me/notifications", { prefs });

// ------------------------------------------------------------------ Staff team (admin)
export type StaffRole = RoleChange["role"];
export const getStaffTeam = () => get<TeamOut>("/admin/team");
/** `menuAccess`: the CRM menus they may use; null = every menu. */
export const inviteStaff = (body: { email: string; fullName: string; role: StaffRole; menuAccess?: string[] | null }) =>
  post<InvitationOut>("/admin/team/invitations", body);
/** null = every menu. Super admins always have every menu. */
export const changeMenuAccess = (userId: string, menuAccess: string[] | null) => put<MemberOut>(`/admin/team/${userId}/menus`, { menuAccess });
export const cancelStaffInvitation = (id: string) => del(`/admin/team/invitations/${id}`);
export const changeStaffRole = (userId: string, role: StaffRole) => patch<MemberOut>(`/admin/team/${userId}`, { role });
export const removeStaff = (userId: string) => del(`/admin/team/${userId}`);

// ------------------------------------------------------------------ Portal team (client)
export const getPortalTeam = () => get<TeamOut>("/portal/team");
export const invitePortalMember = (body: { email: string; fullName: string; role: "owner" | "viewer" }) =>
  post<InvitationOut>("/portal/team/invitations", body);
export const cancelPortalInvitation = (id: string) => del(`/portal/team/invitations/${id}`);
export const removePortalMember = (userId: string) => del(`/portal/team/${userId}`);
