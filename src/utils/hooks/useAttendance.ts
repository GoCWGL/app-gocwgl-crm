"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/attendance";
import type { ScheduleIn } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Refreshed every minute so late / missing statuses move on without a reload. */
export const useMyAttendance = (start: string, end: string, enabled = true) =>
  useQuery({
    queryKey: [...qk.vaAttendance, start, end],
    queryFn: () => api.myAttendance(start, end),
    enabled: enabled && !!start && !!end,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
export const useAttendanceClockIn = () => useApiMutation(api.attendanceClockIn, { invalidate: [qk.vaAttendance] });
export const useAttendanceClockOut = () => useApiMutation(api.attendanceClockOut, { invalidate: [qk.vaAttendance] });

export const useTeamAttendance = (start: string, end: string) =>
  useQuery({
    queryKey: [...qk.portalAttendance, start, end],
    queryFn: () => api.teamAttendance(start, end),
    enabled: !!start && !!end,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
export const useSetSchedule = () =>
  useApiMutation((v: { vaId: string; body: ScheduleIn }) => api.setSchedule(v.vaId, v.body), { invalidate: [qk.portalAttendance] });
export const useClearSchedule = () => useApiMutation(api.clearSchedule, { invalidate: [qk.portalAttendance] });
