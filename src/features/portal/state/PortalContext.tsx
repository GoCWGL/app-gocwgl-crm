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
  /** Funnels page tab ("" = pick by what the client has). */
  funnelView: "" | "builds" | "packages" | "progress";
  /** Package to start a new funnel request with (from Get a funnel); "" = let them pick. */
  funnelPackage: string;
  /** CRM page tab ("" = pick by what the client has). Build progress lives here as the "progress" tab. */
  crmView: "" | "builds" | "packages" | "progress";
  /** VA tracker page tab: the time log, or who's working right now (Live work lives here). */
  trackerView: "tracker" | "live";
  /** VAs page tab. */
  teamView: "requests" | "matched";
};

/** Build progress is a tab on the CRM page, and Live work one on the VA tracker: links to them open those tabs. */
function withBuildInCrm(s: PortalState): PortalState {
  if (s.tab === "build") return { ...s, tab: "crm", crmView: "progress" };
  // Live work is a tab on the VA tracker page: links to it (dashboard, emails) open that tab.
  if (s.tab === "live") return { ...s, tab: "journal", trackerView: "live" };
  return s;
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
    funnelView: "",
    funnelPackage: "",
    teamView: "requests",
    trackerView: "tracker",
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
      // Opening the VA tracker shows its Tracker tab (Live work links use tab "live", which opens the Live work tab).
      goTo: (tab) => update(tab === "journal" ? { tab, trackerView: "tracker" } : { tab }),
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
