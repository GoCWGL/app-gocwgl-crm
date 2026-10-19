import { del, get, patch, post } from "./client";
import type { ChatOut, ClientTicketIn, InboxRow, StaffTicketIn, TicketOut, TicketPatch } from "./models";

// ------------------------------------------------------------------ Admin tickets
export const listTickets = (filters: { status?: string; type?: string; contact_id?: string } = {}) =>
  get<TicketOut[]>("/admin/tickets", filters);
export const getTicket = (id: string) => get<TicketOut>(`/admin/tickets/${id}`);
export const createTicket = (body: StaffTicketIn) => post<TicketOut>("/admin/tickets", body);
export const updateTicket = (id: string, body: TicketPatch) => patch<TicketOut>(`/admin/tickets/${id}`, body);
export const deleteTicket = (id: string) => del(`/admin/tickets/${id}`);
/** `kind: "note"` is team-only and never shown to the client. */
export const postTicketMessage = (id: string, body: { text: string; kind: "reply" | "note" }) =>
  post<TicketOut>(`/admin/tickets/${id}/messages`, body);

// ------------------------------------------------------------------ Admin client chat
export const getInbox = () => get<InboxRow[]>("/admin/messages");
export const getClientChat = (contactId: string) => get<ChatOut[]>(`/admin/messages/${contactId}`);
export const sendClientChat = (contactId: string, text: string) => post<ChatOut>(`/admin/messages/${contactId}`, { text });

// ------------------------------------------------------------------ Portal
export const listPortalTickets = () => get<TicketOut[]>("/portal/tickets");
export const getPortalTicket = (id: string) => get<TicketOut>(`/portal/tickets/${id}`);
export const createPortalTicket = (body: ClientTicketIn) => post<TicketOut>("/portal/tickets", body);
/** Replying reopens a closed request. */
export const replyPortalTicket = (id: string, text: string) => post<TicketOut>(`/portal/tickets/${id}/messages`, { text });
export const closePortalTicket = (id: string) => post<TicketOut>(`/portal/tickets/${id}/close`);
export const listPortalMessages = () => get<ChatOut[]>("/portal/messages");
export const sendPortalMessage = (text: string) => post<ChatOut>("/portal/messages", { text });
