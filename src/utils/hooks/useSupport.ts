"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClientTicketIn, IntakeKeyIn, PortalIntakeKeyIn, StaffTicketIn, TicketPatch } from "@/utils/api/models";
import * as api from "@/utils/api/support";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useTickets = (filters: { status?: string; type?: string; contact_id?: string } = {}) =>
  useQuery({ queryKey: [...qk.tickets, filters], queryFn: () => api.listTickets(filters) });
export const useCreateTicket = () => useApiMutation((v: StaffTicketIn) => api.createTicket(v), { invalidate: [qk.tickets, ["dashboard"]] });
export const useUpdateTicket = () =>
  useApiMutation((v: { id: string; body: TicketPatch }) => api.updateTicket(v.id, v.body), { invalidate: [qk.tickets, ["dashboard"]] });
export const useDeleteTicket = () => useApiMutation(api.deleteTicket, { invalidate: [qk.tickets, ["dashboard"]] });
export const usePostTicketMessage = () =>
  useApiMutation((v: { id: string; text: string; kind: "reply" | "note" }) => api.postTicketMessage(v.id, { text: v.text, kind: v.kind }), {
    invalidate: [qk.tickets],
  });

export const useIntakeKeys = () => useQuery({ queryKey: qk.intakeKeys, queryFn: () => api.listIntakeKeys() });
export const useCreateIntakeKey = () => useApiMutation((v: IntakeKeyIn) => api.createIntakeKey(v), { invalidate: [qk.intakeKeys] });
export const useRevokeIntakeKey = () => useApiMutation(api.revokeIntakeKey, { invalidate: [qk.intakeKeys] });

export const useInbox = () => useQuery({ queryKey: qk.inbox, queryFn: api.getInbox });
export const useClientChat = (contactId: string) =>
  useQuery({ queryKey: qk.clientChat(contactId), queryFn: () => api.getClientChat(contactId), enabled: !!contactId });
export const useSendClientChat = () =>
  useApiMutation((v: { contactId: string; text: string }) => api.sendClientChat(v.contactId, v.text), { invalidate: [qk.inbox] });

// ------------------------------------------------------------------ Portal
export const usePortalTickets = () => useQuery({ queryKey: qk.portalTickets, queryFn: api.listPortalTickets });
export const useCreatePortalTicket = () => useApiMutation((v: ClientTicketIn) => api.createPortalTicket(v), { invalidate: [qk.portalTickets] });
export const useReplyPortalTicket = () =>
  useApiMutation((v: { id: string; text: string }) => api.replyPortalTicket(v.id, v.text), { invalidate: [qk.portalTickets] });
export const useClosePortalTicket = () => useApiMutation(api.closePortalTicket, { invalidate: [qk.portalTickets] });
export const usePortalMessages = () => useQuery({ queryKey: qk.portalMessages, queryFn: api.listPortalMessages, refetchInterval: 15_000 });
export const useSendPortalMessage = () => useApiMutation(api.sendPortalMessage, { invalidate: [qk.portalMessages] });
export const usePortalIntakeKeys = () => useQuery({ queryKey: qk.portalIntakeKeys, queryFn: api.listPortalIntakeKeys });
export const useCreatePortalIntakeKey = () =>
  useApiMutation((v: PortalIntakeKeyIn) => api.createPortalIntakeKey(v), { invalidate: [qk.portalIntakeKeys] });
export const useRevokePortalIntakeKey = () => useApiMutation(api.revokePortalIntakeKey, { invalidate: [qk.portalIntakeKeys] });
