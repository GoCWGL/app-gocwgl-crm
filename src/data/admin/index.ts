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
  | "leads"
  | "clients"
  | "vas"
  | "tags"
  | "calendar"
  | "bonuses"
  | "billingOverview"
  | "payments"
  | "expenses"
  | "products"
  | "affiliates"
  | "investorOverview"
  | "shareholders"
  | "capTable"
  | "distributions"
  | "investorUpdates"
  | "dataRoom"
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
  | "clientStatus"
  | "clientTraining"
  | "clientSops"
  | "announcements"
  | "support"
  | "feedback"
  | "clientFeedback"
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
  leads: { title: "Leads", subtitle: "Everyone who booked a call on any of your calendars, or you added, who isn't a client or a VA yet." },
  clients: { title: "Clients", subtitle: "Every lead and client captured from your landing page." },
  vas: { title: "VAs", subtitle: "Your virtual assistants, the clients they support and their portal." },
  tags: { title: "Tags", subtitle: "Create and manage the tags you use on your contacts." },
  calendar: { title: "Calendar", subtitle: "Discovery calls booked by your leads." },
  bonuses: { title: "Referral bonus", subtitle: "Every referral and its bonus: what to pay, what's pending and what's paid." },
  billingOverview: { title: "Overview", subtitle: "Income & billing at a glance: what’s paid, what’s pending and what needs your attention." },
  payments: { title: "Billing & invoices", subtitle: "Subscriptions, invoices and each month’s client invoices. Clients pay through each payment link." },
  expenses: { title: "Expenses", subtitle: "What the business spends: hosting, clients’ hosting, software and anything else, once or repeating." },
  products: { title: "Products", subtitle: "What you sell, with its price and payment link. Pick one when you bill a client." },
  affiliates: { title: "Affiliates", subtitle: "Clients who refer clients. Open one to see who they referred." },
  investorOverview: { title: "Overview", subtitle: "How the business is doing: net income, costs, cash and budget." },
  shareholders: { title: "Shareholders", subtitle: "Founders, investors and advisors: their details, checks and your history with them." },
  capTable: { title: "Cap Table & Equity", subtitle: "Who owns what, how each round changed it, the option pool and what each stake is worth." },
  distributions: { title: "Declare Distribution", subtitle: "Dividends, returns of capital and exit payouts: declare them, withhold tax and track every payment." },
  investorUpdates: { title: "Investor Updates & KPIs", subtitle: "Monthly and quarterly updates. Shareholders see them once you publish." },
  dataRoom: { title: "Data Room & Governance", subtitle: "Legal, tax and board documents, and who can open each one." },
  progress: { title: "CRM Requests", subtitle: "Build progress: track the system you’re building for each paid client and share the progress with them." },
  funnels: { title: "Funnel Requests", subtitle: "Funnels clients asked for from their portal: what they want, whether it’s paid, and a way to start the build." },
  media: { title: "CRM Requests", subtitle: "Client media: one folder per client. Files your clients upload from their portal land here." },
  email: { title: "Email", subtitle: "Send emails to one contact, a tag or everyone in a stage." },
  forms: { title: "Forms", subtitle: "Build forms for your landing pages. Every submission lands in your CRM." },
  surveys: { title: "Surveys", subtitle: "Build surveys and quizzes with your own questions, then embed them on any page." },
  automation: { title: "Automation", subtitle: "Workflows that run when a lead signs up, books or pays." },
  reporting: { title: "Dashboard", subtitle: "Reports: team hours, billing and meeting no-shows, plus how signups turn into paying clients." },
  bugs: { title: "Report Bugs", subtitle: "Every bug your clients report from their own CRM, in one place." },
  status: { title: "Status", subtitle: "See which VAs are working right now, who they're working for, who's on a break and who's offline." },
  training: { title: "VA training", subtitle: "Video and reading lessons for your VAs. They take a quiz and pass at your passing rate." },
  sops: { title: "VA SOPs", subtitle: "Step-by-step guides for your VAs. Draft them, then publish when they're ready." },
  clientStatus: { title: "Client live status", subtitle: "Which clients have their portal open right now, and when the others were last on." },
  clientTraining: { title: "Client training", subtitle: "Video and reading lessons for your clients, assigned to the clients who should see them." },
  clientSops: { title: "Client SOPs", subtitle: "Step-by-step guides for your clients. Draft them, then publish when they're ready." },
  announcements: { title: "Announcements", subtitle: "Updates for your clients’ portals (CRM › Updates & Resources). Draft them, then publish." },
  support: { title: "Support", subtitle: "Every request for help from your clients and your VAs, in one place." },
  jobs: { title: "Job Postings", subtitle: "Client roles for your VAs: review them, post them, interview, and mark them filled." },
  feedback: { title: "VA rating", subtitle: "What your clients say about their VAs: star ratings and comments." },
  clientFeedback: { title: "Client feedback", subtitle: "What your clients think of their portal, sent as Feedback from Request support." },
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
  | "reporting"
  | "progress"
  | "media"
  | "funnels"
  | "jobs"
  | "contacts"
  | "vas"
  | "surveys"
  | "payments"
  | "affiliates"
  | "email"
  | "forms"
  | "automation"
  | "calendar"
  | "bugs";

