"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_ASSETS,
  INITIAL_BRAND_KIT,
  INITIAL_CUSTOM_LINKS,
  INITIAL_FUNNELS,
  INITIAL_INVOICES,
  INITIAL_MESSAGES,
  INITIAL_PROFILE,
  INITIAL_SOCIALS,
  INITIAL_TEAM,
  INITIAL_TICKETS,
  INITIAL_TODOS,
  INITIAL_UPDATES,
  type Asset,
  type ChatMessage,
  type CustomLink,
  type Funnel,
  type Invoice,
  type PortalTab,
  type Profile,
  type RequestType,
  type SocialKey,
  type Ticket,
  type Todo,
  type Update,
} from "@/data/portal";

/** Draft of the support request form; other pages can prefill it. */
export type SupportDraft = {
  view: "requests" | "messages";
  type: RequestType;
  title: string;
  details: string;
};

export type PortalState = {
  tab: PortalTab;
  toast: string;

  todos: Todo[];
  updates: Update[];
  invoices: Invoice[];
  tickets: Ticket[];
  messages: ChatMessage[];
  funnels: Funnel[];
  assets: Asset[];
  brandKit: typeof INITIAL_BRAND_KIT;

  profile: Profile;
  alerts: Record<string, boolean>;
  team: Array<{ name: string; email: string; role: string }>;
  socials: Record<SocialKey, string>;
  customLinks: CustomLink[];

  /** System health issues the client can resolve from the Health page. */
  calendarFixed: boolean;
  emailFixed: boolean;

  support: SupportDraft;
  /** Todo shown in the details drawer (0 = closed). */
  openTodoId: number;
  funnelRequestOpen: boolean;
  /** Funnel whose request is being edited in the request drawer (0 = new request). */
  editFunnelId: number;
  /** Funnel shown in the embed code dialog (0 = closed). */
  embedFunnelId: number;
};

const INITIAL_STATE: PortalState = {
  tab: "overview",
  toast: "",
  todos: INITIAL_TODOS,
  updates: INITIAL_UPDATES,
  invoices: INITIAL_INVOICES,
  tickets: INITIAL_TICKETS,
  messages: INITIAL_MESSAGES,
  funnels: INITIAL_FUNNELS,
  assets: INITIAL_ASSETS,
  brandKit: INITIAL_BRAND_KIT,
  profile: INITIAL_PROFILE,
  alerts: { report: true, lead: true, health: true, build: true },
  team: INITIAL_TEAM,
  socials: INITIAL_SOCIALS,
  customLinks: INITIAL_CUSTOM_LINKS,
  calendarFixed: false,
  emailFixed: false,
  support: { view: "requests", type: "change", title: "", details: "" },
  openTodoId: 0,
  funnelRequestOpen: false,
  editFunnelId: 0,
  embedFunnelId: 0,
};

type Patch = Partial<PortalState> | ((state: PortalState) => Partial<PortalState>);

type PortalStore = {
  state: PortalState;
  /** Shallow-merge a patch into the state. */
  update: (patch: Patch) => void;
  goTo: (tab: PortalTab) => void;
  notify: (message: string) => void;
  /** Jump to Support with the request form prefilled. */
  openSupport: (draft?: Partial<SupportDraft>) => void;
};

const PortalContext = createContext<PortalStore | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortalState>(INITIAL_STATE);

  const update = useCallback((patch: Patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const store = useMemo<PortalStore>(
    () => ({
      state,
      update,
      goTo: (tab) => update({ tab }),
      notify: (toast) => update({ toast }),
      openSupport: (draft) =>
        update((s) => ({ tab: "support", support: { ...s.support, view: "requests", ...draft } })),
    }),
    [state, update],
  );

  return <PortalContext.Provider value={store}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalStore {
  const store = useContext(PortalContext);
  if (!store) throw new Error("usePortal must be used inside <PortalProvider>");
  return store;
}
