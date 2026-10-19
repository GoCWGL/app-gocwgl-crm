"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/marketing";
import type { AutomationPatch, TemplatePatch } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useTemplates = () => useQuery({ queryKey: qk.templates, queryFn: api.listTemplates });
export const useCreateTemplate = () => useApiMutation(api.createTemplate, { invalidate: [qk.templates] });
export const useUpdateTemplate = () =>
  useApiMutation((v: { id: string; body: TemplatePatch }) => api.updateTemplate(v.id, v.body), { invalidate: [qk.templates] });
export const useDeleteTemplate = () => useApiMutation(api.deleteTemplate, { invalidate: [qk.templates] });

/** Emails go out from a background worker: while any is "Queued", check again every few seconds. */
export const useSentEmails = () =>
  useQuery({
    queryKey: qk.sentEmails,
    queryFn: () => api.listSentEmails(50),
    refetchInterval: (q) => (q.state.data?.some((m) => m.status === "Queued") ? 4000 : false),
  });
export const useSendEmail = () => useApiMutation(api.sendEmail, { invalidate: [qk.sentEmails, qk.activity] });

export const useAutomations = () => useQuery({ queryKey: qk.automations, queryFn: api.listAutomations });
export const useCreateAutomation = () => useApiMutation(api.createAutomation, { invalidate: [qk.automations] });
export const useUpdateAutomation = () =>
  useApiMutation((v: { id: string; body: AutomationPatch }) => api.updateAutomation(v.id, v.body), { invalidate: [qk.automations] });
export const useDeleteAutomation = () => useApiMutation(api.deleteAutomation, { invalidate: [qk.automations] });
export const useAutomationRuns = (id: string) =>
  useQuery({ queryKey: qk.automationRuns(id), queryFn: () => api.listAutomationRuns(id, { limit: 50 }), enabled: !!id });
export const useCancelAutomationRun = () =>
  useApiMutation((v: { runId: string; automationId: string }) => api.cancelAutomationRun(v.runId), {
    invalidate: (_, v) => [qk.automationRuns(v.automationId), qk.automations],
  });
