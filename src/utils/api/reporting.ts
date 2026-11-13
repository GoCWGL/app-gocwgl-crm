import { del, get, patch, post } from "./client";
import type { ActivityOut, AttendanceIn, AttendanceOut, AttendanceUpdate, ClientActivityOut, InboxOut, TeamReport } from "./models";

/**
 * GET /admin/reports/dashboard. The OpenAPI spec types this as a plain object, so the shape is
 * written here from the backend's ReportingService (its keys are snake_case, unlike the rest of the API).
 */
export type DashboardNumbers = {
  period_days: number;
  /** The custom range asked for ("YYYY-MM-DD"), else null. */
  start: string | null;
  end: string | null;
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
  /** VA accounts added in the period: applications from the sign-in page and VAs the team added. */
  va_signups: number;
  va_signups_delta: number | null;
  vas_per_day: Array<{ date: string; vas: number }>;
};

export type DashboardRange = 7 | 30 | 90;
/** Whole days, inclusive, in the business time zone. */
export type CustomRange = { start: string; end: string };

/** The last 7/30/90 days, or a custom range (which wins when given). */
export const getDashboard = (range: DashboardRange = 30, custom?: CustomRange | null) =>
  get<DashboardNumbers>("/admin/reports/dashboard", custom ? { start: custom.start, end: custom.end } : { range: String(range) });

/** Feeds page with `before` = createdAt of the last item. */
export const listActivity = (opts: { contact_id?: string; before?: string; limit?: number } = {}) =>
  get<ActivityOut[]>("/admin/activity", opts);

/** The notification bell: clients' requests, newest first, with this person's unread count. */
export const getInbox = (opts: { before?: string; limit?: number } = {}) => get<InboxOut>("/admin/activity/inbox", opts);
export const markInboxSeen = () => post<void>("/admin/activity/inbox/seen");

export const listPortalActivity = (opts: { before?: string; limit?: number } = {}) =>
  get<ClientActivityOut[]>("/portal/activity", opts);

// Reports › Team: hours and billing per day / month, and VA meeting attendance. `month` is any day in it ("2026-11-01").
export const getTeamReport = (month: string) => get<TeamReport>("/admin/reports/team", { month });
export const listAttendance = (month: string) => get<AttendanceOut[]>("/admin/reports/attendance", { month });
export const logAttendance = (body: AttendanceIn) => post<AttendanceOut>("/admin/reports/attendance", body);
export const updateAttendance = (id: string, body: AttendanceUpdate) => patch<AttendanceOut>(`/admin/reports/attendance/${id}`, body);
export const deleteAttendance = (id: string) => del(`/admin/reports/attendance/${id}`);
