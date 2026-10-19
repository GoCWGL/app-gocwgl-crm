"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/delivery";
import type { BrandKitIn, EmbedIn, EmbedPatch, FileCategory, FilePatch, LinksIn, PhaseIn, ProjectPatch, ProjectStart } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

// ------------------------------------------------------------------ Build progress (admin)
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: api.listProjects });
/** 404 until the build is started for that client. */
export const useProject = (contactId: string) =>
  useQuery({ queryKey: qk.project(contactId), queryFn: () => api.getProject(contactId), enabled: !!contactId, retry: false });

const projectKeys = (contactId: string) => [qk.project(contactId), qk.projects, ["dashboard"]];
export const useStartProject = () =>
  useApiMutation((v: { contactId: string; body: ProjectStart }) => api.startProject(v.contactId, v.body), {
    invalidate: (_, v) => projectKeys(v.contactId),
  });
export const useUpdateProject = () =>
  useApiMutation((v: { contactId: string; body: ProjectPatch }) => api.updateProject(v.contactId, v.body), {
    invalidate: (_, v) => projectKeys(v.contactId),
  });
export const useSetProjectPhases = () =>
  useApiMutation((v: { contactId: string; phases: PhaseIn[] }) => api.setProjectPhases(v.contactId, v.phases), {
    invalidate: (_, v) => projectKeys(v.contactId),
  });
export const useToggleProjectTask = () =>
  useApiMutation((v: { contactId: string; taskId: string; done: boolean }) => api.toggleProjectTask(v.contactId, v.taskId, v.done), {
    invalidate: (_, v) => projectKeys(v.contactId),
  });
export const usePostProjectUpdate = () =>
  useApiMutation((v: { contactId: string; text: string }) => api.postProjectUpdate(v.contactId, v.text), {
    invalidate: (_, v) => projectKeys(v.contactId),
  });

// ------------------------------------------------------------------ Client media (admin)
export const useMediaFolders = () => useQuery({ queryKey: qk.mediaFolders, queryFn: api.listMediaFolders });
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
export const usePortalBuild = () => useQuery({ queryKey: qk.portalBuild, queryFn: api.getPortalBuild });
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
