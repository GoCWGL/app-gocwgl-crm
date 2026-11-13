"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/sops";
import type { SopUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

const ALL = [qk.sops];
export const useSops = () => useQuery({ queryKey: qk.sops, queryFn: api.listSops });
export const useCreateSop = () => useApiMutation(api.createSop, { invalidate: ALL });
export const useUpdateSop = () => useApiMutation((v: { id: string; body: SopUpdate }) => api.updateSop(v.id, v.body), { invalidate: ALL });
export const useDeleteSop = () => useApiMutation(api.deleteSop, { invalidate: ALL });
