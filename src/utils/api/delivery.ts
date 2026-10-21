import { del, download, get, patch, post, put } from "./client";
import type {
  BrandKitIn,
  BrandKitOut,
  ChecklistAdd,
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
export const listProjects = () => get<ProjectSummary[]>("/admin/projects");
export const getProject = (contactId: string) => get<ProjectOut>(`/admin/projects/${contactId}`);
export const startProject = (contactId: string, body: ProjectStart) => post<ProjectOut>(`/admin/projects/${contactId}`, body);
/** Checklists a build starts from: funnel & system, Simple CRM, Custom CRM. */
export const listProjectTemplates = () => get<ProjectTemplateOut[]>("/admin/projects/templates");
/** Adds a template's phases to an existing build (e.g. a CRM for a funnel client). */
export const addProjectChecklist = (contactId: string, template: ChecklistAdd["template"]) =>
  post<ProjectOut>(`/admin/projects/${contactId}/checklists`, { template });
export const updateProject = (contactId: string, body: ProjectPatch) => patch<ProjectOut>(`/admin/projects/${contactId}`, body);
export const setProjectPhases = (contactId: string, phases: PhaseIn[]) =>
  put<ProjectOut>(`/admin/projects/${contactId}/phases`, { phases });
export const toggleProjectTask = (contactId: string, taskId: string, done: boolean) =>
  patch<ProjectOut>(`/admin/projects/${contactId}/tasks/${taskId}`, { done });
export const postProjectUpdate = (contactId: string, text: string) =>
  post<ProjectOut>(`/admin/projects/${contactId}/updates`, { text });

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
export const getPortalBuild = () => get<ProjectOut | null>("/portal/build");

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
