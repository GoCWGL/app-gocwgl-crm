"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AdminTab, ContactView, SettingsTab } from "@/data/admin";

/** The email composer can be prefilled from other pages (pipeline cards, progress). */
export type ComposerDraft = {
  mode: "one" | "tag" | "stage";
  /** Contact id (mode "one"), tag id (mode "tag") or stage (mode "stage"). */
  contact: string;
  tag: string;
  stage: string;
  subject: string;
  body: string;
};

/**
 * UI-only state for the admin CRM: which page is open, drawers, the composer draft.
 * Everything the server owns (contacts, invoices, settings…) comes from TanStack Query hooks in src/utils/hooks.
 */
export type AdminState = {
  // Navigation
  tab: AdminTab;
  contactView: ContactView;
  settingsTab: SettingsTab;
  /** Staff signed in without 2-step: show the "turn it on" prompt in Settings › Security. */
  mfaPrompt: boolean;
  toast: string;

  // Email composer
  composer: ComposerDraft;
  emailView: "compose" | "templates";

  // Overlays ("" = closed)
  addClientOpen: boolean;
  /** Contact shown in the edit drawer. */
  editContactId: string;
  /** Contact whose portal is open in "View as client". */
  viewAsId: string;
  /** Open media folder ("" = folder list). */
  mediaFolderId: string;
  /** Selected client on the Build Progress page. */
  projectId: string;
};

const TABS: AdminTab[] = [
  "dashboard", "clients", "tags", "pipeline", "calendar", "payments", "progress", "media",
  "email", "forms", "surveys", "automation", "reporting", "bugs", "settings",
];

/** Deep links from sign-in: /admin?tab=settings&section=security&enroll=mfa */
function initialState(params: URLSearchParams | null): AdminState {
  const tab = params?.get("tab") as AdminTab | null;
  const section = params?.get("section") as SettingsTab | null;
  return {
    tab: tab && TABS.includes(tab) ? tab : "dashboard",
    contactView: "all",
    settingsTab: section ?? "profile",
    mfaPrompt: params?.get("enroll") === "mfa",
    toast: "",
    composer: { mode: "one", contact: "", tag: "", stage: "", subject: "", body: "" },
    emailView: "compose",
    addClientOpen: false,
    editContactId: "",
    viewAsId: "",
    mediaFolderId: "",
    projectId: "",
  };
}

type Patch = Partial<AdminState> | ((state: AdminState) => Partial<AdminState>);

export type AdminStore = {
  state: AdminState;
  /** Shallow-merge a patch into the state. */
  update: (patch: Patch) => void;
  goTo: (tab: AdminTab) => void;
  /** Show the floating toast in the bottom-right corner. */
  notify: (message: string) => void;
  openContacts: (view: ContactView) => void;
  /** Open the email composer addressed to one contact, optionally prefilled. */
  emailContact: (contactId: string, prefill?: Partial<Pick<ComposerDraft, "subject" | "body">>) => void;
  openMediaFolder: (contactId: string) => void;
};

const AdminContext = createContext<AdminStore | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  // useSearchParams (not window.location): during a client navigation the address bar updates after this renders.
  const params = useSearchParams();
  const [state, setState] = useState<AdminState>(() => initialState(params));

  const update = useCallback((patch: Patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const store = useMemo<AdminStore>(
    () => ({
      state,
      update,
      goTo: (tab) => update({ tab }),
      notify: (toast) => update({ toast }),
      openContacts: (contactView) => update({ tab: "clients", contactView }),
      emailContact: (contactId, prefill) =>
        update((s) => ({
          tab: "email",
          emailView: "compose",
          editContactId: "",
          composer: { ...s.composer, mode: "one", contact: contactId, ...prefill },
        })),
      openMediaFolder: (contactId) => update({ tab: "media", mediaFolderId: contactId, editContactId: "" }),
    }),
    [state, update],
  );

  return <AdminContext.Provider value={store}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminStore {
  const store = useContext(AdminContext);
  if (!store) throw new Error("useAdmin must be used inside <AdminProvider>");
  return store;
}
