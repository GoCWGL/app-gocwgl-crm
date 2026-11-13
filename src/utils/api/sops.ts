import { del, get, patch, post } from "./client";
import type { SopIn, SopOut, SopUpdate } from "./models";

// Engagement › SOPs (staff).
export const listSops = () => get<SopOut[]>("/admin/sops");
export const createSop = (body: SopIn) => post<SopOut>("/admin/sops", body);
export const updateSop = (id: string, body: SopUpdate) => patch<SopOut>(`/admin/sops/${id}`, body);
export const deleteSop = (id: string) => del(`/admin/sops/${id}`);
