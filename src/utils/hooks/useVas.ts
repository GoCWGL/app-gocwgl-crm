"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/vas";
import type { VaUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useVas = (q = "") => useQuery({ queryKey: [...qk.vas, "list", q], queryFn: () => api.listVas(q), placeholderData: keepPreviousData });
export const useVa = (id: string) => useQuery({ queryKey: qk.va(id), queryFn: () => api.getVa(id), enabled: !!id });

export const useUpdateVa = () =>
  useApiMutation((v: { id: string; body: VaUpdate }) => api.updateVa(v.id, v.body), { invalidate: [qk.vas] });
export const useSetVaClients = () =>
  useApiMutation((v: { id: string; contactIds: string[] }) => api.setVaClients(v.id, v.contactIds), {
    // A client's profile lists their VAs too.
    invalidate: [qk.vas, qk.clientVaRequests],
  });
export const useSetVaClientRate = () =>
  useApiMutation((v: { id: string; contactId: string; rateCents: number | null }) => api.setVaClientRate(v.id, v.contactId, v.rateCents), {
    invalidate: [qk.vas, qk.clientVaRequests],
  });
export const useCreateVa = () => useApiMutation(api.createVa, { invalidate: [qk.vas] });
export const useInviteVa = () => useApiMutation(api.inviteVa, { invalidate: [qk.vas] });
export const useRevokeVaInvitation = () => useApiMutation(api.revokeVaInvitation, { invalidate: [qk.vas] });
