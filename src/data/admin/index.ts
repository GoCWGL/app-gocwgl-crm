export * from "./billing";
export * from "./calendar";
export * from "./contacts";
export * from "./delivery";
export * from "./marketing";
export * from "./settings";
export * from "./support";
export * from "./surveys";

/** Every page in the admin CRM. */
export type AdminTab =
  | "dashboard"
  | "clients"
  | "tags"
  | "pipeline"
  | "calendar"
  | "payments"
  | "affiliates"
  | "progress"
  | "media"
  | "email"
  | "forms"
  | "surveys"
  | "automation"
  | "reporting"
  | "bugs"
  | "settings";

export const ADMIN_PAGES: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Everyone who signed up on your landing page, and where they are now." },
  clients: { title: "Clients", subtitle: "Every lead and client captured from your landing page." },
  tags: { title: "Tags", subtitle: "Create and manage the tags you use on your contacts." },
  pipeline: { title: "Pipeline", subtitle: "Move each lead from signup to paid subscriber." },
  calendar: { title: "Calendar", subtitle: "Discovery calls booked by your leads." },
  payments: { title: "Invoices", subtitle: "Invoices, payments and subscriptions from your clients. Clients pay through each invoice’s payment link." },
  affiliates: { title: "Affiliates", subtitle: "Clients who refer clients. Each referral earns its referrer a bonus once the new client pays for a CRM." },
  progress: { title: "Build Progress", subtitle: "Track the system you are building for each paid client and share the progress with them." },
  media: { title: "Client Media", subtitle: "One media folder per client. Files your clients upload from their portal land here." },
  email: { title: "Email", subtitle: "Send emails to one contact, a tag or a whole pipeline stage." },
  forms: { title: "Forms", subtitle: "Build forms for your landing pages. Every submission lands in your CRM." },
  surveys: { title: "Surveys", subtitle: "Build surveys and quizzes with your own questions, then embed them on any page." },
  automation: { title: "Automation", subtitle: "Workflows that run when a lead signs up, books or pays." },
  reporting: { title: "Reports", subtitle: "How well signups turn into calls and paying subscribers." },
  bugs: { title: "Report Bugs", subtitle: "Every bug your clients report from their own CRM, in one place." },
  settings: { title: "Settings", subtitle: "Your profile, business details, team and preferences." },
};

/** Contacts (everyone) and Clients, which has Active and Inactive tabs. */
export type ContactView = "all" | "active" | "inactive";

export const CONTACT_VIEWS: Record<ContactView, { title: string; subtitle: string }> = {
  all: { title: "All Contacts", subtitle: "Everyone captured from your landing pages, forms and manual entries." },
  active: { title: "Clients", subtitle: "Active clients are paying now; inactive ones are lost leads, paused or stopped paying." },
  inactive: { title: "Clients", subtitle: "Active clients are paying now; inactive ones are lost leads, paused or stopped paying." },
};

/** The CRM menus a team member can be given (Settings › Team). Same keys as the API. */
export type MenuKey =
  | "dashboard"
  | "contacts"
  | "pipeline"
  | "calendar"
  | "payments"
  | "affiliates"
  | "progress"
  | "media"
  | "email"
  | "forms"
  | "surveys"
  | "automation"
  | "reporting"
  | "bugs";

export const MENUS: Array<{ key: MenuKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reporting", label: "Reports" },
  { key: "contacts", label: "Contacts & Clients" },
  { key: "pipeline", label: "Pipeline" },
  { key: "calendar", label: "Calendar" },
  { key: "progress", label: "Build Progress" },
  { key: "media", label: "Client Media" },
  { key: "payments", label: "Invoices" },
  { key: "affiliates", label: "Affiliates" },
  { key: "email", label: "Email" },
  { key: "forms", label: "Forms" },
  { key: "surveys", label: "Surveys" },
  { key: "automation", label: "Automation" },
  { key: "bugs", label: "Report a bug" },
];

/**
 * Pages hidden for now: not in the sidebar, the team menu picker or deep links. Their data and pages stay as they are;
 * remove a key here to bring it back.
 */
export const HIDDEN_TABS: ReadonlySet<string> = new Set(["email", "forms", "surveys", "automation"]);
/** The menus shown in Settings › Team. */
export const VISIBLE_MENUS = MENUS.filter((m) => !HIDDEN_TABS.has(m.key));

/** Which menu each page belongs to (Settings is always available: everyone has a profile). */
export const TAB_MENU: Record<AdminTab, MenuKey | null> = {
  dashboard: "dashboard",
  clients: "contacts",
  tags: "contacts",
  pipeline: "pipeline",
  calendar: "calendar",
  payments: "payments",
  affiliates: "affiliates",
  progress: "progress",
  media: "media",
  email: "email",
  forms: "forms",
  surveys: "surveys",
  automation: "automation",
  reporting: "reporting",
  bugs: "bugs",
  settings: null,
};
