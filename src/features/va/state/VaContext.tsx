"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { VA_CLIENT_TABS, VA_PAGES, type VaTab } from "@/data/va";

/**
 * UI-only state for the VA portal: the open page, and for a client's pages (Attendance, Tasks, Assets, Time
 * tracker, Invoices) the client they're for. Server data comes from TanStack Query hooks.
 */
type VaStore = {
  tab: VaTab;
  /** Client whose pages are open (contact id), "" on other pages. */
  client: string;
  /** Opens a page. A client page keeps the current client unless `client` names another one. */
  goTo: (tab: VaTab, client?: string) => void;
};

const VaContext = createContext<VaStore | null>(null);

export function VaProvider({ children }: { children: ReactNode }) {
  // Deep links, e.g. /va?tab=time&client=<id>.
  const params = useSearchParams();
  const param = params?.get("tab") ?? "";
  const [view, setView] = useState<{ tab: VaTab; client: string }>(() => {
    const tab = param in VA_PAGES ? (param as VaTab) : "dashboard";
    return { tab, client: VA_CLIENT_TABS.has(tab) ? (params?.get("client") ?? "") : "" };
  });
  const goTo = useCallback(
    (tab: VaTab, client?: string) =>
      setView((v) => ({ tab, client: VA_CLIENT_TABS.has(tab) ? (client ?? v.client) : "" })),
    [],
  );
  const store = useMemo<VaStore>(() => ({ ...view, goTo }), [view, goTo]);
  return <VaContext.Provider value={store}>{children}</VaContext.Provider>;
}

export function useVa(): VaStore {
  const store = useContext(VaContext);
  if (!store) throw new Error("useVa must be used inside <VaProvider>");
  return store;
}
