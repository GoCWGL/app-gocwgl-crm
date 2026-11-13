import { del, get, patch, post, put } from "./client";
import type {
  ClientVaOut,
  RaiseRequestOut,
  TimeTagIn,
  TimeTagOut,
  TimeTagUpdate,
  AttemptOut,
  ClientProjectOut,
  ClientVaInvoice,
  ClientVaInvoiceDetail,
  JournalEntry,
  LiveOut,
  ProjectClientUpdate,
  ProjectIn,
  ProjectStaffUpdate,
  PublicResumeOut,
  RequestApplicant,
  SopOut,
  TeamVa,
  VaRequestIn,
  VaRequestOut,
  VaRequestPost,
  StaffVaRequestIn,
  VaRequestStage,
  VaRequestStaffUpdate,
  VaTrainingOut,
  ProgressIn,
} from "./models";

// Client portal › your VA team. The API never sends pay rates or work done for other clients.
export const liveWork = () => get<LiveOut>("/portal/live");
// Client portal › VAs: raise requests from your VAs ($1/h, at most every 6 months each).
export const listRaiseRequests = () => get<RaiseRequestOut[]>("/portal/raise-requests");
export const approveRaise = (id: string) => post<RaiseRequestOut>(`/portal/raise-requests/${id}/approve`);
export const declineRaise = (id: string) => post<RaiseRequestOut>(`/portal/raise-requests/${id}/decline`);

// Client portal › VA tracker: the tags VAs pick from on their time.
export const listTimeTags = () => get<TimeTagOut[]>("/portal/time-tags");
export const addTimeTag = (body: TimeTagIn) => post<TimeTagOut>("/portal/time-tags", body);
export const updateTimeTag = (id: string, body: TimeTagUpdate) => patch<TimeTagOut>(`/portal/time-tags/${id}`, body);
export const deleteTimeTag = (id: string) => del(`/portal/time-tags/${id}`);

export const workJournal = (start: string, end: string) => get<JournalEntry[]>(`/portal/work-journal?start=${start}&end=${end}`);
export const vaTeam = () => get<TeamVa[]>("/portal/va-team");

export const listProjects = () => get<ClientProjectOut[]>("/portal/projects");
export const requestProject = (body: ProjectIn) => post<ClientProjectOut>("/portal/projects", body);
export const updateProject = (id: string, body: ProjectClientUpdate) => patch<ClientProjectOut>(`/portal/projects/${id}`, body);

export const listVaRequests = () => get<VaRequestOut[]>("/portal/va-requests");
export const requestVa = (body: VaRequestIn) => post<VaRequestOut>("/portal/va-requests", body);
/** Edit your request while it's New or In review. */
export const updateMyVaRequest = (id: string, body: VaRequestIn) => put<VaRequestOut>(`/portal/va-requests/${id}`, body);
export const cancelVaRequest = (id: string) => post<VaRequestOut>(`/portal/va-requests/${id}/cancel`);

export const requestApplicants = (id: string) => get<RequestApplicant[]>(`/portal/va-requests/${id}/applicants`);
export const hireApplicant = (id: string, vaId: string, note: string) => post<VaRequestOut>(`/portal/va-requests/${id}/hire`, { vaId, note });

// A VA the client may review: matched to one of their requests, or on their team.
export const clientVaResume = (vaId: string) => get<PublicResumeOut>(`/portal/va-resumes/${vaId}`);
export const clientVaResumeDocPath = (vaId: string, docId: string) => `/portal/va-resumes/${vaId}/documents/${docId}`;

export const listVaInvoices = () => get<ClientVaInvoice[]>("/portal/va-invoices");
export const getVaInvoice = (id: string) => get<ClientVaInvoiceDetail>(`/portal/va-invoices/${id}`);

// Client portal › Training and SOPs.
export const listClientTrainings = () => get<VaTrainingOut[]>("/portal/trainings");
export const submitClientQuiz = (id: string, answers: Array<number | null>) => post<AttemptOut>(`/portal/trainings/${id}/attempts`, { answers });
export const enrollClientTraining = (id: string) => post<void>(`/portal/trainings/${id}/enroll`);
export const saveClientTrainingProgress = (id: string, body: ProgressIn) => put<void>(`/portal/trainings/${id}/progress`, body);
export const listClientSops = () => get<SopOut[]>("/portal/sops");

// Admin › client profile › Projects.
export const listClientProjects = (contactId: string) => get<ClientProjectOut[]>(`/admin/client-projects?contact_id=${contactId}`);
export const staffUpdateProject = (id: string, body: ProjectStaffUpdate) => patch<ClientProjectOut>(`/admin/client-projects/${id}`, body);
/** Staff: every VA this client has, now and before. */
export const listClientVas = (contactId: string) => get<ClientVaOut[]>(`/admin/contacts/${contactId}/vas`);
export const listClientVaRequests = (contactId: string) => get<VaRequestOut[]>(`/admin/va-requests?contact_id=${contactId}`);
export const staffUpdateVaRequest = (id: string, body: VaRequestStaffUpdate) => patch<VaRequestOut>(`/admin/va-requests/${id}`, body);
export const listAllVaRequests = () => get<VaRequestOut[]>("/admin/va-requests");
export const startVaRequestReview = (id: string) => post<VaRequestOut>(`/admin/va-requests/${id}/review`);
export const approveVaRequest = (id: string, note?: string) => post<VaRequestOut>(`/admin/va-requests/${id}/approve`, note === undefined ? {} : { note });
export const declineVaRequest = (id: string, note?: string) => post<VaRequestOut>(`/admin/va-requests/${id}/decline`, note === undefined ? {} : { note });
export const postVaRequest = (id: string, body: VaRequestPost) => post<VaRequestOut>(`/admin/va-requests/${id}/post`, body);
export const matchVaRequest = (id: string, vaId: string) => post<VaRequestOut>(`/admin/va-requests/${id}/match`, { vaId });
export const setVaRequestStage = (id: string, body: VaRequestStage) => post<VaRequestOut>(`/admin/va-requests/${id}/stage`, body);
export const staffCreateVaRequest = (body: StaffVaRequestIn) => post<VaRequestOut>("/admin/va-requests", body);
export const deleteVaRequest = (id: string) => del(`/admin/va-requests/${id}`);
