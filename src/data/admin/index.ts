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
  payments: { title: "Transactions", subtitle: "Invoices, payments and subscriptions from your clients. Clients pay through Wise payment links." },
  affiliates: { title: "Affiliates", subtitle: "Clients who refer clients. Each referral earns its referrer a bonus once the new client pays for a CRM." },
  progress: { title: "Build Progress", subtitle: "Track the system you are building for each paid client and share the progress with them." },
  media: { title: "Client Media", subtitle: "One media folder per client. Files your clients upload from their portal land here." },
  email: { title: "Email", subtitle: "Send emails to one contact, a tag or a whole pipeline stage." },
  forms: { title: "Forms", subtitle: "Build forms for your landing pages. Every submission lands in your CRM." },
  surveys: { title: "Surveys", subtitle: "Build surveys and quizzes with your own questions, then embed them on any page." },
  automation: { title: "Automation", subtitle: "Workflows that run when a lead signs up, books or pays." },
  reporting: { title: "Reporting", subtitle: "How well signups turn into calls and paying subscribers." },
  bugs: { title: "Report Bugs", subtitle: "Every bug your clients report from their own CRM, in one place." },
  settings: { title: "Settings", subtitle: "Your profile, business details, team and preferences." },
};

/** The Clients page has three views, each with its own title. */
export type ContactView = "all" | "active" | "inactive";

export const CONTACT_VIEWS: Record<ContactView, { title: string; subtitle: string }> = {
  all: { title: "All Contacts", subtitle: "Everyone captured from your landing pages, forms and manual entries." },
  active: { title: "Active Clients", subtitle: "Clients who are currently paying for their subscription." },
  inactive: { title: "Inactive Clients", subtitle: "Lost leads, paused subscriptions and clients who stopped paying." },
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
  { key: "contacts", label: "Contacts" },
  { key: "pipeline", label: "Pipeline" },
  { key: "calendar", label: "Calendar" },
  { key: "payments", label: "Transactions" },
  { key: "affiliates", label: "Affiliates" },
  { key: "progress", label: "Build Progress" },
  { key: "media", label: "Client Media" },
  { key: "email", label: "Email" },
  { key: "forms", label: "Forms" },
  { key: "surveys", label: "Surveys" },
  { key: "automation", label: "Automation" },
  { key: "reporting", label: "Reporting" },
  { key: "bugs", label: "Report Bugs" },
];

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
