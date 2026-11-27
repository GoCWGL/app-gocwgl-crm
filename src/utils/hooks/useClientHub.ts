"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/clientHub";
import type { AnnouncementIn, AnnouncementUpdate, RecordingIn, RecordingUpdate, SharedFormIn } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Client portal › CRM
export const useMyRecordings = () => useQuery({ queryKey: qk.portalRecordings, queryFn: api.listMyRecordings });
export const useMyAppointments = () => useQuery({ queryKey: qk.portalAppointments, queryFn: api.listMyAppointments });
export const useMyAnnouncements = () => useQuery({ queryKey: qk.portalAnnouncements, queryFn: api.listMyAnnouncements });
export const useMyForms = () => useQuery({ queryKey: qk.portalForms, queryFn: api.getMyForms });

// ------------------------------------------------------------------ Admin
export const useClientRecordings = (contactId: string) =>
  useQuery({ queryKey: qk.clientRecordings(contactId), queryFn: () => api.listClientRecordings(contactId), enabled: !!contactId });
export const useAddClientRecording = () =>
  useApiMutation((v: { contactId: string; body: RecordingIn }) => api.addClientRecording(v.contactId, v.body), {
    invalidate: (_, v) => [qk.clientRecordings(v.contactId)],
  });
export const useUpdateRecording = () =>
  useApiMutation((v: { id: string; contactId: string; body: RecordingUpdate }) => api.updateRecording(v.id, v.body), {
    invalidate: (_, v) => [qk.clientRecordings(v.contactId)],
  });
export const useDeleteRecording = () =>
  useApiMutation((v: { id: string; contactId: string }) => api.deleteRecording(v.id), { invalidate: (_, v) => [qk.clientRecordings(v.contactId)] });

export const useAnnouncements = () => useQuery({ queryKey: qk.announcements, queryFn: api.listAnnouncements });
export const useCreateAnnouncement = () => useApiMutation((body: AnnouncementIn) => api.createAnnouncement(body), { invalidate: [qk.announcements] });
export const useUpdateAnnouncement = () =>
  useApiMutation((v: { id: string; body: AnnouncementUpdate }) => api.updateAnnouncement(v.id, v.body), { invalidate: [qk.announcements] });
export const useDeleteAnnouncement = () => useApiMutation((id: string) => api.deleteAnnouncement(id), { invalidate: [qk.announcements] });

export const useClientSharedForms = (contactId: string) =>
  useQuery({ queryKey: qk.clientSharedForms(contactId), queryFn: () => api.listClientSharedForms(contactId), enabled: !!contactId });
export const useShareForm = () =>
  useApiMutation((v: { contactId: string; body: SharedFormIn }) => api.shareForm(v.contactId, v.body), {
    invalidate: (_, v) => [qk.clientSharedForms(v.contactId)],
  });
export const useUnshareForm = () =>
  useApiMutation((v: { id: string; contactId: string }) => api.unshareForm(v.id), { invalidate: (_, v) => [qk.clientSharedForms(v.contactId)] });
