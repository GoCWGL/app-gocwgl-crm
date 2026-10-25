"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { markInvoicePaid } from "@/utils/api/billing";
import * as api from "@/utils/api/delivery";
import type { BrandKitIn, CrmRequestIn, CrmRequestStatus, ProjectSummary, EmbedIn, EmbedPatch, FileCategory, FilePatch, LinksIn, PhaseIn, ProjectPatch, ProjectStart, ChecklistAdd } from "@/utils/api/models";
import { qk } from "./keys";
import { useCanUseMenu } from "./useUsers";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Build progress (admin)
/** Build Progress data: not requested for teammates without that menu. */
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: api.listProjects, enabled: useCanUseMenu("progress") });
export const useProject = (projectId: string) =>
  useQuery({ queryKey: qk.project(projectId), queryFn: () => api.getProject(projectId), enabled: !!projectId, retry: false });

const projectKeys = (projectId: string) => [qk.project(projectId), qk.projects, ["dashboard"]];
export const useProjectTemplates = () => useQuery({ queryKey: qk.projectTemplates, queryFn: api.listProjectTemplates, staleTime: Infinity });
export const useAddProjectChecklist = () =>
  useApiMutation((v: { projectId: string; template: ChecklistAdd["template"] }) => api.addProjectChecklist(v.projectId, v.template), {
    invalidate: (_, v) => projectKeys(v.projectId),
  });
export const useStartProject = () => useApiMutation((body: ProjectStart) => api.startProject(body), { invalidate: [qk.projects, ["dashboard"]] });
/** Drops the build from the cached list right away, so the page doesn't refetch the deleted build (404). */
export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useApiMutation((projectId: string) => api.deleteProject(projectId), {
    onSuccess: (_, projectId) => {
      qc.setQueryData<ProjectSummary[]>(qk.projects, (list) => list?.filter((p) => p.id !== projectId));
      qc.removeQueries({ queryKey: qk.project(projectId), exact: true });
      void qc.invalidateQueries({ queryKey: qk.projects, exact: true });
    },
    invalidate: [["dashboard"]],
  });
};
export const useUpdateProject = () =>
  useApiMutation((v: { projectId: string; body: ProjectPatch }) => api.updateProject(v.projectId, v.body), {
    invalidate: (_, v) => projectKeys(v.projectId),
  });
export const useSetProjectPhases = () =>
  useApiMutation((v: { projectId: string; phases: PhaseIn[] }) => api.setProjectPhases(v.projectId, v.phases), {
    invalidate: (_, v) => projectKeys(v.projectId),
  });
export const useToggleProjectTask = () =>
  useApiMutation((v: { projectId: string; taskId: string; done: boolean }) => api.toggleProjectTask(v.projectId, v.taskId, v.done), {
    invalidate: (_, v) => projectKeys(v.projectId),
  });
export const usePostProjectUpdate = () =>
  useApiMutation((v: { projectId: string; text: string }) => api.postProjectUpdate(v.projectId, v.text), {
    invalidate: (_, v) => projectKeys(v.projectId),
  });

// ------------------------------------------------------------------ CRM requests (admin)
export const useCrmRequests = () => useQuery({ queryKey: qk.crmRequests, queryFn: api.listCrmRequests, enabled: useCanUseMenu("progress") });
export const useUpdateCrmRequest = () =>
  useApiMutation((v: { id: string; status: CrmRequestStatus }) => api.updateCrmRequest(v.id, v.status), { invalidate: [qk.crmRequests] });
export const useDeleteCrmRequest = () => useApiMutation(api.deleteCrmRequest, { invalidate: [qk.crmRequests] });
export const useSendCrmRequestInvoice = () =>
  useApiMutation(api.sendCrmRequestInvoice, { invalidate: [qk.crmRequests, qk.invoices, ["dashboard"]] });
/** Their Wise payment arrived: mark the CRM request's invoice paid. */
export const useMarkCrmRequestPaid = () =>
  useApiMutation(markInvoicePaid, { invalidate: [qk.crmRequests, qk.invoices, qk.portalBilling, ["dashboard"]] });
export const useStartCrmRequestBuild = () =>
  useApiMutation(api.startCrmRequestBuild, { invalidate: [qk.crmRequests, qk.projects, ["dashboard"]] });

