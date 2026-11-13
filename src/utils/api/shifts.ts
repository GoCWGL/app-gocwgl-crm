import { del, get, patch, post } from "./client";
import type {
  ClockInIn,
  DailyReportIn,
  DailyReportOut,
  EntryIn,
  EntryUpdate,
  MyClientsOut,
  MyShiftOut,
  ShiftOut,
  TimeTagIn,
  TimeTagOut,
  VaStatusBoard,
} from "./models";

// Engagement › Status (staff).
export const vaStatusBoard = () => get<VaStatusBoard>("/admin/va-status");

// VA portal › Time tracker: the running timer.
export const myShift = () => get<MyShiftOut>("/va/shift");
export const clockIn = (body: ClockInIn) => post<MyShiftOut>("/va/shift/clock-in", body);
export const toggleBreak = () => post<MyShiftOut>("/va/shift/break");
export const clockOut = () => post<MyShiftOut>("/va/shift/clock-out");

// Entries in a range (ISO datetimes), added by hand, edited, deleted.
export const listEntries = (start: string, end: string) => get<ShiftOut[]>("/va/time/entries", { start, end });
export const addEntry = (body: EntryIn) => post<ShiftOut>("/va/time/entries", body);
export const updateEntry = (id: string, body: EntryUpdate) => patch<ShiftOut>(`/va/time/entries/${id}`, body);
export const deleteEntry = (id: string) => del(`/va/time/entries/${id}`);

// End-of-day reports ("YYYY-MM-DD").
export const listReports = (start: string, end: string) => get<DailyReportOut[]>("/va/time/reports", { start, end });
export const submitReport = (body: DailyReportIn) => post<DailyReportOut>("/va/time/reports", body);

// VA portal › Clients.
export const listMyClients = () => get<MyClientsOut>("/va/clients");
/** Your hourly rate for one client (null = back to your usual rate). Applies to new time. */
export const setMyClientRate = (contactId: string, rateCents: number | null) => patch<MyClientsOut>(`/va/clients/${contactId}`, { rateCents });
/** Keep your current rate for a client: it's fixed until you can ask for a raise (6 months). */
export const acceptRate = (contactId: string) => post<MyClientsOut>(`/va/clients/${contactId}/accept-rate`);
/** Ask a client for $1/h more (every 6 months at most); they approve or decline it. */
export const requestRaise = (contactId: string, note: string) => post<MyClientsOut>(`/va/clients/${contactId}/raise`, { note });
export const withdrawRaise = (contactId: string) => del<MyClientsOut>(`/va/clients/${contactId}/raise`);
/** Add a tag to a client's list (they see who added it). */
export const addClientTag = (contactId: string, body: TimeTagIn) => post<TimeTagOut>(`/va/clients/${contactId}/tags`, body);
