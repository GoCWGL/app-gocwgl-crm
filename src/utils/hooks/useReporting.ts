"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as tools from "@/utils/api/admin-tools";
import * as api from "@/utils/api/reporting";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useDashboard = (range: api.DashboardRange = 30, custom?: api.CustomRange | null) =>
  useQuery({
    queryKey: custom ? [...qk.dashboard(range), custom.start, custom.end] : qk.dashboard(range),
    queryFn: () => api.getDashboard(range, custom),
    placeholderData: keepPreviousData,
  });

export const useActivity = (opts: { contact_id?: string; limit?: number } = {}) =>
  useQuery({ queryKey: [...qk.activity, opts], queryFn: () => api.listActivity(opts) });

/** Checks for new requests every minute, and whenever the tab comes back into focus. */
export const useInbox = () => useQuery({ queryKey: qk.activityInbox, queryFn: () => api.getInbox({ limit: 30 }), refetchInterval: 60_000 });
export const useMarkInboxSeen = () => useApiMutation(api.markInboxSeen, { invalidate: [qk.activityInbox] });

// ------------------------------------------------------------------ Owner / admin tools
export const useAuditLog = (filters: Parameters<typeof tools.listAuditLog>[0] = {}) =>
  useQuery({ queryKey: [...qk.auditLog, filters], queryFn: () => tools.listAuditLog(filters) });
export const useSentAlerts = () => useQuery({ queryKey: qk.sentAlerts, queryFn: () => tools.listSentAlerts({ limit: 100 }) });
export const useJobs = (filters: Parameters<typeof tools.listJobs>[0] = {}) =>
  useQuery({ queryKey: [...qk.jobs, filters], queryFn: () => tools.listJobs(filters) });
export const useJobsSummary = () => useQuery({ queryKey: [...qk.jobs, "summary"], queryFn: tools.getJobsSummary });
export const useRetryJob = () => useApiMutation(tools.retryJob, { invalidate: [qk.jobs] });
