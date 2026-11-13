"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/utils/api/shifts";
import type { EntryUpdate, MyShiftOut, TimeTagIn } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

/** Engagement › Status: refreshes every 30 seconds while the page is open. */
export const useVaStatus = () => useQuery({ queryKey: qk.vaStatus, queryFn: api.vaStatusBoard, refetchInterval: 30_000 });

// VA portal › Time tracker
export const useMyShift = (enabled = true) => useQuery({ queryKey: qk.myShift, queryFn: api.myShift, enabled, refetchInterval: 60_000 });
export const useTimeEntries = (start: string, end: string, enabled = true) =>
  useQuery({ queryKey: [...qk.myTime, "entries", start, end], queryFn: () => api.listEntries(start, end), enabled, placeholderData: keepPreviousData });
export const useDailyReports = (start: string, end: string, enabled = true) =>
  useQuery({ queryKey: [...qk.myTime, "reports", start, end], queryFn: () => api.listReports(start, end), enabled });
export const useSetMyClientRate = () => {
  const qc = useQueryClient();
  return useApiMutation((v: { contactId: string; rateCents: number | null }) => api.setMyClientRate(v.contactId, v.rateCents), {
    invalidate: [qk.myClients],
    onSuccess: (data) => qc.setQueryData(qk.myClients, data),
  });
};
export const useAcceptRate = () => {
  const qc = useQueryClient();
  return useApiMutation((contactId: string) => api.acceptRate(contactId), { onSuccess: (data) => qc.setQueryData(qk.myClients, data) });
};
export const useRequestRaise = () => {
  const qc = useQueryClient();
  return useApiMutation((v: { contactId: string; note: string }) => api.requestRaise(v.contactId, v.note), {
    onSuccess: (data) => qc.setQueryData(qk.myClients, data),
  });
};
export const useWithdrawRaise = () => {
  const qc = useQueryClient();
  return useApiMutation((contactId: string) => api.withdrawRaise(contactId), { onSuccess: (data) => qc.setQueryData(qk.myClients, data) });
};
export const useAddClientTag = () =>
  useApiMutation((v: { contactId: string; name: string; color?: TimeTagIn["color"] }) => api.addClientTag(v.contactId, { name: v.name, color: v.color ?? "blue" }), {
    invalidate: [qk.myClients],
  });
export const useMyClients = (enabled = true) => useQuery({ queryKey: qk.myClients, queryFn: api.listMyClients, enabled });

/** Everything a change to time touches: the timer, the entry lists and totals, clients' hours, the staff board. */
const TIME_KEYS = [qk.myShift, qk.myTime, qk.myClients, qk.vaStatus];

/** Timer actions answer with the new state, so it goes straight into the cache. */
function useShiftAction<V>(fn: (v: V) => Promise<MyShiftOut>) {
  const qc = useQueryClient();
  return useApiMutation(fn, { invalidate: TIME_KEYS, onSuccess: (data) => qc.setQueryData(qk.myShift, data) });
}
export const useClockIn = () => useShiftAction(api.clockIn);
export const useToggleBreak = () => useShiftAction<void>(() => api.toggleBreak());
export const useClockOut = () => useShiftAction<void>(() => api.clockOut());

export const useAddEntry = () => useApiMutation(api.addEntry, { invalidate: TIME_KEYS });
export const useUpdateEntry = () =>
  useApiMutation((v: { id: string; body: EntryUpdate }) => api.updateEntry(v.id, v.body), { invalidate: TIME_KEYS });
export const useDeleteEntry = () => useApiMutation(api.deleteEntry, { invalidate: TIME_KEYS });
export const useSubmitReport = () => useApiMutation(api.submitReport, { invalidate: [qk.myTime] });
