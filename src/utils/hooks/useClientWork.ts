"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/clientWork";
import type { ProgressIn, ProjectClientUpdate, TimeTagUpdate, VaRequestIn, ProjectStaffUpdate, VaRequestPost, VaRequestStage, VaRequestStaffUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// Every key starts with "portal", so switching clients drops all of it.
export const useLiveWork = () => useQuery({ queryKey: qk.portalLive, queryFn: api.liveWork, refetchInterval: 30_000 });
export const useWorkJournal = (start: string, end: string) =>
  useQuery({ queryKey: [...qk.portalJournal, start, end], queryFn: () => api.workJournal(start, end), enabled: !!start && !!end });
export const useRaiseRequests = () => useQuery({ queryKey: qk.portalRaises, queryFn: api.listRaiseRequests });
// An approved raise changes what new time is worth, so the tracker and team reload too.
export const useDecideRaise = () =>
  useApiMutation((v: { id: string; approve: boolean }) => (v.approve ? api.approveRaise(v.id) : api.declineRaise(v.id)), {
    invalidate: [qk.portalRaises, qk.portalVaTeam, qk.portalJournal, qk.portalNextInvoice],
  });
export const useTimeTags = () => useQuery({ queryKey: qk.portalTimeTags, queryFn: api.listTimeTags });
// A rename also renames the tag on time already logged, so the tracker reloads too.
const TAG_KEYS = [qk.portalTimeTags, qk.portalJournal];
export const useAddTimeTag = () => useApiMutation(api.addTimeTag, { invalidate: [qk.portalTimeTags] });
export const useUpdateTimeTag = () => useApiMutation((v: { id: string; body: TimeTagUpdate }) => api.updateTimeTag(v.id, v.body), { invalidate: TAG_KEYS });
export const useDeleteTimeTag = () => useApiMutation(api.deleteTimeTag, { invalidate: [qk.portalTimeTags] });
export const useVaTeam = () => useQuery({ queryKey: qk.portalVaTeam, queryFn: api.vaTeam });
/** The next maintenance fee invoice so far; it grows as the VAs log time, so it refreshes every few minutes. */
export const useNextMaintenanceInvoice = () =>
  useQuery({ queryKey: qk.portalNextInvoice, queryFn: api.nextMaintenanceInvoice, refetchInterval: 5 * 60_000 });

/** Refreshed every 30 s so the VA's status changes show up without reloading. */
export const useProjects = () => useQuery({ queryKey: qk.portalProjects, queryFn: api.listProjects, refetchInterval: 30_000 });
export const useRequestProject = () => useApiMutation(api.requestProject, { invalidate: [qk.portalProjects] });
/** A task's conversation, refreshed every 15 s while open so the VA's questions show up. */
export const useProjectMessages = (id: string) =>
  useQuery({ queryKey: [...qk.portalProjects, id, "messages"], queryFn: () => api.listProjectMessages(id), refetchInterval: 15_000 });
export const useMarkProjectRead = () => useApiMutation(api.markProjectMessagesRead, { invalidate: [qk.portalProjects] });
export const usePostProjectMessage = () =>
  useApiMutation((v: { id: string; body: string }) => api.postProjectMessage(v.id, v.body), { invalidate: [qk.portalProjects] });
export const useUpdateProject = () =>
  useApiMutation((v: { id: string; body: ProjectClientUpdate }) => api.updateProject(v.id, v.body), { invalidate: [qk.portalProjects] });

/** When the client ticked that they understand the VA agreement (null until then: no VA requests before it). */
export const useMyVaAgreement = () => useQuery({ queryKey: qk.portalVaAgreement, queryFn: api.getMyVaAgreement });
export const useAcceptMyVaAgreement = () => useApiMutation(api.acceptMyVaAgreement, { invalidate: [qk.portalVaAgreement] });
export const useVaRequests = () => useQuery({ queryKey: qk.portalVaRequests, queryFn: api.listVaRequests });
export const useRequestVa = () => useApiMutation(api.requestVa, { invalidate: [qk.portalVaRequests] });
export const useUpdateMyVaRequest = () =>
  useApiMutation((v: { id: string; body: VaRequestIn }) => api.updateMyVaRequest(v.id, v.body), { invalidate: [qk.portalVaRequests] });
export const useCancelVaRequest = () => useApiMutation(api.cancelVaRequest, { invalidate: [qk.portalVaRequests] });
/** A request's conversation with GoCWGL, refreshed every 20 s while open so replies and quotes show up. */
export const useMyRequestComments = (id: string) =>
  useQuery({ queryKey: [...qk.portalVaRequests, id, "comments"], queryFn: () => api.listMyRequestComments(id), refetchInterval: 20_000 });
export const useCommentOnMyRequest = () =>
  useApiMutation((v: { id: string; body: string }) => api.commentOnMyRequest(v.id, v.body), { invalidate: [qk.portalVaRequests] });
export const useAcceptQuote = () => useApiMutation(api.acceptQuote, { invalidate: [qk.portalVaRequests] });

export const useRequestApplicants = (id: string) =>
  useQuery({ queryKey: [...qk.portalVaRequests, id, "applicants"], queryFn: () => api.requestApplicants(id), enabled: !!id });
export const useHireApplicant = () =>
  useApiMutation((v: { id: string; vaId: string; note: string }) => api.hireApplicant(v.id, v.vaId, v.note), { invalidate: [qk.portalVaRequests] });
export const useClientVaResume = (vaId: string) =>
  useQuery({ queryKey: [...qk.portalVaResumes, vaId], queryFn: () => api.clientVaResume(vaId), enabled: !!vaId, retry: false });

export const useVaInvoicesForClient = () => useQuery({ queryKey: qk.portalVaInvoices, queryFn: api.listVaInvoices });
export const useVaInvoiceForClient = (id: string) =>
  useQuery({ queryKey: [...qk.portalVaInvoices, id], queryFn: () => api.getVaInvoice(id), enabled: !!id });
export const useMarkVaInvoicePaid = () => useApiMutation(api.markVaInvoicePaid, { invalidate: [qk.portalVaInvoices] });
export const useUnmarkVaInvoicePaid = () => useApiMutation(api.unmarkVaInvoicePaid, { invalidate: [qk.portalVaInvoices] });

export const useClientTrainings = () => useQuery({ queryKey: qk.portalTrainings, queryFn: api.listClientTrainings });
export const useSubmitClientQuiz = () =>
  useApiMutation((v: { id: string; answers: Array<number | string | null> }) => api.submitClientQuiz(v.id, v.answers), { invalidate: [qk.portalTrainings] });
export const useEnrollClientTraining = () => useApiMutation(api.enrollClientTraining, { invalidate: [qk.portalTrainings] });
export const useSaveClientTrainingProgress = () =>
  useApiMutation((v: { id: string } & ProgressIn) => api.saveClientTrainingProgress(v.id, { watched: v.watched, currentStep: v.currentStep }), {
    invalidate: [qk.portalTrainings],
  });
export const useClientSops = () => useQuery({ queryKey: qk.portalSops, queryFn: api.listClientSops });

// Admin
export const useClientProjects = (contactId: string) =>
  useQuery({ queryKey: [...qk.clientProjects, contactId], queryFn: () => api.listClientProjects(contactId), enabled: !!contactId });
export const useStaffUpdateProject = () =>
  useApiMutation((v: { id: string; body: ProjectStaffUpdate }) => api.staffUpdateProject(v.id, v.body), { invalidate: [qk.clientProjects] });
export const useClientVaRequests = (contactId: string) =>
  useQuery({ queryKey: [...qk.clientVaRequests, contactId], queryFn: () => api.listClientVaRequests(contactId), enabled: !!contactId });
export const useStaffUpdateVaRequest = () =>
  useApiMutation((v: { id: string; body: VaRequestStaffUpdate }) => api.staffUpdateVaRequest(v.id, v.body), { invalidate: [qk.clientVaRequests, qk.jobPostings] });

// Admin › Job postings › Client requests
const REQUESTS_AND_JOBS = [qk.clientVaRequests, qk.jobPostings];
export const useClientVas = (contactId: string) =>
  useQuery({ queryKey: [...qk.clientVaRequests, "vas", contactId], queryFn: () => api.listClientVas(contactId), enabled: !!contactId });
/** Their VA list, the VA's clients and the board all change. */
export const useAssignClientVa = () =>
  useApiMutation(
    (v: { contactId: string; vaId: string; hoursPerWeek: 10 | 20 | 40 | null }) => api.assignClientVa(v.contactId, v.vaId, v.hoursPerWeek),
    { invalidate: [qk.clientVaRequests, qk.vas] },
  );
export const useAllVaRequests = (enabled = true) =>
  useQuery({ queryKey: [...qk.clientVaRequests, "all"], queryFn: api.listAllVaRequests, enabled, refetchInterval: 60_000 });
export const useStartVaRequestReview = () => useApiMutation(api.startVaRequestReview, { invalidate: REQUESTS_AND_JOBS });
export const useApproveVaRequest = () =>
  useApiMutation((v: { id: string; note?: string }) => api.approveVaRequest(v.id, v.note), { invalidate: REQUESTS_AND_JOBS });
export const useDeclineVaRequest = () =>
  useApiMutation((v: { id: string; note?: string }) => api.declineVaRequest(v.id, v.note), { invalidate: REQUESTS_AND_JOBS });
export const usePostVaRequest = () =>
  useApiMutation((v: { id: string; body: VaRequestPost }) => api.postVaRequest(v.id, v.body), { invalidate: REQUESTS_AND_JOBS });
export const useRequestComments = (id: string) =>
  useQuery({ queryKey: [...qk.clientVaRequests, id, "comments"], queryFn: () => api.listRequestComments(id), refetchInterval: 20_000 });
export const useCommentOnRequest = () =>
  useApiMutation((v: { id: string; body: string }) => api.commentOnRequest(v.id, v.body), { invalidate: REQUESTS_AND_JOBS });
export const useQuoteRequest = () =>
  useApiMutation((v: { id: string; amountCents: number; note: string }) => api.quoteRequest(v.id, v.amountCents, v.note), { invalidate: REQUESTS_AND_JOBS });
export const useMatchVaRequest = () =>
  useApiMutation((v: { id: string; vaId: string }) => api.matchVaRequest(v.id, v.vaId), { invalidate: REQUESTS_AND_JOBS });
export const useSetVaRequestStage = () =>
  useApiMutation((v: { id: string; body: VaRequestStage }) => api.setVaRequestStage(v.id, v.body), { invalidate: REQUESTS_AND_JOBS });
export const useStaffCreateVaRequest = () => useApiMutation(api.staffCreateVaRequest, { invalidate: REQUESTS_AND_JOBS });
export const useDeleteVaRequest = () => useApiMutation(api.deleteVaRequest, { invalidate: REQUESTS_AND_JOBS });
