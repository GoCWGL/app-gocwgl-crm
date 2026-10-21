"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PORTAL_PAGES, type PortalTab, type RequestType } from "@/data/portal";
import { useSession } from "@/utils/auth/session";

/** Draft of the support request form; other pages can prefill it. */
export type SupportDraft = {
  view: "requests" | "messages";
  type: RequestType;
  title: string;
  details: string;
};

/**
 * UI-only state for the client portal: the open page, drawers and the support draft.
 * Everything the server owns comes from TanStack Query hooks in src/utils/hooks.
 */
export type PortalState = {
  tab: PortalTab;
  toast: string;
  support: SupportDraft;
  /** To-do shown in the details drawer ("" = closed). */
  openTodoId: string;
  funnelRequestOpen: boolean;
  /** Funnel whose request is being edited in the request drawer ("" = new request). */
  editFunnelId: string;
  /** Funnel shown in the embed code dialog ("" = closed). */
  embedFunnelId: string;
};

/** Payment return from Polar: /portal?tab=billing&paid=… */
function initialState(params: URLSearchParams | null): PortalState {
  const tab = params?.get("tab") ?? "";
  return {
    // Old links may name a page that no longer exists (e.g. ?tab=overview).
    tab: tab in PORTAL_PAGES ? (tab as PortalTab) : "funnels",
    toast: "",
    support: { view: "requests", type: "change", title: "", details: "" },
    openTodoId: "",
    funnelRequestOpen: false,
    editFunnelId: "",
    embedFunnelId: "",
  };
}

type Patch = Partial<PortalState> | ((state: PortalState) => Partial<PortalState>);

type PortalStore = {
  state: PortalState;
  /** Shallow-merge a patch into the state. */
  update: (patch: Patch) => void;
  goTo: (tab: PortalTab) => void;
  notify: (message: string) => void;
  /** Jump to Support with the request form prefilled. */
  openSupport: (draft?: Partial<SupportDraft>) => void;
  /**
   * True when changes aren't allowed: staff in "View as client", or a portal viewer.
   * The API refuses those writes (403) anyway; this just hides the controls.
   */
  readOnly: boolean;
  /** Portal owner (can manage the portal team). */
  isOwner: boolean;
};

const PortalContext = createContext<PortalStore | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const [state, setState] = useState<PortalState>(() => initialState(params));
  const { user, viewAsClientId } = useSession();
  const readOnly = !!viewAsClientId || !!user?.isStaff || user?.portalRole === "viewer";
  const isOwner = !readOnly && user?.portalRole !== "viewer";

  const update = useCallback((patch: Patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const store = useMemo<PortalStore>(
    () => ({
      state,
      update,
      readOnly,
      isOwner,
      goTo: (tab) => update({ tab }),
      notify: (toast) => update({ toast }),
      openSupport: (draft) => update((s) => ({ tab: "support", support: { ...s.support, view: "requests", ...draft } })),
    }),
    [state, update, readOnly, isOwner],
  );

  return <PortalContext.Provider value={store}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalStore {
  const store = useContext(PortalContext);
  if (!store) throw new Error("usePortal must be used inside <PortalProvider>");
  return store;
}
