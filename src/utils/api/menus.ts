import { get, post } from "./client";

/** The number beside each menu ("needs attention" or "new since you last looked"), per portal. */
export type MenuPortal = "admin" | "portal" | "va";

const BASE: Record<MenuPortal, string> = { admin: "/admin/menu-counts", portal: "/portal/menu-counts", va: "/va/menu-counts" };

export const menuCounts = (portal: MenuPortal) => get<Record<string, number>>(BASE[portal]);
/** "I opened this menu": clears its "new since you last looked". */
export const markMenuSeen = (portal: MenuPortal, menu: string) => post<void>(`${BASE[portal]}/seen`, { menu });
