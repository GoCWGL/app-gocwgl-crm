"use client";

import { useSearchParams } from "next/navigation";
import type { BillingView } from "../sections/payments/BillingTables";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { HIDDEN_TABS, type AdminTab, type ContactView, type SettingsTab } from "@/data/admin";

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
  /** "New build" modal on the Build Progress page. */
  newBuildOpen: boolean;
  /** Client picked in that modal when it opens ("" = choose). */
  newBuildContactId: string;
  /** Contact shown in the edit drawer. */
  editContactId: string;
  /** Client whose full profile fills the Clients page ("" = the list). */
  clientFullId: string;
  /** Scroll the edit drawer to its team notes when it opens (from a "mentioned you" notification). */
  editContactFocusNotes?: boolean;
  /** Finance › Billing: the tab it opens on (subscriptions, invoices or products). */
  billingView: BillingView;
  /** Contact whose portal is open in "View as client". */
  viewAsId: string;
  /** VA shown in the profile drawer ("" = closed). */
  vaId: string;
  /** VA whose full profile fills People › VAs ("" = the list). */
  vaFullId: string;
  /** Job postings › the client VA request shown full page ("" = the board). */
  jobRequestId: string;
  /** Open media folder ("" = folder list). */
  mediaFolderId: string;
  /** Build Progress tab: the builds, clients' funnel requests, or their CRM requests. */
  /** CRM Requests / Funnel Requests: the builds, or that page's requests ("funnels" is an old link to funnel requests). */
  progressView: "builds" | "funnels" | "requests";
  /** Referral bonus: client referrals or VA referrals (?referrals=vas opens VA referrals). */
  referralKind: "clients" | "vas";
  /** Selected card on the Build Progress page: a build id, or a client id for a paid client with no build yet. */
  projectId: string;
};

const TABS: AdminTab[] = [
  "dashboard", "clients", "vas", "tags", "pipeline", "calendar", "bonuses", "payments", "progress", "funnels", "media",
  "email", "forms", "surveys", "automation", "reporting", "bugs", "status", "training", "sops", "support", "feedback", "jobs",
  "settings",
];

/** Deep links from sign-in: /admin?tab=settings&section=security&enroll=mfa */
function initialState(params: URLSearchParams | null): AdminState {
  const asked = params?.get("tab") as AdminTab | null;
  // Tags and Calendar now live in Settings: an old ?tab=tags or ?tab=calendar link opens that Settings tab.
  const inSettings = asked === "tags" || asked === "calendar";
  const tab: AdminTab | null = inSettings ? "settings" : asked;
  const section = inSettings ? asked : (params?.get("section") as SettingsTab | null);
  return {
    tab: tab && TABS.includes(tab) && !HIDDEN_TABS.has(tab) ? tab : "dashboard",
    contactView: "all",
    settingsTab: section ?? "profile",
    mfaPrompt: params?.get("enroll") === "mfa",
    // Staff signed in without 2-step land on the dashboard with a reminder.
    toast: params?.get("enroll") === "mfa" ? "Turn on 2-step verification in Settings › Security to keep your account safe." : "",
    composer: { mode: "one", contact: "", tag: "", stage: "", subject: "", body: "" },
    emailView: "compose",
    addClientOpen: false,
    newBuildOpen: false,
    newBuildContactId: "",
    editContactId: "",
    clientFullId: "",
    billingView: "subs",
    viewAsId: "",
    vaId: "",
    // /admin?tab=vas&va=<id> opens that VA's full profile (linked from the VA portal's "Viewing as" bar).
    vaFullId: tab === "vas" ? (params?.get("va") ?? "") : "",
    jobRequestId: "",
    mediaFolderId: "",
    progressView: "builds",
    referralKind: params?.get("referrals") === "vas" ? "vas" : "clients",
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
  /** A client's full profile page. */
  openClient: (contactId: string) => void;
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
    setState((s) => {
      const next = { ...s, ...(typeof patch === "function" ? patch(s) : patch) };
      // Calendar lives in Settings now: every link to it (Dashboard, notifications) opens Settings › Calendar.
      if (next.tab === "calendar") return { ...next, tab: "settings", settingsTab: "calendar" };
      // Funnel requests moved from Build Progress to their own menu.
      if (next.tab === "progress" && next.progressView === "funnels") return { ...next, tab: "funnels", progressView: "requests" };
      return next;
    });
  }, []);

  const store = useMemo<AdminStore>(
    () => ({
      state,
      update,
      goTo: (tab) => update({ tab }),
      notify: (toast) => update({ toast }),
      openContacts: (contactView) => update({ tab: "clients", contactView, clientFullId: "" }),
      openClient: (contactId) => update({ tab: "clients", clientFullId: contactId, editContactId: "", vaId: "" }),
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
