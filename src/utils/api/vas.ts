import { del, get, patch, post, put } from "./client";
import type { AgreementOut, VaCreate, VaDetailOut, VaListOut, VaUpdate } from "./models";

// People › VAs (staff).
export const listVas = (q = "") => get<VaListOut>("/admin/vas", q ? { q } : undefined);
export const getVa = (id: string) => get<VaDetailOut>(`/admin/vas/${id}`);
export const createVa = (body: VaCreate) => post<VaDetailOut>("/admin/vas", body);
export const updateVa = (id: string, body: VaUpdate) => patch<VaDetailOut>(`/admin/vas/${id}`, body);
export const setVaClientRate = (id: string, contactId: string, rateCents: number | null) =>
  patch<VaDetailOut>(`/admin/vas/${id}/clients/${contactId}`, { rateCents });
export const setVaClients = (id: string, contactIds: string[]) => put<VaDetailOut>(`/admin/vas/${id}/clients`, { contactIds });
/** Email a VA without a login the link to set their password. */
export const inviteVa = (id: string) => post<VaDetailOut>(`/admin/vas/${id}/invite`);
export const revokeVaInvitation = (id: string) => del<void>(`/admin/vas/invitations/${id}`);
/** The VA agreement for a VA (GoCWGL keeps $1/hr for the first 6 months with each client). Staff and the VA only. */
export const getVaAgreement = (id: string) => get<AgreementOut>(`/admin/vas/${id}/agreement`);
/** Email the agreement to the VA (never the client), for one client or in general. */
export const sendVaAgreement = (id: string, contactId: string | null) =>
  post<AgreementOut>(`/admin/vas/${id}/agreement/send`, { contactId });
