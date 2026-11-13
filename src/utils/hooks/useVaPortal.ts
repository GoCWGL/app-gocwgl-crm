"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/utils/api/vaPortal";
import type { JournalEntryUpdate, VaTaskUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useApplyForJob = () =>
  useApiMutation((v: { id: string; note: string }) => api.applyForJob(v.id, v.note), { invalidate: [qk.vaJobs] });
export const useWithdrawApplication = () => useApiMutation(api.withdrawApplication, { invalidate: [qk.vaJobs] });
export const useInactiveAsks = (enabled = true) =>
  useQuery({ queryKey: qk.vaInactiveAsks, queryFn: api.listInactiveAsks, enabled, refetchInterval: 120_000 });
export const useApproveInactive = () => {
  const qc = useQueryClient();
  return useApiMutation(api.approveInactive, { onSuccess: (data) => qc.setQueryData(qk.vaInactiveAsks, data) });
};
export const useVaTasks = (enabled = true) => useQuery({ queryKey: qk.vaTasks, queryFn: api.listVaTasks, enabled, refetchInterval: 120_000 });
export const useUpdateVaTask = () =>
  useApiMutation((v: { id: string; status: VaTaskUpdate["status"] }) => api.updateVaTask(v.id, { status: v.status }), {
    // Start task also starts the timer: refresh the time tracker too.
    invalidate: [qk.vaTasks, qk.myShift, qk.myTime],
  });
export const useOpenJobs = (enabled = true) => useQuery({ queryKey: qk.vaJobs, queryFn: api.listOpenJobs, enabled, refetchInterval: 120_000 });
export const useVaSops = (enabled = true) => useQuery({ queryKey: qk.vaSops, queryFn: api.listVaSops, enabled });
export const useMyRatings = (enabled = true) => useQuery({ queryKey: qk.vaRatings, queryFn: api.getMyRatings, enabled });
export const useMyReferrals = (enabled = true) => useQuery({ queryKey: qk.myReferrals, queryFn: api.getMyReferrals, enabled });
export const useClaimReferral = () => useApiMutation(api.claimReferral, { invalidate: [qk.myReferrals] });
export const useResume = (enabled = true) => useQuery({ queryKey: qk.resume, queryFn: api.getResume, enabled });
export const useSaveResume = () => useApiMutation(api.saveResume, { invalidate: [qk.resume, qk.vas] });
export const useUploadResumeDocument = () => useApiMutation(api.uploadResumeDocument);
/** Suggestions for a company or school name; waits for 2+ characters and keeps results for 10 minutes. */
export const useOrgLookup = (kind: api.OrgKind, q: string, country = "") =>
  useQuery({
    queryKey: ["va", "org-lookup", kind, q.trim().toLowerCase(), country],
    queryFn: () => api.lookupOrg(kind, q.trim(), country),
    enabled: q.trim().length >= 2,
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
export const useNewResumeLink = () => useApiMutation(() => api.newResumeLink(), { invalidate: [qk.resume] });
export const usePublicResume = (slug: string) =>
  useQuery({ queryKey: ["public-resume", slug], queryFn: () => api.getPublicResume(slug), enabled: !!slug, retry: false });
export const useJournal = (enabled = true) => useQuery({ queryKey: qk.journal, queryFn: api.listJournal, enabled });
export const useAddJournal = () => useApiMutation(api.addJournal, { invalidate: [qk.journal] });
export const useUpdateJournal = () =>
  useApiMutation((v: { id: string; body: JournalEntryUpdate }) => api.updateJournal(v.id, v.body), { invalidate: [qk.journal] });
export const useDeleteJournal = () => useApiMutation(api.deleteJournal, { invalidate: [qk.journal] });
