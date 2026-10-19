import { del, get, patch, post } from "./client";
import type {
  AutomationIn,
  AutomationOut,
  AutomationPatch,
  RunOut,
  SendEmailIn,
  SentEmailOut,
  TemplateIn,
  TemplateOut,
  TemplatePatch,
} from "./models";

// ------------------------------------------------------------------ Templates
export const listTemplates = () => get<TemplateOut[]>("/admin/email-templates");
export const createTemplate = (body: TemplateIn) => post<TemplateOut>("/admin/email-templates", body);
export const updateTemplate = (id: string, body: TemplatePatch) => patch<TemplateOut>(`/admin/email-templates/${id}`, body);
/** Starter templates can't be deleted. */
export const deleteTemplate = (id: string) => del(`/admin/email-templates/${id}`);

// ------------------------------------------------------------------ Emails (sent by a background worker: "Queued" → "Sent")
export const listSentEmails = (limit?: number) => get<SentEmailOut[]>("/admin/emails", { limit });
export const sendEmail = (body: SendEmailIn) => post<SentEmailOut>("/admin/emails", body);

// ------------------------------------------------------------------ Automations
export const listAutomations = () => get<AutomationOut[]>("/admin/automations");
export const createAutomation = (body: AutomationIn) => post<AutomationOut>("/admin/automations", body);
export const updateAutomation = (id: string, body: AutomationPatch) => patch<AutomationOut>(`/admin/automations/${id}`, body);
export const deleteAutomation = (id: string) => del(`/admin/automations/${id}`);
export const listAutomationRuns = (id: string, opts: { status?: string; limit?: number } = {}) =>
  get<RunOut[]>(`/admin/automations/${id}/runs`, opts);
export const cancelAutomationRun = (runId: string) => post<RunOut>(`/admin/automation-runs/${runId}/cancel`);
