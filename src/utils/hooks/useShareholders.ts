"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/shareholders";
import type { InteractionIn } from "@/utils/api/models";
import { isSuperAdmin } from "@/utils/auth/session";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";
import { useMe } from "./useUsers";

/**
 * These figures come from Billing, expenses and bonuses, which other people change too (a payment marked paid, a client
 * paying). So they're fetched again whenever a page opens or the window is focused, and every minute while it's open.
 */
const LIVE = { refetchOnMount: "always", refetchOnWindowFocus: "always", refetchInterval: 60_000 } as const;

const useAllowed = () => isSuperAdmin(useMe().data);

/** Everything but updates and documents, for one year (default: this one). */
export const useShareholders = (year?: number) =>
  useQuery({
    ...LIVE,
    queryKey: [...qk.shareholders, "overview", year ?? "now"],
    queryFn: () => api.getShareholders(year),
    enabled: useAllowed(),
    placeholderData: keepPreviousData,
  });
export const useInvestorUpdates = () => useQuery({ queryKey: qk.investorUpdates, queryFn: api.listInvestorUpdates, enabled: useAllowed() });
export const useDocuments = () => useQuery({ queryKey: qk.dataRoom, queryFn: api.listDocuments, enabled: useAllowed() });
export const useInteractions = (id: string) =>
  useQuery({ queryKey: qk.shareholderNotes(id), queryFn: () => api.listInteractions(id), enabled: !!id });

// Every key starts with "shareholders", so one change refreshes all of them.
const opts = { invalidate: [qk.shareholders] };
export const useSaveRecord = <K extends api.RecordKind>(kind: K) =>
  useApiMutation((v: { id?: string; body: api.RecordBodies[K] }) => api.saveRecord(kind, v.id, v.body), opts);
export const useDeleteRecord = (kind: Parameters<typeof api.deleteRecord>[0]) => useApiMutation((id: string) => api.deleteRecord(kind, id), opts);
export const useAddInteraction = (stakeholderId: string) => useApiMutation((body: InteractionIn) => api.addInteraction(stakeholderId, body), opts);
export const useSaveEquitySettings = () => useApiMutation(api.saveEquitySettings, opts);
export const useSaveBudget = () => useApiMutation(api.saveBudget, opts);

export const usePayoutProfile = (id: string) =>
  useQuery({ queryKey: [...qk.shareholders, "payout-profile", id], queryFn: () => api.getPayoutProfile(id), enabled: useAllowed() && !!id });
export const useSavePayoutProfile = () => useApiMutation(api.savePayoutProfile, opts);
export const useRevealPayoutProfile = () => useApiMutation(api.revealPayoutProfile);

export const useDistributions = () => useQuery({ ...LIVE, queryKey: [...qk.shareholders, "distributions"], queryFn: api.listDistributions, enabled: useAllowed() });
export const useDistribution = (id: string) =>
  useQuery({ queryKey: [...qk.shareholders, "distributions", id], queryFn: () => api.getDistribution(id), enabled: useAllowed() && !!id });
export const usePreviewDistribution = () => useApiMutation(api.previewDistribution);
export const useSaveDistribution = () => useApiMutation(api.saveDistribution, opts);
export const useDeclareDistribution = () => useApiMutation(api.declareDistribution, opts);
export const useCancelDistribution = () => useApiMutation(api.cancelDistribution, opts);
export const useSetResolution = () => useApiMutation(api.setResolution, opts);
export const useOpenResolution = () => useApiMutation(api.openResolution);
export const useSetPayoutTax = () => useApiMutation(api.setPayoutTax, opts);
export const useMarkPayoutPaid = () => useApiMutation(api.markPayoutPaid, opts);
export const useUndoPayoutPaid = () => useApiMutation(api.undoPayoutPaid, opts);
export const useDownloadVoucher = () => useApiMutation(api.downloadVoucher);
export const useOpenReceipt = () => useApiMutation(api.openReceipt);
export const usePublishUpdate = () => useApiMutation(api.publishUpdate, opts);
export const useUnpublishUpdate = () => useApiMutation(api.unpublishUpdate, opts);
export const useUploadDocument = () => useApiMutation(api.uploadDocument, opts);
export const useUpdateDocument = () => useApiMutation(api.updateDocument, opts);
export const useOpenDocument = () => useApiMutation(api.openDocument);

// ------------------------------------------------------------------ The signed-in shareholder
export const useMyShareholding = (year?: number) =>
  useQuery({ ...LIVE, queryKey: [...qk.myShareholding, "dashboard", year ?? "now"], queryFn: () => api.getMyShareholding(year), placeholderData: keepPreviousData });
export const useMyInvestorUpdates = () => useQuery({ queryKey: [...qk.myShareholding, "updates"], queryFn: api.myInvestorUpdates });
export const useMyDocuments = () => useQuery({ queryKey: [...qk.myShareholding, "documents"], queryFn: api.myDocuments });
export const useOpenMyDocument = () => useApiMutation(api.openMyDocument);
export const useMyDistributions = () => useQuery({ ...LIVE, queryKey: [...qk.myShareholding, "distributions"], queryFn: api.myDistributions });
export const useDownloadMyVoucher = () => useApiMutation(api.downloadMyVoucher);
export const useOpenMyReceipt = () => useApiMutation(api.openMyReceipt);
