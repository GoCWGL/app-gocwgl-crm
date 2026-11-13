"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/jobPostings";
import type { JobPostingUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// Filling a job can match a client's VA request, so their requests refresh too.
const ALL = [qk.jobPostings, qk.clientVaRequests];
export const useJobPostings = () => useQuery({ queryKey: qk.jobPostings, queryFn: api.listJobPostings });
export const useCreateJobPosting = () => useApiMutation(api.createJobPosting, { invalidate: ALL });
export const useUpdateJobPosting = () =>
  useApiMutation((v: { id: string; body: JobPostingUpdate }) => api.updateJobPosting(v.id, v.body), { invalidate: ALL });
export const useMarkJobPostingFilled = () =>
  useApiMutation((v: { id: string; vaId: string | null }) => api.markJobPostingFilled(v.id, v.vaId), { invalidate: ALL });
export const useDeleteJobPosting = () => useApiMutation(api.deleteJobPosting, { invalidate: ALL });
export const useApplicants = (id: string) =>
  useQuery({ queryKey: [...qk.jobPostings, "applicants", id], queryFn: () => api.listApplicants(id), enabled: !!id });
