"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/vaAssets";
import type { AssetIn, AssetUpdate, UnlockIn, VaAssetIn } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useClientAssets = () => useQuery({ queryKey: qk.portalVaAssets, queryFn: api.clientAssets });
export const useCreateAsset = () => useApiMutation((body: AssetIn) => api.createAsset(body), { invalidate: [qk.portalVaAssets] });
export const useUpdateAsset = () =>
  useApiMutation((v: { id: string; body: AssetUpdate }) => api.updateAsset(v.id, v.body), { invalidate: [qk.portalVaAssets] });
export const useDeleteAsset = () => useApiMutation(api.deleteAsset, { invalidate: [qk.portalVaAssets] });

export const useMyAssets = (clientId: string, enabled = true) =>
  useQuery({
    queryKey: [...qk.vaAssets, clientId],
    queryFn: () => api.myAssets(clientId),
    enabled,
    placeholderData: keepPreviousData,
    // Logins aren't kept around once you leave the page.
    gcTime: 0,
  });

export const useAddMyAsset = () => useApiMutation((body: VaAssetIn) => api.addMyAsset(body), { invalidate: [qk.vaAssets] });
export const useUpdateMyAsset = () =>
  useApiMutation((v: { id: string; body: AssetUpdate }) => api.updateMyAsset(v.id, v.body), { invalidate: [qk.vaAssets] });
export const useDeleteMyAsset = () => useApiMutation(api.deleteMyAsset, { invalidate: [qk.vaAssets] });

/** Whether this device can show passwords. Checked again every minute (it locks after 24 hours away). */
export const useUnlockStatus = (enabled = true) =>
  useQuery({ queryKey: qk.vaAssetsUnlock, queryFn: api.unlockStatus, enabled, refetchInterval: 60_000, gcTime: 0 });
export const useUnlockAssets = () => useApiMutation((body: UnlockIn) => api.unlockAssets(body), { invalidate: [qk.vaAssetsUnlock] });
export const useSendUnlockCode = () => useApiMutation(() => api.sendUnlockCode());
export const useLockAssets = () => useApiMutation(() => api.lockAssets(), { invalidate: [qk.vaAssetsUnlock] });
