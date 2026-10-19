import { del, get, patch, post, type Page } from "./client";
import type {
  ContactCreate,
  ContactOut,
  ContactUpdate,
  PipelineCreate,
  PipelineDetail,
  PipelineOut,
  PipelineUpdate,
  Stage,
  TagOut,
  TagWithCount,
} from "./models";

export type ContactFilters = {
  q?: string;
  stage?: Stage | "";
  tag_id?: string;
  source?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
};

// ------------------------------------------------------------------ Contacts
export const listContacts = (filters: ContactFilters = {}) => get<Page<ContactOut>>("/admin/contacts", filters);
export const getContact = (id: string) => get<ContactOut>(`/admin/contacts/${id}`);
export const createContact = (body: ContactCreate) => post<ContactOut>("/admin/contacts", body);
export const updateContact = (id: string, body: ContactUpdate) => patch<ContactOut>(`/admin/contacts/${id}`, body);
/** 409 `contact_has_billing` when the contact has invoices or subscriptions: archive instead. */
export const deleteContact = (id: string) => del(`/admin/contacts/${id}`);
export const archiveContact = (id: string) => post<ContactOut>(`/admin/contacts/${id}/archive`);
export const unarchiveContact = (id: string) => post<ContactOut>(`/admin/contacts/${id}/unarchive`);
export const sendPortalInvite = (id: string) => post<unknown>(`/admin/contacts/${id}/portal-invite`);

/** Every contact, page by page (the API caps a page at 100). */
export async function listAllContacts(filters: Omit<ContactFilters, "limit" | "offset"> = {}): Promise<ContactOut[]> {
  const out: ContactOut[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await listContacts({ ...filters, limit: 100, offset });
    out.push(...page.items);
    if (out.length >= page.total || page.items.length === 0) return out;
  }
}

// ------------------------------------------------------------------ Tags
export const listTags = () => get<TagWithCount[]>("/admin/tags");
export const createTag = (body: { name: string; color: number }) => post<TagOut>("/admin/tags", body);
export const updateTag = (id: string, body: { name?: string; color?: number }) => patch<TagOut>(`/admin/tags/${id}`, body);
export const deleteTag = (id: string) => del(`/admin/tags/${id}`);

// ------------------------------------------------------------------ Sales board
export const getSalesBoard = () => get<ContactOut[]>("/admin/sales-board");
export const moveSalesCard = (contactId: string, body: { stage: Stage; beforeId?: string | null }) =>
  post<void>(`/admin/sales-board/${contactId}/move`, body);

// ------------------------------------------------------------------ Custom pipelines
export const listPipelines = () => get<PipelineOut[]>("/admin/pipelines");
export const getPipeline = (id: string) => get<PipelineDetail>(`/admin/pipelines/${id}`);
export const createPipeline = (body: PipelineCreate) => post<PipelineOut>("/admin/pipelines", body);
export const updatePipeline = (id: string, body: PipelineUpdate) => patch<PipelineOut>(`/admin/pipelines/${id}`, body);
export const deletePipeline = (id: string) => del(`/admin/pipelines/${id}`);
export const movePipelineItem = (id: string, body: { contactId: string; stageId: string; beforeId?: string | null }) =>
  post<void>(`/admin/pipelines/${id}/move`, body);
export const removePipelineItem = (id: string, contactId: string) => del(`/admin/pipelines/${id}/items/${contactId}`);
