import { del, download, get, patch, post, put } from "./client";
import type {
  AdminCrmRequestOut,
  BrandKitIn,
  BrandKitOut,
  ChecklistAdd,
  CrmRequestIn,
  CrmRequestOut,
  CrmRequestStatus,
  EmbedIn,
  EmbedOut,
  EmbedPatch,
  FileCategory,
  FileOut,
  FilePatch,
  FolderOut,
  LinksIn,
  LinksOut,
  PhaseIn,
  ProjectOut,
  ProjectPatch,
  ProjectStart,
  ProjectSummary,
  ProjectTemplateOut,
} from "./models";

const upload = (file: File, category?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  return form;
};

// ------------------------------------------------------------------ Build progress (admin)
// A client can have several builds (e.g. two funnels and a CRM), so builds are addressed by their own id.
export const listProjects = () => get<ProjectSummary[]>("/admin/projects");
export const getProject = (projectId: string) => get<ProjectOut>(`/admin/projects/${projectId}`);
export const startProject = (body: ProjectStart) => post<ProjectOut>("/admin/projects", body);
/** Checklists a build starts from: Foundation Build, Full Bundle and VIP Repeat funnels, Simple CRM, Custom CRM. */
export const listProjectTemplates = () => get<ProjectTemplateOut[]>("/admin/projects/templates");
/** Adds a template's phases to an existing build (e.g. a CRM for a funnel client). */
export const addProjectChecklist = (projectId: string, template: ChecklistAdd["template"]) =>
  post<ProjectOut>(`/admin/projects/${projectId}/checklists`, { template });
/** Cancels a build (e.g. a refund): phases, tasks and updates are deleted; the client's other builds and files stay. */
export const deleteProject = (projectId: string) => del(`/admin/projects/${projectId}`);
export const updateProject = (projectId: string, body: ProjectPatch) => patch<ProjectOut>(`/admin/projects/${projectId}`, body);
export const setProjectPhases = (projectId: string, phases: PhaseIn[]) =>
  put<ProjectOut>(`/admin/projects/${projectId}/phases`, { phases });
export const toggleProjectTask = (projectId: string, taskId: string, done: boolean) =>
  patch<ProjectOut>(`/admin/projects/${projectId}/tasks/${taskId}`, { done });
export const postProjectUpdate = (projectId: string, text: string) =>
  post<ProjectOut>(`/admin/projects/${projectId}/updates`, { text });

// ------------------------------------------------------------------ CRM requests (admin)
/** "Request a CRM" from the portal, newest first, with the client's details. */
export const listCrmRequests = () => get<AdminCrmRequestOut[]>("/admin/crm-requests");
export const updateCrmRequest = (id: string, status: CrmRequestStatus) => patch<CrmRequestOut>(`/admin/crm-requests/${id}`, { status });
export const deleteCrmRequest = (id: string) => del(`/admin/crm-requests/${id}`);
/** Emails the invoice for the CRM package they chose (with its Wise link); again = re-send the open one. */
export const sendCrmRequestInvoice = (id: string) => post<AdminCrmRequestOut>(`/admin/crm-requests/${id}/invoice`);
/** Starts the CRM build from the request: its package's checklist, named after the CRM they asked for. */
export const startCrmRequestBuild = (id: string) => post<ProjectOut>(`/admin/crm-requests/${id}/build`);

// ------------------------------------------------------------------ Client media (admin)
export const listMediaFolders = () => get<FolderOut[]>("/admin/media");
export const listMedia = (contactId: string, category?: string) =>
  get<FileOut[]>(`/admin/media/${contactId}`, { category });
export const uploadMedia = (contactId: string, file: File, category?: FileCategory) =>
  post<FileOut>(`/admin/media/${contactId}`, upload(file, category));
export const updateMedia = (contactId: string, fileId: string, body: FilePatch) =>
  patch<FileOut>(`/admin/media/${contactId}/${fileId}`, body);
export const deleteMedia = (contactId: string, fileId: string) => del(`/admin/media/${contactId}/${fileId}`);
export const downloadMedia = (contactId: string, file: Pick<FileOut, "id" | "name">) =>
  download(`/admin/media/${contactId}/${file.id}/download`, file.name);

// ------------------------------------------------------------------ Client profile (admin, read + comments)
export const getClientBrandKit = (contactId: string) => get<BrandKitOut>(`/admin/clients/${contactId}/brand-kit`);
export const getClientLinks = (contactId: string) => get<LinksOut>(`/admin/clients/${contactId}/links`);
export const listClientEmbeds = (contactId: string) => get<EmbedOut[]>(`/admin/clients/${contactId}/embeds`);
export const commentOnClientEmbed = (contactId: string, embedId: string, body: { text: string; issue?: boolean | null }) =>
  post<EmbedOut>(`/admin/clients/${contactId}/embeds/${embedId}/comments`, body);

// ------------------------------------------------------------------ Portal: build, assets, brand kit, links, embeds
export const listPortalCrmRequests = () => get<CrmRequestOut[]>("/portal/crm-requests");
export const createCrmRequest = (body: CrmRequestIn) => post<CrmRequestOut>("/portal/crm-requests", body);

/** The client's builds, oldest first. */
export const listPortalBuilds = () => get<ProjectOut[]>("/portal/builds");

export const listAssets = (category?: string) => get<FileOut[]>("/portal/assets", { category });
export const uploadAsset = (file: File, category?: FileCategory) => post<FileOut>("/portal/assets", upload(file, category));
/** Own uploads only. */
export const deleteAsset = (id: string) => del(`/portal/assets/${id}`);
export const downloadAsset = (file: Pick<FileOut, "id" | "name">) => download(`/portal/assets/${file.id}/download`, file.name);

export const getBrandKit = () => get<BrandKitOut>("/portal/brand-kit");
export const saveBrandKit = (body: BrandKitIn) => put<BrandKitOut>("/portal/brand-kit", body);

export const getLinks = () => get<LinksOut>("/portal/links");
export const saveLinks = (body: LinksIn) => put<LinksOut>("/portal/links", body);

export const listEmbeds = () => get<EmbedOut[]>("/portal/embeds");
export const createEmbed = (body: EmbedIn) => post<EmbedOut>("/portal/embeds", body);
export const updateEmbed = (id: string, body: EmbedPatch) => patch<EmbedOut>(`/portal/embeds/${id}`, body);
export const deleteEmbed = (id: string) => del(`/portal/embeds/${id}`);
export const commentOnEmbed = (id: string, text: string) => post<EmbedOut>(`/portal/embeds/${id}/comments`, { text });
