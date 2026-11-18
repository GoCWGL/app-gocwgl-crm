import { del, get, patch, post } from "./client";
import type { AssetIn, AssetOut, AssetPassword, AssetUpdate, ClientAssetsOut, UnlockIn, UnlockStatus, VaAssetsOut } from "./models";

// Client portal › VA › Assets: logins, links and notes, and which VAs can see each one.
export const clientAssets = () => get<ClientAssetsOut>("/portal/va-assets");
export const createAsset = (body: AssetIn) => post<AssetOut>("/portal/va-assets", body);
export const updateAsset = (id: string, body: AssetUpdate) => patch<AssetOut>(`/portal/va-assets/${id}`, body);
export const deleteAsset = (id: string) => del(`/portal/va-assets/${id}`);
export const clientAssetPassword = (id: string) => get<AssetPassword>(`/portal/va-assets/${id}/password`);

// VA portal › Assets: the ones your clients shared with you.
/** All your shared assets, or one client's (the server refuses a client you don't work for). */
export const myAssets = (clientId?: string) => get<VaAssetsOut>("/va/assets", { client_id: clientId || undefined });
export const myAssetPassword = (id: string) => get<AssetPassword>(`/va/assets/${id}/password`);

// VA portal › Assets: confirm it's you on this device before passwords show (locks after 24 hours away).
export const unlockStatus = () => get<UnlockStatus>("/va/assets/unlock");
export const unlockAssets = (body: UnlockIn) => post<UnlockStatus>("/va/assets/unlock", body);
export const sendUnlockCode = () => post<void>("/va/assets/unlock/email-code");
export const lockAssets = () => del("/va/assets/unlock");
