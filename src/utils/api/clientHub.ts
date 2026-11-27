import { del, get, patch, post } from "./client";
import type {
  AnnouncementIn,
  AnnouncementOut,
  AnnouncementUpdate,
  AppointmentOut,
  MyFormsOut,
  RecordingIn,
  RecordingOut,
  RecordingUpdate,
  SharedFormIn,
  SharedFormOut,
} from "./models";

// ------------------------------------------------------------------ Client portal › CRM
/** My Sessions › My Recordings: recordings of their sessions with GoCWGL. */
export const listMyRecordings = () => get<RecordingOut[]>("/portal/recordings");
/** My Sessions › My Appointments: calls they booked with GoCWGL. */
export const listMyAppointments = () => get<AppointmentOut[]>("/portal/appointments");
/** Updates & Resources › Announcements. */
export const listMyAnnouncements = () => get<AnnouncementOut[]>("/portal/announcements");
/** Updates & Resources › My Forms: forms to fill in, and the forms they sent. */
export const getMyForms = () => get<MyFormsOut>("/portal/my-forms");

// ------------------------------------------------------------------ Admin
export const listClientRecordings = (contactId: string) => get<RecordingOut[]>(`/admin/contacts/${contactId}/recordings`);
export const addClientRecording = (contactId: string, body: RecordingIn) => post<RecordingOut>(`/admin/contacts/${contactId}/recordings`, body);
export const updateRecording = (id: string, body: RecordingUpdate) => patch<RecordingOut>(`/admin/recordings/${id}`, body);
export const deleteRecording = (id: string) => del(`/admin/recordings/${id}`);

export const listAnnouncements = () => get<AnnouncementOut[]>("/admin/announcements");
export const createAnnouncement = (body: AnnouncementIn) => post<AnnouncementOut>("/admin/announcements", body);
export const updateAnnouncement = (id: string, body: AnnouncementUpdate) => patch<AnnouncementOut>(`/admin/announcements/${id}`, body);
export const deleteAnnouncement = (id: string) => del(`/admin/announcements/${id}`);

export const listClientSharedForms = (contactId: string) => get<SharedFormOut[]>(`/admin/contacts/${contactId}/shared-forms`);
export const shareForm = (contactId: string, body: SharedFormIn) => post<SharedFormOut>(`/admin/contacts/${contactId}/shared-forms`, body);
export const unshareForm = (id: string) => del(`/admin/shared-forms/${id}`);
