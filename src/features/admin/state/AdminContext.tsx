"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_AUTOMATIONS,
  INITIAL_AVAILABILITY,
  INITIAL_CALENDARS,
  INITIAL_CALENDAR_CONNECTIONS,
  INITIAL_CONTACTS,
  INITIAL_CONTACT_TAGS,
  INITIAL_DOMAINS,
  INITIAL_FORMS,
  INITIAL_INVOICES,
  INITIAL_MEDIA,
  INITIAL_PAYMENT_CONNECTIONS,
  INITIAL_PIPELINES,
  INITIAL_PIPE_ORDER,
  INITIAL_PROJECTS,
  INITIAL_SENT_EMAILS,
  INITIAL_SETTINGS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_SURVEYS,
  INITIAL_TAGS,
  INITIAL_TEAM,
  INITIAL_TEMPLATES,
  INITIAL_TICKETS,
  type AdminTab,
  type Automation,
  type BookingCalendar,
  type BugTicket,
  type CalendarConnection,
  type Contact,
  type ContactView,
  type CoreStage,
  type DayAvailability,
  type Domain,
  type EmailTemplate,
  type Invoice,
  type LeadForm,
  type MediaFile,
  type PaymentConnection,
  type Pipeline,
  type Project,
  type SentEmail,
  type Settings,
  type Subscription,
  type Survey,
  type Tag,
  type TeamMember,
} from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";

/** The email composer can be prefilled from other pages (pipeline cards, progress). */
export type ComposerDraft = {
  mode: "one" | "tag" | "stage";
  contact: string;
  tag: string;
  stage: string;
  subject: string;
  body: string;
};

export type AdminState = {
  // Navigation
  tab: AdminTab;
  contactView: ContactView;
  toast: string;

  // Contacts & sales
  contacts: Contact[];
  contactTags: Record<number, string[]>;
  clientNotes: Record<number, string>;
  tags: Tag[];
  pipelines: Pipeline[];
  /** Card order on the sales pipeline board. */
  pipeOrder: number[];

  // Payments
  subscriptions: Subscription[];
  invoices: Invoice[];
  paymentConnections: Record<string, PaymentConnection>;
  paymentDefault: string;

  // Marketing
  templates: EmailTemplate[];
  sentEmails: SentEmail[];
  composer: ComposerDraft;
  emailView: "compose" | "templates";
  forms: LeadForm[];
  surveys: Survey[];
  automations: Automation[];

  // Calendar
  calendars: BookingCalendar[];
  availability: DayAvailability[];
  calendarConnections: Record<string, CalendarConnection>;

  // Delivery & support
  projects: Record<number, Project>;
  media: Record<number, MediaFile[]>;
  tickets: BugTicket[];

  // Settings
  settings: Settings;
  team: TeamMember[];
  domains: Domain[];
  subdomain: string;

  // Overlays
  addClientOpen: boolean;
  /** Contact shown in the edit drawer (0 = closed). */
  editContactId: number;
  /** Contact whose portal is open in "View as client" (0 = closed). */
  viewAsId: number;
  /** Open media folder (0 = folder list). */
  mediaFolderId: number;
  /** Selected project on the Build Progress page. */
  projectId: number;
};

const INITIAL_STATE: AdminState = {
  tab: "dashboard",
  contactView: "all",
  toast: "",
  contacts: INITIAL_CONTACTS,
  contactTags: INITIAL_CONTACT_TAGS,
  clientNotes: {},
  tags: INITIAL_TAGS,
  pipelines: INITIAL_PIPELINES,
  pipeOrder: INITIAL_PIPE_ORDER,
  subscriptions: INITIAL_SUBSCRIPTIONS,
  invoices: INITIAL_INVOICES,
  paymentConnections: INITIAL_PAYMENT_CONNECTIONS,
  paymentDefault: "stripe",
  templates: INITIAL_TEMPLATES,
  sentEmails: INITIAL_SENT_EMAILS,
  composer: { mode: "one", contact: "", tag: "", stage: "", subject: "", body: "" },
  emailView: "compose",
  forms: INITIAL_FORMS,
  surveys: INITIAL_SURVEYS,
  automations: INITIAL_AUTOMATIONS,
  calendars: INITIAL_CALENDARS,
  availability: INITIAL_AVAILABILITY,
  calendarConnections: INITIAL_CALENDAR_CONNECTIONS,
  projects: INITIAL_PROJECTS,
  media: INITIAL_MEDIA,
  tickets: INITIAL_TICKETS,
  settings: INITIAL_SETTINGS,
  team: INITIAL_TEAM,
  domains: INITIAL_DOMAINS,
  subdomain: "gocwgl",
  addClientOpen: false,
  editContactId: 0,
  viewAsId: 0,
  mediaFolderId: 0,
  projectId: 9,
};

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
  emailContact: (contactId: number, prefill?: Partial<Pick<ComposerDraft, "subject" | "body">>) => void;
  openMediaFolder: (contactId: number) => void;
  /** Move a contact to another sales stage (keeps paid / call fields consistent). */
  setStage: (contactId: number, stage: CoreStage) => void;
  /** Drag-and-drop on the sales board: change stage and card order. */
  moveSalesCard: (contactId: number, stage: string, beforeId: number) => void;
  /** Drag-and-drop on a custom pipeline. */
  movePipelineItem: (pipelineId: string, contactId: number, stage: string, beforeId: number) => void;
};

const AdminContext = createContext<AdminStore | null>(null);

/** Move `id` in an order list so it sits before `beforeId` (or at the end). */
function reorder(order: number[], id: number, beforeId: number): number[] {
  const next = order.filter((x) => x !== id);
  const at = beforeId ? next.indexOf(beforeId) : -1;
  if (at === -1) next.push(id);
  else next.splice(at, 0, id);
  return next;
}

function withStage(contact: Contact, stage: CoreStage): Contact {
  const next = { ...contact, stage };
  if (stage === "paid") next.paidOn = contact.paidOn || TODAY_SHORT;
  if (stage === "lead") {
    next.day = "";
    next.time = "";
  }
  return next;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>(INITIAL_STATE);

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
          composer: { ...s.composer, mode: "one", contact: String(contactId), ...prefill },
        })),
      openMediaFolder: (contactId) => update({ tab: "media", mediaFolderId: contactId, editContactId: 0 }),
      setStage: (contactId, stage) =>
        update((s) => ({ contacts: s.contacts.map((c) => (c.id === contactId ? withStage(c, stage) : c)) })),
      moveSalesCard: (contactId, stage, beforeId) =>
        update((s) => ({
          pipeOrder: reorder(s.pipeOrder, contactId, beforeId),
          contacts: s.contacts.map((c) =>
            c.id === contactId && c.stage !== stage ? withStage(c, stage as CoreStage) : c,
          ),
        })),
      movePipelineItem: (pipelineId, contactId, stage, beforeId) =>
        update((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id !== pipelineId
              ? p
              : { ...p, order: reorder(p.order ?? [], contactId, beforeId), items: { ...p.items, [contactId]: stage } },
          ),
        })),
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
