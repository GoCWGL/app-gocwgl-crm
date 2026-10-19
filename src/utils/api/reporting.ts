import { get } from "./client";
import type { ActivityOut, ClientActivityOut } from "./models";

/**
 * GET /admin/reports/dashboard. The OpenAPI spec types this as a plain object, so the shape is
 * written here from the backend's ReportingService (its keys are snake_case, unlike the rest of the API).
 */
export type DashboardNumbers = {
  period_days: number;
  new_leads: number;
  /** % change vs the previous period; null when there is nothing to compare with. */
  new_leads_delta: number | null;
  revenue_cents: number;
  revenue_delta: number | null;
  mrr_cents: number;
  active_subscriptions: number;
  /** Contacts per sales stage: { lead, booked, paid, lost }. */
  stages: Record<string, number>;
  sources: Array<{ source: string; count: number }>;
  conversion: { lead_to_call_pct: number; lead_to_paid_pct: number };
  overdue_invoices: { count: number; total_cents: number };
  calls_next_7_days: number;
  /** Open tickets per status. */
  open_tickets: Record<string, number>;
  leads_per_day: Array<{ date: string; leads: number }>;
};

export type DashboardRange = 7 | 30 | 90;

export const getDashboard = (range: DashboardRange = 30) =>
  get<DashboardNumbers>("/admin/reports/dashboard", { range: String(range) });

/** Feeds page with `before` = createdAt of the last item. */
export const listActivity = (opts: { contact_id?: string; before?: string; limit?: number } = {}) =>
  get<ActivityOut[]>("/admin/activity", opts);

export const listPortalActivity = (opts: { before?: string; limit?: number } = {}) =>
  get<ClientActivityOut[]>("/portal/activity", opts);
