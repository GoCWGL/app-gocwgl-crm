"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { VA_PAGES, type VaTab } from "@/data/va";

/** UI-only state for the VA portal: the open page. Server data will come from TanStack Query hooks. */
type VaStore = {
  tab: VaTab;
  goTo: (tab: VaTab) => void;
};

const VaContext = createContext<VaStore | null>(null);

export function VaProvider({ children }: { children: ReactNode }) {
  // Deep links, e.g. /va?tab=time.
  const param = useSearchParams()?.get("tab") ?? "";
  const [tab, setTab] = useState<VaTab>(param in VA_PAGES ? (param as VaTab) : "dashboard");
  const store = useMemo<VaStore>(() => ({ tab, goTo: setTab }), [tab]);
  return <VaContext.Provider value={store}>{children}</VaContext.Provider>;
}

export function useVa(): VaStore {
  const store = useContext(VaContext);
  if (!store) throw new Error("useVa must be used inside <VaProvider>");
  return store;
}
