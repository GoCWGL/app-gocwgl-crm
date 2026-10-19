import { get, post } from "./client";
import type { AuditOut, JobOut, NotificationOut } from "./models";

export const listAuditLog = (filters: { action?: string; actor_id?: string; target_id?: string; before?: string; limit?: number } = {}) =>
  get<AuditOut[]>("/admin/audit-log", filters);
export const listSentAlerts = (filters: { kind?: string; limit?: number } = {}) =>
  get<NotificationOut[]>("/admin/notifications", filters);
export const listJobs = (filters: { status?: string; kind?: string; limit?: number } = {}) => get<JobOut[]>("/admin/jobs", filters);
export const getJobsSummary = () => get<Record<string, number>>("/admin/jobs/summary");
export const retryJob = (id: string) => post<JobOut>(`/admin/jobs/${id}/retry`);
