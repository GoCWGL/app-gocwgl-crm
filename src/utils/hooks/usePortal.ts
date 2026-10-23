"use client";

import { useQuery } from "@tanstack/react-query";
import { markInvoicePaid, sendInvoice } from "@/utils/api/billing";
import * as api from "@/utils/api/portal";
import type {
  AdminFunnelCreate,
  AdminFunnelUpdate,
  FunnelRequestIn,
  HealthCheckIn,
  HealthCheckPatch,
  IncidentIn,
  IncidentPatch,
  ReportIn,
  TodoIn,
  TodoPatch,
} from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Portal (signed-in client, or staff "view as")
export const useOverview = (range: api.Range) => useQuery({ queryKey: qk.overview(range), queryFn: () => api.getOverview(range) });

export const usePortalFunnels = () => useQuery({ queryKey: qk.portalFunnels, queryFn: api.listPortalFunnels });
export const useFunnelCatalog = () => useQuery({ queryKey: qk.funnelCatalog, queryFn: api.getFunnelCatalog, staleTime: 5 * 60_000 });
/** A request creates an invoice automatically, so billing refreshes too. */
export const useRequestFunnel = () => useApiMutation(api.requestFunnel, { invalidate: [qk.portalFunnels, qk.portalBilling, ["portal", "overview"]] });
export const useUpdateFunnelRequest = () =>
  useApiMutation((v: { id: string; body: FunnelRequestIn }) => api.updateFunnelRequest(v.id, v.body), {
    invalidate: [qk.portalFunnels, qk.portalBilling],
  });
/** Voids the request's invoice, so billing refreshes too. */
export const useCancelFunnelRequest = () =>
  useApiMutation(api.cancelFunnelRequest, { invalidate: [qk.portalFunnels, qk.portalBilling, ["portal", "overview"]] });

const TODO_KEYS = [qk.portalTodos, ["portal", "overview"]];
export const usePortalTodos = () => useQuery({ queryKey: qk.portalTodos, queryFn: api.listPortalTodos });
export const useCompleteTodo = () => useApiMutation(api.completeTodo, { invalidate: TODO_KEYS });
export const useRequestTodoChanges = () =>
  useApiMutation((v: { id: string; text: string }) => api.requestTodoChanges(v.id, v.text), { invalidate: TODO_KEYS });
export const useCommentOnTodo = () => useApiMutation((v: { id: string; text: string }) => api.commentOnTodo(v.id, v.text), { invalidate: TODO_KEYS });

// ------------------------------------------------------------------ Admin: a client's portal content
export const useClientTodos = (contactId: string) =>
  useQuery({ queryKey: qk.clientTodos(contactId), queryFn: () => api.listClientTodos(contactId), enabled: !!contactId });
export const useCreateClientTodo = () =>
  useApiMutation((v: { contactId: string; body: TodoIn }) => api.createClientTodo(v.contactId, v.body), {
    invalidate: (_, v) => [qk.clientTodos(v.contactId)],
  });
export const useUpdateClientTodo = () =>
  useApiMutation((v: { contactId: string; id: string; body: TodoPatch }) => api.updateClientTodo(v.contactId, v.id, v.body), {
    invalidate: (_, v) => [qk.clientTodos(v.contactId)],
  });
export const useDeleteClientTodo = () =>
  useApiMutation((v: { contactId: string; id: string }) => api.deleteClientTodo(v.contactId, v.id), {
    invalidate: (_, v) => [qk.clientTodos(v.contactId)],
  });
export const useCommentOnClientTodo = () =>
  useApiMutation((v: { contactId: string; id: string; text: string }) => api.commentOnClientTodo(v.contactId, v.id, v.text), {
    invalidate: (_, v) => [qk.clientTodos(v.contactId)],
  });

export const useClientReports = (contactId: string, days?: number) =>
  useQuery({ queryKey: [...qk.clientReports(contactId), days ?? 30], queryFn: () => api.listClientReports(contactId, days), enabled: !!contactId });
export const useSaveClientReport = () =>
  useApiMutation((v: { contactId: string; date: string; body: ReportIn }) => api.saveClientReport(v.contactId, v.date, v.body), {
    invalidate: (_, v) => [qk.clientReports(v.contactId)],
  });
export const useDeleteClientReport = () =>
  useApiMutation((v: { contactId: string; date: string }) => api.deleteClientReport(v.contactId, v.date), {
    invalidate: (_, v) => [qk.clientReports(v.contactId)],
  });

export const useClientHealth = (contactId: string) =>
  useQuery({ queryKey: qk.clientHealth(contactId), queryFn: () => api.getClientHealth(contactId), enabled: !!contactId });
const healthKeys = (contactId: string) => [qk.clientHealth(contactId)];
export const useCreateHealthCheck = () =>
  useApiMutation((v: { contactId: string; body: HealthCheckIn }) => api.createHealthCheck(v.contactId, v.body), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });
export const useUpdateHealthCheck = () =>
  useApiMutation((v: { contactId: string; id: string; body: HealthCheckPatch }) => api.updateHealthCheck(v.contactId, v.id, v.body), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });
export const useDeleteHealthCheck = () =>
  useApiMutation((v: { contactId: string; id: string }) => api.deleteHealthCheck(v.contactId, v.id), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });
export const useCreateIncident = () =>
  useApiMutation((v: { contactId: string; body: IncidentIn }) => api.createIncident(v.contactId, v.body), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });
export const useUpdateIncident = () =>
  useApiMutation((v: { contactId: string; id: string; body: IncidentPatch }) => api.updateIncident(v.contactId, v.id, v.body), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });
export const useDeleteIncident = () =>
  useApiMutation((v: { contactId: string; id: string }) => api.deleteIncident(v.contactId, v.id), {
    invalidate: (_, v) => healthKeys(v.contactId),
  });

export const useAdminFunnels = (contactId?: string) =>
  useQuery({ queryKey: [...qk.adminFunnels, contactId ?? "all"], queryFn: () => api.listAdminFunnels(contactId) });
export const useCreateAdminFunnel = () => useApiMutation((v: AdminFunnelCreate) => api.createAdminFunnel(v), { invalidate: [qk.adminFunnels] });
/** A quote on a custom request sends the client an invoice. */
export const useUpdateAdminFunnel = () =>
  useApiMutation((v: { id: string; body: AdminFunnelUpdate }) => api.updateAdminFunnel(v.id, v.body), { invalidate: [qk.adminFunnels, qk.invoices] });
export const useDeleteAdminFunnel = () => useApiMutation(api.deleteAdminFunnel, { invalidate: [qk.adminFunnels] });
export const useStartFunnelBuild = () =>
  useApiMutation(api.startFunnelBuild, { invalidate: [qk.adminFunnels, qk.projects, ["dashboard"]] });
/** Emails (or re-emails) a funnel request's invoice, with its package's Wise link. */
export const useSendFunnelInvoice = () => useApiMutation(sendInvoice, { invalidate: [qk.adminFunnels, qk.invoices, qk.portalBilling] });
/** Wise payments arrive outside the app: marking the invoice paid moves the funnel into the build queue. */
export const useMarkFunnelPaid = () =>
  useApiMutation(markInvoicePaid, { invalidate: [qk.adminFunnels, qk.invoices, qk.portalBilling, ["dashboard"]] });