/** Every menu, as the sidebar names and groups it, in sidebar order. `hint` lists the pages it opens. */
export const MENUS: Array<{ key: MenuKey; label: string; group: string; hint?: string }> = [
  { key: "dashboard", label: "Dashboard › Overview", group: "Overview" },
  { key: "reporting", label: "Dashboard › Reports", group: "Overview" },
  { key: "progress", label: "CRM Requests › Build progress", group: "Overview" },
  { key: "media", label: "CRM Requests › Client media", group: "Overview" },
  { key: "funnels", label: "Funnel Requests", group: "Overview" },
  { key: "jobs", label: "Job Postings", group: "Overview" },
  { key: "contacts", label: "Leads & Clients", group: "People", hint: "Leads, client directory, live status, training, SOPs, announcements, feedback and tags" },
  { key: "vas", label: "VAs", group: "People", hint: "VA directory, live status, training and SOPs" },
  { key: "surveys", label: "VAs › Surveys", group: "People" },
  { key: "bugs", label: "Support desk & Report a bug", group: "People" },
  { key: "payments", label: "Income & Billing", group: "Business", hint: "Overview, billing & invoices, products and expenses" },
  { key: "affiliates", label: "Affiliates & referral payouts", group: "Business" },
  { key: "email", label: "Email", group: "Business" },
  { key: "forms", label: "Forms", group: "Business" },
  { key: "automation", label: "Automation", group: "Business" },
  { key: "calendar", label: "Calendar", group: "Settings", hint: "Settings › Calendar: booking calendars and connections" },
];

/**
 * Pages hidden for now: not in the sidebar, the team menu picker or deep links. Their data and pages stay as they are;
 * remove a key here to bring it back.
 */
export const HIDDEN_TABS: ReadonlySet<string> = new Set(["email", "forms", "automation"]);
/** The menus shown in Settings › Team. */
export const VISIBLE_MENUS = MENUS.filter((m) => !HIDDEN_TABS.has(m.key));

/** Pages only super admins can open (the API enforces it). */
export const SUPER_ADMIN_TABS: ReadonlySet<AdminTab> = new Set<AdminTab>(["investorOverview", "shareholders", "capTable", "distributions", "investorUpdates", "dataRoom"]);

/** Pages for owners and admins only (the API enforces it). */
export const ADMIN_ONLY_TABS: ReadonlySet<AdminTab> = new Set<AdminTab>(["expenses"]);

/** Which menu each page belongs to (Settings is always available: everyone has a profile). */
export const TAB_MENU: Record<AdminTab, MenuKey | null> = {
  dashboard: "dashboard",
  leads: "contacts",
  clients: "contacts",
  vas: "vas",
  tags: "contacts",
  calendar: "calendar",
  bonuses: "affiliates",
  // Income & Billing: the overview, invoices, products and expenses.
  billingOverview: "payments",
  payments: "payments",
  // For owners and admins only (see ADMIN_ONLY_TABS).
  expenses: "payments",
  products: "payments",
  affiliates: "affiliates",
  // Super admins only (see SUPER_ADMIN_TABS).
  investorOverview: null,
  shareholders: null,
  capTable: null,
  distributions: null,
  investorUpdates: null,
  dataRoom: null,
  progress: "progress",
  media: "media",
  email: "email",
  forms: "forms",
  surveys: "surveys",
  automation: "automation",
  reporting: "reporting",
  bugs: "bugs",
  // The VAs menu's pages.
  status: "vas",
  training: "vas",
  sops: "vas",
  // The Clients menu's pages: whoever can use Contacts & Clients sees them.
  clientStatus: "contacts",
  clientTraining: "contacts",
  clientSops: "contacts",
  announcements: "contacts",
  // Tickets belong to the "Support desk & Report a bug" menu on the API.
  support: "bugs",
  // Client care, in the Clients menu.
  feedback: "contacts",
  clientFeedback: "contacts",
  jobs: "jobs",
  funnels: "funnels",
  settings: null,
};
