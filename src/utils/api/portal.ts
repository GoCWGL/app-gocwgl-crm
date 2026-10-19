import { del, get, patch, post, put } from "./client";
import type {
  AdminFunnelCreate,
  AdminFunnelUpdate,
  ClientActivityOut,
  FunnelCatalogOut,
  FunnelOut,
  FunnelRequestIn,
  HealthCheckIn,
  HealthCheckOut,
  HealthCheckPatch,
  HealthOut,
  IncidentIn,
  IncidentOut,
  IncidentPatch,
  OverviewOut,
  ReportIn,
  ReportOut,
  TodoIn,
  TodoOut,
  TodoPatch,
} from "./models";

export type Range = 7 | 30 | 90;

// ------------------------------------------------------------------ Portal (the API decides whose data this is)
export const getOverview = (range: Range = 30) => get<OverviewOut>("/portal/overview", { range });
export const getPortalActivity = (opts: { before?: string; limit?: number } = {}) =>
  get<ClientActivityOut[]>("/portal/activity", opts);

export const listPortalFunnels = () => get<FunnelOut[]>("/portal/funnels");
export const getFunnelCatalog = () => get<FunnelCatalogOut>("/portal/funnels/catalog");
export const requestFunnel = (body: FunnelRequestIn) => post<FunnelOut>("/portal/funnels/requests", body);
export const updateFunnelRequest = (id: string, body: FunnelRequestIn) => put<FunnelOut>(`/portal/funnels/${id}/request`, body);

export const listPortalTodos = () => get<TodoOut[]>("/portal/todos");
export const completeTodo = (id: string) => post<TodoOut>(`/portal/todos/${id}/complete`);
export const requestTodoChanges = (id: string, text: string) => post<TodoOut>(`/portal/todos/${id}/request-changes`, { text });
export const commentOnTodo = (id: string, text: string) => post<TodoOut>(`/portal/todos/${id}/comments`, { text });

export const listPortalReports = (days: Range = 30) => get<ReportOut[]>("/portal/reports", { days });

export const getPortalHealth = () => get<HealthOut>("/portal/health");
/** Sends the problem to the team as a bug ticket. */
export const reportHealthCheck = (checkId: string) => post<unknown>(`/portal/health/${checkId}/report`);

// ------------------------------------------------------------------ Admin: client portal content
const client = (contactId: string) => `/admin/clients/${contactId}`;

export const listClientTodos = (contactId: string) => get<TodoOut[]>(`${client(contactId)}/todos`);
export const createClientTodo = (contactId: string, body: TodoIn) => post<TodoOut>(`${client(contactId)}/todos`, body);
export const updateClientTodo = (contactId: string, id: string, body: TodoPatch) =>
  patch<TodoOut>(`${client(contactId)}/todos/${id}`, body);
export const deleteClientTodo = (contactId: string, id: string) => del(`${client(contactId)}/todos/${id}`);
export const commentOnClientTodo = (contactId: string, id: string, text: string) =>
  post<TodoOut>(`${client(contactId)}/todos/${id}/comments`, { text });

export const listClientReports = (contactId: string, days?: number) =>
  get<ReportOut[]>(`${client(contactId)}/reports`, { days });
export const saveClientReport = (contactId: string, date: string, body: ReportIn) =>
  put<ReportOut>(`${client(contactId)}/reports/${date}`, body);
export const deleteClientReport = (contactId: string, date: string) => del(`${client(contactId)}/reports/${date}`);

export const getClientHealth = (contactId: string) => get<HealthOut>(`${client(contactId)}/health`);
export const createHealthCheck = (contactId: string, body: HealthCheckIn) =>
  post<HealthCheckOut>(`${client(contactId)}/health-checks`, body);
export const updateHealthCheck = (contactId: string, id: string, body: HealthCheckPatch) =>
  patch<HealthCheckOut>(`${client(contactId)}/health-checks/${id}`, body);
export const deleteHealthCheck = (contactId: string, id: string) => del(`${client(contactId)}/health-checks/${id}`);
export const createIncident = (contactId: string, body: IncidentIn) =>
  post<IncidentOut>(`${client(contactId)}/incidents`, body);
export const updateIncident = (contactId: string, id: string, body: IncidentPatch) =>
  patch<IncidentOut>(`${client(contactId)}/incidents/${id}`, body);
export const deleteIncident = (contactId: string, id: string) => del(`${client(contactId)}/incidents/${id}`);

export const listAdminFunnels = (contactId?: string) => get<FunnelOut[]>("/admin/funnels", { contact_id: contactId });
export const createAdminFunnel = (body: AdminFunnelCreate) => post<FunnelOut>("/admin/funnels", body);
/** `quoteCents` on a custom request sends the client an invoice. */
export const updateAdminFunnel = (id: string, body: AdminFunnelUpdate) => patch<FunnelOut>(`/admin/funnels/${id}`, body);
export const deleteAdminFunnel = (id: string) => del(`/admin/funnels/${id}`);
