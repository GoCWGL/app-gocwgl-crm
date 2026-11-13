import { api, apiUrl, del, download, get, patch, post, put } from "./client";
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
  MyReferralOut,
  OrgSuggestion,
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
/** Claim a referral bonus once it's earned (the VA they referred has 30 days with 8+ hours); GoCWGL's team is notified. */
export const claimReferral = (id: string) => post<MyReferralOut>(`/va/referrals/${id}/claim`);
export const getResume = () => get<ResumeOut>("/va/resume");
export const saveResume = (body: ResumeIn) => put<ResumeOut>("/va/resume", body);
export const newResumeLink = () => post<ResumeOut>("/va/resume/new-link");
/** Company or school names for what's typed so far (searched online by the API). */
export type OrgKind = "company" | "school" | "highschool";
export const lookupOrg = (kind: OrgKind, q: string, country = "") =>
  get<OrgSuggestion[]>("/va/resume/lookup", { kind, q, country });
/** A headshot, test result or certificate (PDF or image; the form keeps it under 4 MB, photos shrunk first). */
export const uploadResumeDocument = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  // Never sit on "Uploading…" forever: give up after 2 minutes with a clear message.
  return api<ResumeDocumentOut>("/va/resume/documents", { method: "POST", body, signal: AbortSignal.timeout(120_000) });
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
