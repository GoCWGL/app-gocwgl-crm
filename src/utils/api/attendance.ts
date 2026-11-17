import { del, get, post, put } from "./client";
import type { ClientAttendanceOut, ClockInOut, ClockOutOut, ScheduleIn, ScheduleOut, VaAttendanceOut } from "./models";

// VA portal › Attendance: clock in and out for each client.
export const myAttendance = (start: string, end: string) => get<VaAttendanceOut>("/va/attendance", { start, end });
export const attendanceClockIn = (contactId: string) => post<ClockInOut>("/va/attendance/clock-in", { contactId });
export const attendanceClockOut = (contactId: string) => post<ClockOutOut>("/va/attendance/clock-out", { contactId });

// Client portal › Attendance: each VA's schedule, and their on-time, late and absent days.
export const teamAttendance = (start: string, end: string) => get<ClientAttendanceOut>("/portal/attendance", { start, end });
export const setSchedule = (vaId: string, body: ScheduleIn) => put<ScheduleOut>(`/portal/attendance/schedules/${vaId}`, body);
export const clearSchedule = (vaId: string) => del(`/portal/attendance/schedules/${vaId}`);
