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
  | "vas"
  | "tags"
  | "pipeline"
  | "calendar"
  | "bonuses"
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
  | "status"
  | "training"
  | "sops"
  | "support"
  | "feedback"
  | "jobs"
  | "funnels"
  | "settings";

/** The pages inside the CRM Requests menu, in tab order. */
export const CRM_TABS: AdminTab[] = ["progress", "media"];
/** The pages inside the Dashboard menu, in tab order. */
export const DASHBOARD_TABS: AdminTab[] = ["dashboard", "reporting"];

/** Menus that hold several pages, shown as tabs at the top of each one. */
export const TAB_GROUPS: Array<{
  label: string;
  tabs: Array<{ tab: AdminTab; label: string; hint: string; icon: "grid" | "chart" | "rocket" | "folder"; tone: "brand" | "cyan" | "purple" | "indigo" }>;
}> = [
  {
    label: "Dashboard",
    tabs: [
      { tab: "dashboard", label: "Overview", hint: "Sign-ups and where they are", icon: "grid", tone: "brand" },
      { tab: "reporting", label: "Reports", hint: "Highlights and trends", icon: "chart", tone: "purple" },
    ],
  },
  {
    label: "CRM Requests",
    tabs: [
      { tab: "progress", label: "Build progress", hint: "CRM builds and requests", icon: "rocket", tone: "brand" },
      { tab: "media", label: "Client media", hint: "Files clients shared", icon: "folder", tone: "indigo" },
    ],
  },
];

export const ADMIN_PAGES: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview: everyone who signed up on your landing page, and where they are now." },
  clients: { title: "Clients", subtitle: "Every lead and client captured from your landing page." },
  vas: { title: "VAs", subtitle: "Your virtual assistants, the clients they support and their portal." },
  tags: { title: "Tags", subtitle: "Create and manage the tags you use on your contacts." },
  pipeline: { title: "Pipeline", subtitle: "Move each lead from signup to paid subscriber." },
  calendar: { title: "Calendar", subtitle: "Discovery calls booked by your leads." },
  bonuses: { title: "Referral bonus", subtitle: "Every referral and its bonus: what to pay, what's pending and what's paid." },
  payments: { title: "Billing", subtitle: "Subscriptions, invoices and the products you sell. Clients pay through each payment link." },
  affiliates: { title: "Affiliates", subtitle: "Clients who refer clients. Open one to see who they referred." },
  progress: { title: "CRM Requests", subtitle: "Build progress: track the system you’re building for each paid client and share the progress with them." },
  funnels: { title: "Funnel Requests", subtitle: "Funnels clients asked for from their portal: what they want, whether it’s paid, and a way to start the build." },
  media: { title: "CRM Requests", subtitle: "Client media: one folder per client. Files your clients upload from their portal land here." },
  email: { title: "Email", subtitle: "Send emails to one contact, a tag or a whole pipeline stage." },
  forms: { title: "Forms", subtitle: "Build forms for your landing pages. Every submission lands in your CRM." },
  surveys: { title: "Surveys", subtitle: "Build surveys and quizzes with your own questions, then embed them on any page." },
  automation: { title: "Automation", subtitle: "Workflows that run when a lead signs up, books or pays." },
  reporting: { title: "Dashboard", subtitle: "Reports: team hours, billing and meeting no-shows, plus how signups turn into paying clients." },
  bugs: { title: "Report Bugs", subtitle: "Every bug your clients report from their own CRM, in one place." },
  status: { title: "Status", subtitle: "See which VAs are working right now, who they're working for, who's on a break and who's offline." },
  training: { title: "Training", subtitle: "YouTube lessons for your VAs and clients. VAs take a quiz and pass at your passing rate." },
  sops: { title: "SOPs", subtitle: "Step-by-step guides for your clients and your VAs. Draft them, then publish when they're ready." },
  support: { title: "Support", subtitle: "Every request for help from your clients and your VAs, in one place." },
  jobs: { title: "Job Postings", subtitle: "Client roles for your VAs: review them, post them, interview, and mark them filled." },
  feedback: { title: "Feedback", subtitle: "What your clients say about their VAs: star ratings and comments." },
  settings: { title: "Settings", subtitle: "Your profile, business details, team and preferences." },
};

/** Contacts (everyone) and Clients, which has Active and Inactive tabs. */
export type ContactView = "all" | "onboarding" | "active" | "inactive";

export const CONTACT_VIEWS: Record<ContactView, { title: string; subtitle: string }> = {
  all: { title: "All Contacts", subtitle: "Everyone captured from your landing pages, forms and manual entries." },
  onboarding: { title: "Clients", subtitle: "Onboarding clients applied or have paid and are getting set up; active clients are up and running; inactive ones are lost leads, paused or stopped paying." },
  active: { title: "Clients", subtitle: "Onboarding clients applied or have paid and are getting set up; active clients are up and running; inactive ones are lost leads, paused or stopped paying." },
  inactive: { title: "Clients", subtitle: "Onboarding clients applied or have paid and are getting set up; active clients are up and running; inactive ones are lost leads, paused or stopped paying." },
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
  { key: "dashboard", label: "Dashboard › Overview" },
  { key: "reporting", label: "Dashboard › Reports" },
  { key: "contacts", label: "Contacts & Clients" },
  { key: "pipeline", label: "Pipeline" },
  { key: "calendar", label: "Calendar" },
  { key: "progress", label: "CRM Requests › Build progress" },
  { key: "media", label: "CRM Requests › Client media" },
  { key: "payments", label: "Billing" },
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
export const HIDDEN_TABS: ReadonlySet<string> = new Set(["email", "forms", "automation"]);
/** The menus shown in Settings › Team. */
export const VISIBLE_MENUS = MENUS.filter((m) => !HIDDEN_TABS.has(m.key));

/** Which menu each page belongs to (Settings is always available: everyone has a profile). */
export const TAB_MENU: Record<AdminTab, MenuKey | null> = {
  dashboard: "dashboard",
  clients: "contacts",
  // No menu of its own yet: whoever can use Contacts & Clients sees VAs.
  vas: "contacts",
  tags: "contacts",
  pipeline: "pipeline",
  calendar: "calendar",
  bonuses: "affiliates",
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
  // Engagement pages without data yet have no menu of their own: everyone on the team sees them.
  status: null,
  training: null,
  sops: null,
  // Tickets belong to the "Report a bug" menu on the API.
  support: "bugs",
  feedback: null,
  jobs: null,
  // Funnel Requests used to be a Build Progress tab: same access.
  funnels: "progress",
  settings: null,
};
