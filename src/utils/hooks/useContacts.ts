"use client";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/contacts";
import type { ContactUpdate, PipelineDetail, PipelineUpdate, Stage } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Everything that shows a contact (lists, board, pipelines, dashboards) refreshes after a contact change. */
const CONTACT_KEYS = [qk.contacts, qk.salesBoard, qk.pipelines, qk.tags, ["dashboard"], qk.activity, qk.projects, qk.mediaFolders];

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
export const useSendPortalInvite = () => useApiMutation(api.sendPortalInvite);

// ------------------------------------------------------------------ Tags
export const useTags = () => useQuery({ queryKey: qk.tags, queryFn: api.listTags });
export const useCreateTag = () => useApiMutation(api.createTag, { invalidate: [qk.tags] });
export const useUpdateTag = () =>
  useApiMutation((v: { id: string; name?: string; color?: number }) => api.updateTag(v.id, { name: v.name, color: v.color }), {
    invalidate: [qk.tags, qk.contacts],
  });
export const useDeleteTag = () => useApiMutation(api.deleteTag, { invalidate: [qk.tags, qk.contacts] });

// ------------------------------------------------------------------ Sales board + pipelines
export const useSalesBoard = () => useQuery({ queryKey: qk.salesBoard, queryFn: api.getSalesBoard });
export const useMoveSalesCard = () =>
  useApiMutation((v: { contactId: string; stage: Stage; beforeId?: string | null }) =>
    api.moveSalesCard(v.contactId, { stage: v.stage, beforeId: v.beforeId ?? null }),
  { invalidate: CONTACT_KEYS });

export const usePipelines = () => useQuery({ queryKey: qk.pipelines, queryFn: api.listPipelines });
export const usePipeline = (id: string) => useQuery({ queryKey: qk.pipeline(id), queryFn: () => api.getPipeline(id), enabled: !!id });
export const useCreatePipeline = () => useApiMutation(api.createPipeline, { invalidate: [qk.pipelines] });
export const useUpdatePipeline = () =>
  useApiMutation((v: { id: string; body: PipelineUpdate }) => api.updatePipeline(v.id, v.body), { invalidate: [qk.pipelines] });
export const useDeletePipeline = () => useApiMutation(api.deletePipeline, { invalidate: [qk.pipelines] });
export const useMovePipelineItem = () =>
  useApiMutation((v: { pipelineId: string; contactId: string; stageId: string; beforeId?: string | null }) =>
    api.movePipelineItem(v.pipelineId, { contactId: v.contactId, stageId: v.stageId, beforeId: v.beforeId ?? null }),
  { invalidate: [qk.pipelines] });
export const useRemovePipelineItem = () =>
  useApiMutation((v: { pipelineId: string; contactId: string }) => api.removePipelineItem(v.pipelineId, v.contactId), {
    invalidate: [qk.pipelines],
  });

/** Every custom (non-system) pipeline with its items, for "which stage is this contact in" pickers. */
export function useCustomPipelineDetails() {
  const list = usePipelines();
  const custom = (list.data ?? []).filter((p) => !p.isSystem);
  const details = useQueries({
    queries: custom.map((p) => ({ queryKey: qk.pipeline(p.id), queryFn: () => api.getPipeline(p.id) })),
  });
  return { isPending: list.isPending || details.some((d) => d.isPending), data: details.map((d) => d.data).filter(Boolean) as PipelineDetail[] };
}
