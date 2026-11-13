import { apiUrl, del, download, get, patch, post, put } from "./client";
import type {
  InactiveAskOut,
  JournalEntryIn,
  JournalEntryOut,
  JournalEntryUpdate,
  MyFeedbackOut,
  MyApplication,
  MyReferralsOut,
  VaTaskOut,
  VaTaskUpdate,
  OpenJobOut,
  PublicResumeOut,
  ResumeDocumentOut,
  ResumeIn,
  ResumeOut,
  SopOut,
} from "./models";

// VA portal: Open jobs, SOP library, Feedback, Referrals, Journal.
export const listOpenJobs = () => get<OpenJobOut[]>("/va/jobs");
export const applyForJob = (id: string, note: string) => post<MyApplication>(`/va/jobs/${id}/apply`, { note });
export const withdrawApplication = (id: string) => del(`/va/jobs/${id}/apply`);
export const listVaSops = () => get<SopOut[]>("/va/sops");
export const getMyRatings = () => get<MyFeedbackOut>("/va/feedback");
export const getMyReferrals = () => get<MyReferralsOut>("/va/referrals");
export const getResume = () => get<ResumeOut>("/va/resume");
export const saveResume = (body: ResumeIn) => put<ResumeOut>("/va/resume", body);
export const newResumeLink = () => post<ResumeOut>("/va/resume/new-link");
/** A test result or certificate (PDF or image, up to 10 MB). */
export const uploadResumeDocument = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return post<ResumeDocumentOut>("/va/resume/documents", body);
};
export const deleteResumeDocument = (id: string) => del(`/va/resume/documents/${id}`);
/** Opens one of your documents in a new tab (it needs your sign-in, so it's fetched first). */
export const openResumeDocument = (id: string) => download(`/va/resume/documents/${id}`);
/** The public address of a document attached to a live resume page. */
export const publicResumeDocumentUrl = (slug: string, id: string) => apiUrl(`/public/resumes/${slug}/documents/${id}`);
/** The page clients open (no sign-in). */
export const getPublicResume = (slug: string) => get<PublicResumeOut>(`/public/resumes/${slug}`);
export const listJournal = () => get<JournalEntryOut[]>("/va/journal");
export const addJournal = (body: JournalEntryIn) => post<JournalEntryOut>("/va/journal", body);
export const updateJournal = (id: string, body: JournalEntryUpdate) => patch<JournalEntryOut>(`/va/journal/${id}`, body);
export const deleteJournal = (id: string) => del(`/va/journal/${id}`);

// VA portal › Tasks: client tasks assigned to this VA.
// Clients GoCWGL wants to move to inactive: the VA talks to them first, then approves.
export const listInactiveAsks = () => get<InactiveAskOut[]>("/va/inactive-requests");
export const approveInactive = (requestId: string) => post<InactiveAskOut[]>(`/va/inactive-requests/${requestId}/approve`);
export const listVaTasks = () => get<VaTaskOut[]>("/va/tasks");
export const updateVaTask = (id: string, body: VaTaskUpdate) => patch<VaTaskOut>(`/va/tasks/${id}`, body);
