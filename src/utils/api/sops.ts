import { api, del, download, get, patch, post } from "./client";
import type { ClientSopIn, ClientSopOut, ClientSopUpdate, ClientSopsOut, SopIn, SopOut, SopUpdate, VaClientSopOut, VaClientSopsOut } from "./models";

// Engagement › SOPs (staff).
export const listSops = () => get<SopOut[]>("/admin/sops");
export const createSop = (body: SopIn) => post<SopOut>("/admin/sops", body);
export const updateSop = (id: string, body: SopUpdate) => patch<SopOut>(`/admin/sops/${id}`, body);
export const deleteSop = (id: string) => del(`/admin/sops/${id}`);

// Client portal › SOPs › Your SOPs: written, uploaded or linked, each shared with the VAs you pick.
export const myClientSops = () => get<ClientSopsOut>("/portal/my-sops");
/** Write one (steps and notes) or add a link to a doc elsewhere. */
export const addClientSop = (body: ClientSopIn) => post<ClientSopOut>("/portal/my-sops", body);
/** Upload a document as an SOP; the name defaults to the file's. */
export const uploadClientSop = (file: File, meta: { title?: string; category?: string; summary?: string; vaIds: string[] }) => {
  const form = new FormData();
  form.append("file", file);
  if (meta.title) form.append("title", meta.title);
  if (meta.category) form.append("category", meta.category);
  if (meta.summary) form.append("summary", meta.summary);
  meta.vaIds.forEach((id) => form.append("vaIds", id));
  return post<ClientSopOut>("/portal/my-sops/upload", form);
};
export const updateClientSop = (id: string, body: ClientSopUpdate) => patch<ClientSopOut>(`/portal/my-sops/${id}`, body);
/** A new version of an uploaded SOP. */
export const replaceClientSopFile = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api<ClientSopOut>(`/portal/my-sops/${id}/file`, { method: "PUT", body: form });
};
export const deleteClientSop = (id: string) => del(`/portal/my-sops/${id}`);
/** Open (PDFs, images) or save (Word…) your uploaded SOP. */
export const openClientSopFile = (sop: Pick<ClientSopOut, "id" | "fileName" | "fileType">) =>
  download(`/portal/my-sops/${sop.id}/file`, opensInline(sop.fileType) ? undefined : sop.fileName);

// VA portal: SOPs your clients shared with you.
/** All of them, or one client's (the server refuses a client you don't work for). */
export const sharedClientSops = (clientId?: string) => get<VaClientSopsOut>("/va/client-sops", { client_id: clientId || undefined });
export const openSharedSopFile = (sop: Pick<VaClientSopOut, "id" | "fileName" | "fileType">) =>
  download(`/va/client-sops/${sop.id}/file`, opensInline(sop.fileType) ? undefined : sop.fileName);

/** PDFs, images and videos open in a new tab; other documents are saved. */
const opensInline = (type: string) => type === "application/pdf" || type.startsWith("image/") || type.startsWith("video/");