// ------------------------------------------------------------------ Client media (admin)
export const useMediaFolders = () => useQuery({ queryKey: qk.mediaFolders, queryFn: api.listMediaFolders, enabled: useCanUseMenu("media") });
export const useMedia = (contactId: string) =>
  useQuery({ queryKey: qk.media(contactId), queryFn: () => api.listMedia(contactId), enabled: !!contactId });
export const useUploadMedia = () =>
  useApiMutation((v: { contactId: string; file: File; category?: FileCategory }) => api.uploadMedia(v.contactId, v.file, v.category), {
    invalidate: [qk.mediaFolders],
  });
export const useUpdateMedia = () =>
  useApiMutation((v: { contactId: string; fileId: string; body: FilePatch }) => api.updateMedia(v.contactId, v.fileId, v.body), {
    invalidate: [qk.mediaFolders],
  });
export const useDeleteMedia = () =>
  useApiMutation((v: { contactId: string; fileId: string }) => api.deleteMedia(v.contactId, v.fileId), { invalidate: [qk.mediaFolders] });

// ------------------------------------------------------------------ Client profile (admin)
export const useClientBrandKit = (contactId: string) =>
  useQuery({ queryKey: qk.clientBrandKit(contactId), queryFn: () => api.getClientBrandKit(contactId), enabled: !!contactId });
export const useClientLinks = (contactId: string) =>
  useQuery({ queryKey: qk.clientLinks(contactId), queryFn: () => api.getClientLinks(contactId), enabled: !!contactId });
export const useClientEmbeds = (contactId: string) =>
  useQuery({ queryKey: qk.clientEmbeds(contactId), queryFn: () => api.listClientEmbeds(contactId), enabled: !!contactId });
export const useCommentOnClientEmbed = () =>
  useApiMutation(
    (v: { contactId: string; embedId: string; text: string; issue?: boolean | null }) =>
      api.commentOnClientEmbed(v.contactId, v.embedId, { text: v.text, issue: v.issue }),
    { invalidate: (_, v) => [qk.clientEmbeds(v.contactId)] },
  );

// ------------------------------------------------------------------ Portal
export const usePortalCrmRequests = () => useQuery({ queryKey: qk.portalCrmRequests, queryFn: api.listPortalCrmRequests });
export const useCreateCrmRequest = () => useApiMutation((v: CrmRequestIn) => api.createCrmRequest(v), { invalidate: [qk.portalCrmRequests] });
export const usePortalBuilds = () => useQuery({ queryKey: qk.portalBuilds, queryFn: api.listPortalBuilds });
export const useAssets = () => useQuery({ queryKey: qk.assets, queryFn: () => api.listAssets() });
export const useUploadAsset = () =>
  useApiMutation((v: { file: File; category?: FileCategory }) => api.uploadAsset(v.file, v.category), { invalidate: [qk.assets] });
export const useDeleteAsset = () => useApiMutation(api.deleteAsset, { invalidate: [qk.assets] });
export const useBrandKit = () => useQuery({ queryKey: qk.brandKit, queryFn: api.getBrandKit });
export const useSaveBrandKit = () => useApiMutation((v: BrandKitIn) => api.saveBrandKit(v), { invalidate: [qk.brandKit] });
export const useLinks = () => useQuery({ queryKey: qk.links, queryFn: api.getLinks });
export const useSaveLinks = () => useApiMutation((v: LinksIn) => api.saveLinks(v), { invalidate: [qk.links] });
export const useEmbeds = () => useQuery({ queryKey: qk.embeds, queryFn: api.listEmbeds });
export const useCreateEmbed = () => useApiMutation((v: EmbedIn) => api.createEmbed(v), { invalidate: [qk.embeds] });
export const useUpdateEmbed = () => useApiMutation((v: { id: string; body: EmbedPatch }) => api.updateEmbed(v.id, v.body), { invalidate: [qk.embeds] });
export const useDeleteEmbed = () => useApiMutation(api.deleteEmbed, { invalidate: [qk.embeds] });
export const useCommentOnEmbed = () => useApiMutation((v: { id: string; text: string }) => api.commentOnEmbed(v.id, v.text), { invalidate: [qk.embeds] });
