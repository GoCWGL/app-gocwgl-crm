"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/contacts";
import type { ContactUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Everything that shows a contact (lists, dashboards) refreshes after a contact change. */
const CONTACT_KEYS = [qk.contacts, qk.tags, ["dashboard"], qk.activity, qk.projects, qk.mediaFolders, qk.affiliates, qk.referrals];

/** One page of contacts (paged: use `total`). */
export const useContactsPage = (filters: api.ContactFilters) =>
  useQuery({ queryKey: [...qk.contacts, "page", filters], queryFn: () => api.listContacts(filters), placeholderData: keepPreviousData });

/** Every contact (all pages), for pickers and counts. */
export const useAllContacts = (filters: Omit<api.ContactFilters, "limit" | "offset"> = {}, enabled = true) =>
  useQuery({ queryKey: [...qk.contacts, "all", filters], queryFn: () => api.listAllContacts(filters), enabled });

export const useContact = (id: string) => useQuery({ queryKey: qk.contact(id), queryFn: () => api.getContact(id), enabled: !!id });

export const useCreateContact = () => useApiMutation(api.createContact, { invalidate: CONTACT_KEYS });
export const useUpdateContact = () =>
  useApiMutation((v: { id: string; body: ContactUpdate }) => api.updateContact(v.id, v.body), { invalidate: CONTACT_KEYS });
export const useDeleteContact = () => useApiMutation(api.deleteContact, { invalidate: CONTACT_KEYS });
export const useArchiveContact = () => useApiMutation(api.archiveContact, { invalidate: CONTACT_KEYS });
export const useUnarchiveContact = () => useApiMutation(api.unarchiveContact, { invalidate: CONTACT_KEYS });
export const useSendPortalInvite = () => useApiMutation(api.sendPortalInvite, { invalidate: (_, id) => [qk.portalLogin(id)] });
export const usePortalLogin = (id: string) => useQuery({ queryKey: qk.portalLogin(id), queryFn: () => api.getPortalLogin(id), enabled: !!id });
export const useSetContactPassword = () =>
  useApiMutation((v: { id: string; password: string; notify?: boolean }) => api.setContactPassword(v.id, { password: v.password, notify: v.notify }), {
    invalidate: (_, v) => [qk.portalLogin(v.id)],
  });
export const useSendPasswordReset = () => useApiMutation(api.sendContactPasswordReset);

// ------------------------------------------------------------------ Tags
export const useTags = () => useQuery({ queryKey: qk.tags, queryFn: api.listTags });
export const useCreateTag = () => useApiMutation(api.createTag, { invalidate: [qk.tags] });
export const useUpdateTag = () =>
  useApiMutation((v: { id: string; name?: string; color?: number }) => api.updateTag(v.id, { name: v.name, color: v.color }), {
    invalidate: [qk.tags, qk.contacts],
  });
export const useDeleteTag = () => useApiMutation(api.deleteTag, { invalidate: [qk.tags, qk.contacts] });

// ------------------------------------------------------------------ Team notes
export const useContactNotes = (contactId: string) =>
  useQuery({ queryKey: qk.contactNotes(contactId), queryFn: () => api.listContactNotes(contactId), enabled: !!contactId });
export const useAddContactNote = () =>
  useApiMutation((v: { contactId: string; text: string; mentionIds?: string[] }) => api.addContactNote(v.contactId, v.text, v.mentionIds), {
    invalidate: (_, v) => [qk.contactNotes(v.contactId)],
  });
export const useEditContactNote = () =>
  useApiMutation(
    (v: { contactId: string; noteId: string; text: string; mentionIds?: string[] }) => api.editContactNote(v.contactId, v.noteId, v.text, v.mentionIds),
    {
      invalidate: (_, v) => [qk.contactNotes(v.contactId)],
    },
  );
export const useDeleteContactNote = () =>
  useApiMutation((v: { contactId: string; noteId: string }) => api.deleteContactNote(v.contactId, v.noteId), {
    invalidate: (_, v) => [qk.contactNotes(v.contactId)],
  });
