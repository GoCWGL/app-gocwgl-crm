import { del, get, patch, post, put } from "./client";
import type { InvitationOut, MemberOut, ProfileUpdate, RoleChange, TeamOut, User } from "./models";

export type NotificationPrefsMap = Record<string, boolean>;

// ------------------------------------------------------------------ Profile
export const getMe = () => get<User>("/users/me");
export const updateMe = (body: ProfileUpdate) => patch<User>("/users/me", body);
export const getMyNotifications = () => get<{ prefs: NotificationPrefsMap }>("/users/me/notifications");
export const setMyNotifications = (prefs: NotificationPrefsMap) =>
  put<{ prefs: NotificationPrefsMap }>("/users/me/notifications", { prefs });

// ------------------------------------------------------------------ Staff team (admin)
export type StaffRole = RoleChange["role"];
export const getStaffTeam = () => get<TeamOut>("/admin/team");
export const inviteStaff = (body: { email: string; fullName: string; role: StaffRole }) =>
  post<InvitationOut>("/admin/team/invitations", body);
export const cancelStaffInvitation = (id: string) => del(`/admin/team/invitations/${id}`);
export const changeStaffRole = (userId: string, role: StaffRole) => patch<MemberOut>(`/admin/team/${userId}`, { role });
export const removeStaff = (userId: string) => del(`/admin/team/${userId}`);

// ------------------------------------------------------------------ Portal team (client)
export const getPortalTeam = () => get<TeamOut>("/portal/team");
export const invitePortalMember = (body: { email: string; fullName: string; role: "owner" | "viewer" }) =>
  post<InvitationOut>("/portal/team/invitations", body);
export const cancelPortalInvitation = (id: string) => del(`/portal/team/invitations/${id}`);
export const removePortalMember = (userId: string) => del(`/portal/team/${userId}`);
