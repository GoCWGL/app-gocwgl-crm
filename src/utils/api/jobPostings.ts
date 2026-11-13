import { del, get, patch, post } from "./client";
import type { ApplicantOut, JobPostingIn, JobPostingOut, JobPostingUpdate } from "./models";

// Engagement › Job Postings (staff).
export const listJobPostings = () => get<JobPostingOut[]>("/admin/job-postings");
export const createJobPosting = (body: JobPostingIn) => post<JobPostingOut>("/admin/job-postings", body);
export const updateJobPosting = (id: string, body: JobPostingUpdate) => patch<JobPostingOut>(`/admin/job-postings/${id}`, body);
/** The success: the role is filled (optionally by one of your VAs). */
export const markJobPostingFilled = (id: string, vaId: string | null) => post<JobPostingOut>(`/admin/job-postings/${id}/filled`, { vaId });
export const deleteJobPosting = (id: string) => del(`/admin/job-postings/${id}`);
export const listApplicants = (id: string) => get<ApplicantOut[]>(`/admin/job-postings/${id}/applications`);
