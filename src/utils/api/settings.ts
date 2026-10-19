import { del, get, patch, post, put } from "./client";
import type { DomainCreate, DomainOut, DomainPurpose, OrgSettingsOut, OrgSettingsUpdate } from "./models";

export const getSettings = () => get<OrgSettingsOut>("/admin/settings");
export const updateSettings = (body: OrgSettingsUpdate) => patch<OrgSettingsOut>("/admin/settings", body);
export const setSubdomain = (subdomain: string) => put<OrgSettingsOut>("/admin/settings/subdomain", { subdomain });

export const listDomains = () => get<DomainOut[]>("/admin/domains");
export const addDomain = (body: DomainCreate) => post<DomainOut>("/admin/domains", body);
export const setDomainPurpose = (id: string, purpose: DomainPurpose) => patch<DomainOut>(`/admin/domains/${id}`, { purpose });
/** Checks the DNS TXT record shown in `verificationRecord`. */
export const verifyDomain = (id: string) => post<DomainOut>(`/admin/domains/${id}/verify`);
export const makeDomainPrimary = (id: string) => post<DomainOut>(`/admin/domains/${id}/primary`);
export const deleteDomain = (id: string) => del(`/admin/domains/${id}`);
