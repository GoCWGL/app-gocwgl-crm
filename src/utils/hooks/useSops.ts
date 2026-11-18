"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/sops";
import type { ClientSopIn, ClientSopUpdate, SopUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

const ALL = [qk.sops];
export const useSops = () => useQuery({ queryKey: qk.sops, queryFn: api.listSops });
export const useCreateSop = () => useApiMutation(api.createSop, { invalidate: ALL });
export const useUpdateSop = () => useApiMutation((v: { id: string; body: SopUpdate }) => api.updateSop(v.id, v.body), { invalidate: ALL });
export const useDeleteSop = () => useApiMutation(api.deleteSop, { invalidate: ALL });

// Client portal › SOPs › Your SOPs.
const MINE = [qk.portalMySops];
export const useMyClientSops = () => useQuery({ queryKey: qk.portalMySops, queryFn: api.myClientSops });
export const useAddClientSop = () => useApiMutation((body: ClientSopIn) => api.addClientSop(body), { invalidate: MINE });
export const useUploadClientSop = () =>
  useApiMutation((v: { file: File; meta: Parameters<typeof api.uploadClientSop>[1] }) => api.uploadClientSop(v.file, v.meta), { invalidate: MINE });
export const useUpdateClientSop = () =>
  useApiMutation((v: { id: string; body: ClientSopUpdate }) => api.updateClientSop(v.id, v.body), { invalidate: MINE });
export const useReplaceClientSopFile = () =>
  useApiMutation((v: { id: string; file: File }) => api.replaceClientSopFile(v.id, v.file), { invalidate: MINE });
export const useDeleteClientSop = () => useApiMutation(api.deleteClientSop, { invalidate: MINE });

// VA portal: SOPs your clients shared with you (all, or one client's).
export const useSharedClientSops = (clientId: string, enabled = true) =>
  useQuery({ queryKey: [...qk.vaClientSops, clientId], queryFn: () => api.sharedClientSops(clientId), enabled, placeholderData: keepPreviousData });
