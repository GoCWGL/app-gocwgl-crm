"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { markMenuSeen, menuCounts, type MenuPortal } from "@/utils/api/menus";

/**
 * The numbers beside a portal's menus, refreshed every minute. Opening a menu (`tab`) marks it seen, which clears its
 * "new since you last looked" part. Keys start with the portal's own prefix, so switching client or VA drops them.
 */
export function useMenuCounts(portal: MenuPortal, tab: string, enabled = true): Record<string, number> {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [portal, "menu-counts"],
    queryFn: () => menuCounts(portal),
    enabled,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    if (!enabled || !tab) return;
    markMenuSeen(portal, tab)
      .then(() => qc.invalidateQueries({ queryKey: [portal, "menu-counts"] }))
      .catch(() => undefined);
  }, [portal, tab, enabled, qc]);
  return query.data ?? {};
}
