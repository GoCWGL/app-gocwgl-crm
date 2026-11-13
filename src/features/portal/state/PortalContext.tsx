"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PORTAL_PAGES, PORTAL_TAB_ALIASES, type PortalTab, type RequestType } from "@/data/portal";
import { isStaffAdmin, useSession } from "@/utils/auth/session";

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
  /** Build shown on Build progress ("" = the first one). */
  buildId: string;
  /** CRM page tab ("" = pick by what the client has). Build progress lives here as the "progress" tab. */
  crmView: "" | "builds" | "packages" | "progress";
  /** VAs page tab. */
  teamView: "active" | "requests" | "matched";
};

/** Build progress is a tab on the CRM page: links to it (dashboard, funnels, emails) open that tab. */
function withBuildInCrm(s: PortalState): PortalState {
  return s.tab === "build" ? { ...s, tab: "crm", crmView: "progress" } : s;
}

/** Deep links, e.g. /portal?tab=billing from an invoice email. */
function initialState(params: URLSearchParams | null): PortalState {
  const tab = params?.get("tab") ?? "";
  return withBuildInCrm({
    // Old links may name a page that no longer exists (e.g. ?tab=overview).
    tab: tab in PORTAL_PAGES ? (tab as PortalTab) : (PORTAL_TAB_ALIASES[tab] ?? "dashboard"),
    toast: "",
    support: { view: "requests", type: "change", title: "", details: "" },
    openTodoId: "",
    funnelRequestOpen: false,
    editFunnelId: "",
    embedFunnelId: "",
    buildId: "",
    crmView: "",
    teamView: "active",
  });
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
   * True when changes aren't allowed: a portal viewer, or staff other than owners and admins in "View as client".
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
  // Owners and admins act in a client's portal as the client would ("View as client"); other staff only look.
  const staffActing = !!user?.isStaff && !!viewAsClientId && isStaffAdmin(user);
  const readOnly = user?.isStaff ? !staffActing : user?.portalRole === "viewer";
  // The portal team stays the client owner's own business, even for admins.
  const isOwner = !user?.isStaff && user?.portalRole !== "viewer";

  const update = useCallback((patch: Patch) => {
    setState((s) => withBuildInCrm({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
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
