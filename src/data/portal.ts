import type { CrmPaymentPlan } from "@/utils/api/models";
import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Client portal copy and options (pure UI constants). Everything the client or
// the server creates (to-dos, funnels, invoices, reports…) comes from the API.
// =============================================================================

// ------------------------------------------------------------------ Types
export type PortalTab =
  | "dashboard"
  | "funnels"
  | "crm"
  | "attendance"
  | "assets"
  | "journal"
  | "team"
  | "agreement"
  | "vateam"
  | "projects"
  | "ratings"
  | "build"
  | "support"
  | "billing"
  | "training"
  | "sops"
  | "affiliate"
  | "account"
  | "recordings"
  | "appointments"
  | "announcements"
  | "documents"
  | "forms";

/** Old ?tab= links that point at a page with a new name. */
export const PORTAL_TAB_ALIASES: Record<string, PortalTab> = { va: "team", invoices: "billing", overview: "dashboard", feedback: "ratings", live: "attendance", vaprojects: "projects", tasks: "projects" };

export type FunnelStatus = "live" | "build" | "pay" | "queued" | "quote";
export type FunnelTypeKey = "lead" | "booking" | "webinar" | "sales" | "membership" | "custom";
export type FunnelPackageKey = "foundation" | "bundle" | "vip";
/** "growth" (Growth CRM) and "custom" (Premium CRM, which was called Custom CRM) are offered; "simple" only on older requests. */
export type CrmPackageKey = "simple" | "growth" | "custom";

/** What the client fills in when requesting a funnel (the API's FunnelRequestIn, minus the name). */
export type FunnelRequestDetails = {
  typeKey: FunnelTypeKey;
  offer: string;
  audience: string;
  notes: string;
  /** Missing on requests from before packages. */
  package?: FunnelPackageKey;
};

export type SocialKey = "facebook" | "instagram" | "tiktok" | "linkedin" | "youtube" | "x" | "google";
export type CustomLink = { id: string; label: string; url: string; touched: boolean };

// ------------------------------------------------------------- Navigation
export const PORTAL_PAGES: Record<PortalTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your VA team right now, and everything that needs a look." },
  funnels: { title: "Funnels", subtitle: "The funnels built for you, how they perform, and requests for new ones." },
  crm: { title: "CRM", subtitle: "Your CRM builds, the packages to get one, and the progress on everything GoCWGL is building for you." },
  attendance: { title: "Attendance", subtitle: "When your VAs clock in and out, and whether they're on time for the schedule you set." },
  assets: { title: "Assets", subtitle: "Logins, links and notes your VAs need. You choose which VA can see each one." },
  journal: { title: "VA tracker", subtitle: "Everything your VAs logged for your business, day by day." },
  team: { title: "Request VA", subtitle: "Ask GoCWGL for a VA, and follow each request until you're matched." },
  agreement: { title: "Agreement", subtitle: "Your GoCWGL VA agreement: the maintenance and training fees, billing and when to pay. Come back anytime to check it." },
  vateam: { title: "Team", subtitle: "The virtual assistants working with your business right now." },
  projects: { title: "Tasks & projects", subtitle: "Tasks go to the VAs already on your team. Projects are one-time work that needs specific skills, done by a different VA." },
  ratings: { title: "Ratings", subtitle: "Rate each VA on your team. Ratings go to GoCWGL and help us support them." },
  build: { title: "Build progress", subtitle: "Follow along as we build your system." },
  support: { title: "Request support", subtitle: "Ask for changes, report a problem, or message your team." },
  billing: { title: "Invoices", subtitle: "Invoices from your VAs and from GoCWGL." },
  training: { title: "Training", subtitle: "Short lessons from GoCWGL on getting the most from your VA team." },
  sops: { title: "SOPs", subtitle: "Your own SOPs for your VAs, and step-by-step guides from GoCWGL." },
  affiliate: { title: "Affiliate", subtitle: "Everyone you referred to GoCWGL, and the bonus for each." },
  account: { title: "Account", subtitle: "Your profile, alerts, password & 2-step verification, and who can see this portal." },
  recordings: { title: "My Recordings", subtitle: "Recordings of your sessions with GoCWGL, to watch again anytime." },
  appointments: { title: "My Appointments", subtitle: "Your calls with GoCWGL: what's coming up, and the ones you've had." },
  announcements: { title: "Updates & Announcements", subtitle: "News from GoCWGL: new features, changes and things to know." },
  documents: { title: "My Documents", subtitle: "Files you and GoCWGL share: blueprints, guides, logos and anything else for your CRM." },
  forms: { title: "My Forms", subtitle: "Forms GoCWGL asks you to fill in, and the answers you've sent." },
};

/**
 * "About this page": what each portal page is for and what the client can do there, shown in a card under the
 * page title (PageGuide). Plain words for someone opening the page for the first time.
 */
/** One side of a side-by-side comparison in "About this page" (Tasks vs Projects). */
export type PortalGuideCompare = {
  title: string;
  icon: IconName;
  tone: "brand" | "purple";
  /** Who it's for, in a pill next to the title. */
  tag: string;
  /** Same labels, in the same order, on both sides. */
  rows: Array<{ label: string; value: string }>;
};

export const PORTAL_PAGE_GUIDE: Record<PortalTab, { purpose: string; points: string[]; compare?: [PortalGuideCompare, PortalGuideCompare] }> = {
  dashboard: {
    purpose: "Your starting point. It sums up your VA team, your open tasks, your builds and anything waiting on you.",
    points: ["See who's working right now and your hours this week", "Jump to open tasks, unpaid invoices and build to-dos", "Click any card to open the page behind it"],
  },
  funnels: {
    purpose: "Everything about the funnels GoCWGL builds for you: the ones you have, new ones to request, and how each build is going.",
    points: ["Your funnel builds: live funnels and the ones being built", "Request Funnel: compare the packages and send a request", "Build progress: the timeline and the to-dos we need from you"],
  },
  crm: {
    purpose: "Your CRM with GoCWGL, from choosing a package to the changes you want after it launches.",
    points: ["Request CRM: compare Growth and Premium, choose how to pay, and book a call", "Your CRM builds and their build progress", "After launch: ask for revisions or new features"],
  },
  recordings: {
    purpose: "Every recorded session with GoCWGL (discovery, blueprint, training) in one place.",
    points: ["Watch a recording again whenever you need it", "Read the notes your team added", "New recordings show up here after each session"],
  },
  appointments: {
    purpose: "Your calls with GoCWGL, so you always know what's next.",
    points: ["See your upcoming calls and join with one click", "Look back at the calls you've had", "Book a new call when you need one"],
  },
  announcements: {
    purpose: "Updates from GoCWGL about your CRM and our services.",
    points: ["Pinned updates stay at the top", "Read new features, changes and tips", "Open the link on an update for more"],
  },
  documents: {
    purpose: "The files for your CRM, shared between you and GoCWGL.",
    points: ["Download what your team shares with you", "Upload logos, spreadsheets or anything we need", "Remove files you uploaded"],
  },
  forms: {
    purpose: "Forms GoCWGL needs from you, like onboarding questions before your blueprint call.",
    points: ["Open a form and send your answers", "See when you last sent each one", "Read the answers you've sent"],
  },
  attendance: {
    purpose: "Checks that your VAs show up on time. It compares each VA's clock-ins and clock-outs to the schedule you set.",
    points: ["See today's clock-ins, late starts and early finishes", "Look back day by day for each VA", "Set each VA's schedule, work days and grace time"],
  },
  assets: {
    purpose: "A safe place for the logins, links and notes your VAs need to do their work.",
    points: ["Add a login or link once instead of sending it in chat", "Choose exactly which VAs can see each one", "Update or remove access at any time"],
  },
  journal: {
    purpose: "A day-by-day record of what your VAs did for your business, from their time tracker.",
    points: ["See the time logged and the tasks each VA completed", "Filter by VA, date, project code or tag", "Use it to check hours before an invoice"],
  },
  team: {
    purpose: "Where you ask GoCWGL for a virtual assistant and follow the hiring until you're matched.",
    points: ["Request a VA: the role, the hours and what you need", "Follow each request: review, finding candidates, interviews", "Review applicants when GoCWGL shares them"],
  },
  agreement: {
    purpose: "Your VA agreement with GoCWGL, kept here so you can check the terms whenever you need to.",
    points: ["The maintenance and training fees", "How billing works and when payments are due", "Confirm you've read it, then come back to check it anytime"],
  },
  vateam: {
    purpose: "Meet the virtual assistants working with your business right now.",
    points: ["See how many VAs are working for you right now", "Open a VA for their profile, tracker and ratings", "Answer rate requests from your VAs"],
  },
  projects: {
    purpose: "Two ways to give work to VAs. Request a task for everyday work your team knows how to do, or a project for one-time work that needs skills they don't have.",
    points: [],
    compare: [
      {
        title: "Task",
        icon: "clipboard",
        tone: "brand",
        tag: "Your current VAs",
        rows: [
          { label: "Who does it", value: "A VA already on your team. You pick the main VA and any backups." },
          { label: "What it's for", value: "Everyday work your VAs know how to do." },
          { label: "How often", value: "Ongoing. Request as many as you need." },
          { label: "Afterwards", value: "Your VA keeps working with you as usual." },
        ],
      },
      {
        title: "Project",
        icon: "briefcase",
        tone: "purple",
        tag: "A new, skilled VA",
        rows: [
          { label: "Who does it", value: "A different VA that GoCWGL assigns for the skills it needs." },
          { label: "What it's for", value: "One-time work your VAs don't know how to complete." },
          { label: "How often", value: "Once, with a due date and a payment GoCWGL quotes." },
          { label: "Afterwards", value: "The VA's work ends. They only become a daily VA if you ask and they agree." },
        ],
      },
    ],
  },
  ratings: {
    purpose: "Tell GoCWGL how each VA is doing. Your ratings help us coach and support them.",
    points: ["Rate each VA on your team", "Add a comment about what's going well or not", "Rate again whenever things change"],
  },
  build: {
    purpose: "Follow along as GoCWGL builds your system.",
    points: ["See each phase of the build and where it is", "Find the to-dos we need from you", "Read the updates your team posts"],
  },
  support: {
    purpose: "Your line to the GoCWGL team for anything about your system or your VAs.",
    points: ["Ask for a change or a new feature", "Report something that's broken", "Message your team and follow each request's status"],
  },
  billing: {
    purpose: "All your invoices in one place: from your VAs and from GoCWGL.",
    points: ["See what's waiting for payment and what's paid", "Open an invoice for the hours and the breakdown", "Find how to pay each one"],
  },
  training: {
    purpose: "Short lessons from GoCWGL on working well with your VA team.",
    points: ["Watch or read each lesson at your own pace", "Track which lessons you've finished", "Come back to any lesson later"],
  },
  sops: {
    purpose: "Step-by-step instructions (SOPs) for your VAs, so work is done the same way every time.",
    points: ["Write your own SOPs and share them with your VAs", "Read GoCWGL's ready-made guides", "Keep them up to date as your process changes"],
  },
  affiliate: {
    purpose: "Earn a bonus for referring other businesses to GoCWGL.",
    points: ["Share your referral ID", "See every business you referred and when they joined", "Track the bonus you earn for each one"],
  },
  account: {
    purpose: "Your own settings for this portal.",
    points: ["Update your profile and photo", "Choose your email alerts", "Change your password, set up 2-step verification, and manage who can see this portal"],
  },
};

/** One page in the portal menu. `view` opens one tab of that page (CRM, Funnels and VA tracker have tabs). */
export type PortalMenuItem = {
  key: string;
  tab: PortalTab;
  label: string;
  icon: IconName;
  view?: "builds" | "packages" | "progress" | CrmAfterLaunchView;
  /** Shown only once the client has an active VA: new clients don't see it yet. */
  needsVa?: boolean;
  /** Stands out in the brand orange (Request CRM, Request Funnel). */
  highlight?: boolean;
};

/** A category in the menu that opens its own second sidebar listing its pages (under headings). */
export type PortalFlyout = {
  key: string;
  label: string;
  icon: IconName;
  /** One line under the panel title. */
  description: string;
  groups: Array<{ title?: string; needsVa?: boolean; items: PortalMenuItem[] }>;
};

export type PortalMenuEntry = PortalMenuItem | PortalFlyout;

export const isPortalFlyout = (e: PortalMenuEntry): e is PortalFlyout => "groups" in e;

const page = (tab: PortalTab, label: string, icon: IconName, extra?: Partial<PortalMenuItem>): PortalMenuItem => ({
  key: tab,
  tab,
  label,
  icon,
  ...extra,
});

/** CRM pages that open once a CRM build is launched: change what's built, or ask for something new. */
export type CrmAfterLaunchView = "revisions" | "features";

/** Build pages (CRM, Funnels) share the same three tabs. */
const buildPages = (tab: "crm" | "funnels", noun: string, request: string, icon: IconName): PortalMenuItem[] => [
  // First and highlighted: where the client asks for a new one (the packages to pick from).
  page(tab, request, "sparkle", { key: `${tab}-packages`, view: "packages", highlight: true }),
  page(tab, `Your ${noun} builds`, icon, { key: `${tab}-builds`, view: "builds" }),
  page(tab, "Build progress", "gauge", { key: `${tab}-progress`, view: "progress" }),
];

/**
 * The client portal menu, the same way as the admin's: CRM, Funnel and VA each open their own second sidebar with
 * their pages, and the main menu shrinks to its icons beside it.
 */
export const PORTAL_MENU: Array<{ title: string; items: PortalMenuEntry[] }> = [
  { title: "Overview", items: [page("dashboard", "Dashboard", "grid")] },
  {
    title: "Services",
    items: [
      {
        key: "crm-menu",
        label: "CRM",
        icon: "users",
        description: "Your CRM builds, packages and progress",
        groups: [
          { items: buildPages("crm", "CRM", "Request CRM", "rocket") },
          {
            title: "After launch",
            items: [
              page("crm", "Revisions", "edit", { key: "crm-revisions", view: "revisions" }),
              page("crm", "New features", "bolt", { key: "crm-features", view: "features" }),
            ],
          },
          { title: "My Account", items: [page("account", "My Profile", "user", { key: "crm-profile" })] },
          {
            title: "My Sessions",
            items: [page("recordings", "My Recordings", "video"), page("appointments", "My Appointments", "calendar")],
          },
          {
            title: "Updates & Resources",
            items: [
              page("announcements", "Updates & Announcements", "bell"),
              page("documents", "My Documents", "folder"),
              page("forms", "My Forms", "form"),
            ],
          },
        ],
      },
      {
        key: "funnel-menu",
        label: "Funnel",
        icon: "funnel",
        description: "Your funnels, packages and progress",
        groups: [{ items: buildPages("funnels", "funnel", "Request Funnel", "funnel") }],
      },
      {
        key: "vas",
        label: "VA",
        icon: "briefcase",
        description: "Your virtual assistant team and their work",
        groups: [
          { title: "Hiring", items: [page("team", "Request VA", "briefcase"), page("agreement", "Agreement", "shield")] },
          {
            title: "Your team",
            needsVa: true,
            items: [page("vateam", "Team", "users"), page("projects", "Tasks & projects", "clipboard"), page("assets", "Assets", "lock")],
          },
          {
            title: "Time & activity",
            needsVa: true,
            items: [
              page("journal", "VA tracker", "journal"),
              page("attendance", "Attendance", "calendarCheck"),
            ],
          },
          { title: "Feedback", needsVa: true, items: [page("ratings", "Ratings", "star")] },
          { title: "Learn", needsVa: true, items: [page("training", "Training", "graduation"), page("sops", "SOPs", "form")] },
        ],
      },
    ],
  },
  { title: "Earn", items: [page("affiliate", "Affiliate", "gift")] },
  {
    title: "Account",
    items: [
      page("support", "Request support", "lifebuoy", { needsVa: true }),
      page("billing", "Invoices", "invoice"),
    ],
  },
];

/** Every page in the menu, with whether it needs an active VA (its own flag or its heading's). */
const PORTAL_MENU_PAGES: Array<{ item: PortalMenuItem; group: string; needsVa: boolean }> = PORTAL_MENU.flatMap((g) =>
  g.items.flatMap((e) =>
    isPortalFlyout(e)
      ? e.groups.flatMap((fg) => fg.items.map((item) => ({ item, group: e.label, needsVa: !!(fg.needsVa || item.needsVa) })))
      : [{ item: e, group: g.title, needsVa: !!e.needsVa }],
  ),
);

/** The menu category a page belongs to ("VAs"), for the page kicker. */
export const PORTAL_GROUP_OF: Partial<Record<PortalTab, string>> = Object.fromEntries(
  // Account is also opened from the profile button, so it keeps its own "My account" kicker.
  PORTAL_MENU_PAGES.filter((p) => p.item.tab !== "account").map((p) => [p.item.tab, p.group]),
);

export const ALERT_OPTIONS = [
  { key: "report", label: "Daily report email", desc: "Your numbers every morning at 7:00 AM" },
  { key: "lead", label: "New lead alerts", desc: "An email the moment someone signs up" },
  { key: "build", label: "Build updates", desc: "When your GoCWGL team posts progress" },
] as const;


export const SOCIAL_NETWORKS: Array<{
  key: SocialKey;
  label: string;
  short: string;
  tone: Tone;
  placeholder: string;
  hosts: string[];
}> = [
  { key: "facebook", label: "Facebook", short: "Fb", tone: "sky", placeholder: "facebook.com/yourpage", hosts: ["facebook.com", "fb.com"] },
  { key: "instagram", label: "Instagram", short: "Ig", tone: "pink", placeholder: "instagram.com/yourhandle", hosts: ["instagram.com"] },
  { key: "tiktok", label: "TikTok", short: "Tt", tone: "ink", placeholder: "tiktok.com/@yourhandle", hosts: ["tiktok.com"] },
  { key: "linkedin", label: "LinkedIn", short: "In", tone: "cyan", placeholder: "linkedin.com/company/yourbusiness", hosts: ["linkedin.com"] },
  { key: "youtube", label: "YouTube", short: "Yt", tone: "red", placeholder: "youtube.com/@yourchannel", hosts: ["youtube.com", "youtu.be"] },
  { key: "x", label: "X (Twitter)", short: "X", tone: "ink", placeholder: "x.com/yourhandle", hosts: ["x.com", "twitter.com"] },
  { key: "google", label: "Google Business Profile", short: "G", tone: "green", placeholder: "g.page/yourbusiness", hosts: ["g.page", "google.com", "maps.app.goo.gl", "goo.gl"] },
];

// ----------------------------------------------------------------- Support
export const REQUEST_TYPES = {
  change: { label: "Change request", titlePh: "e.g. Add testimonials to my landing page", detailsPh: "What would you like changed, and where?" },
  feature: { label: "New feature", titlePh: "e.g. Add a second booking calendar", detailsPh: "Describe what you want and why it would help." },
  bug: { label: "Something is broken", titlePh: "e.g. My form is not sending emails", detailsPh: "What happened? What did you expect? When did it start?" },
  question: { label: "Question", titlePh: "e.g. How do I export my leads?", detailsPh: "Ask anything about your system." },
  feedback: {
    label: "Feedback",
    titlePh: "e.g. The dashboard is easy to follow",
    detailsPh: "What do you like about the portal, what’s confusing, and what would make it better?",
  },
} as const;

export type RequestType = keyof typeof REQUEST_TYPES;

export const BUG_AREAS = ["Landing page", "Forms", "Booking calendar", "Emails & automations", "Payments", "Reports", "Something else"];
/** Request priorities (the API's Priority values) with friendlier labels. */
export const PRIORITIES: Array<{ value: "Low" | "Medium" | "High" | "Critical"; label: string }> = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical — my system is down" },
];

// --------------------------------------------------------- Funnel requests
/** Descriptions for each funnel type. Names, steps and prices come from GET /portal/funnels/catalog. */
export const FUNNEL_TYPE_COPY: Record<FunnelTypeKey, string> = {
  lead: "Free guide or checklist in exchange for an email.",
  booking: "Landing page that gets people to book a call.",
  webinar: "Registration, reminders and replay pages.",
  sales: "Sell a product or package with online payment.",
  membership: "Recurring membership with onboarding.",
  custom: "Something else. Describe it in the details below.",
};

/** What each package includes (gocwgl.com/#pricing); labels and prices come from the catalog. */
export const FUNNEL_PACKAGE_COPY: Record<FunnelPackageKey, { tagline: string; tag?: string; includes: string[] }> = {
  foundation: {
    tagline: "The plumbing on its own.",
    includes: ["Pipeline / CRM setup", "Custom-coded funnel, hosted by us", "Email automation tied to the funnel", "Calendar booking built in"],
  },
  bundle: {
    tagline: "Everything connected, reporting included.",
    includes: [
      "Everything in Foundation Build",
      "Campaign email, social post and Canva graphic prompt templates",
      "AI-powered daily reporting emails",
      "Loyalty rate on future funnels",
    ],
  },
  vip: {
    tagline: "For existing Full Bundle clients.",
    includes: ["An additional custom-coded funnel", "Hosted on the same infrastructure", "Loyalty rate, accounts already in place"],
  },
};

// ------------------------------------------------------------- CRM builds
/** Where "Book a call" sends clients for a CRM build: the CRM discovery call calendar (gets ?package=simple|custom). Invoiced by the team with a Wise payment link. */
export const CRM_BOOKING_URL = "https://app.gocwgl.com/book/gocwgl-crm-discovery-call";

/** The CRM packages clients can request (gocwgl.com/pricing/crm). Simple CRM is no longer offered; older Simple requests keep their label. */
export const OFFERED_CRM_PACKAGES: Array<"growth" | "custom"> = ["growth", "custom"];

/** How a client pays for a CRM build: once, or over 6 or 12 monthly payments. Same as the API's CRM_PACKAGE_PLANS. */
export type CrmPaymentPlanKey = CrmPaymentPlan;
export type CrmPaymentPlanOption = { key: CrmPaymentPlanKey; label: string; payments: number; paymentCents: number };
const CRM_PLANS: Record<"growth" | "custom", CrmPaymentPlanOption[]> = {
  growth: [
    { key: "one_time", label: "One-time payment", payments: 1, paymentCents: 850_000 },
    { key: "12_months", label: "12-month plan", payments: 12, paymentCents: 79_700 },
    { key: "6_months", label: "6-month plan", payments: 6, paymentCents: 152_700 },
  ],
  custom: [
    { key: "one_time", label: "One-time payment", payments: 1, paymentCents: 1_500_000 },
    { key: "12_months", label: "12-month plan", payments: 12, paymentCents: 139_700 },
    { key: "6_months", label: "6-month plan", payments: 6, paymentCents: 269_700 },
  ],
};
/** A package's payment options (Simple CRM was one-time only, at its own price). */
export const crmPlansFor = (pkg: string | undefined): CrmPaymentPlanOption[] =>
  pkg === "growth" || pkg === "custom"
    ? CRM_PLANS[pkg]
    : [{ key: "one_time", label: "One-time payment", payments: 1, paymentCents: CRM_PACKAGES.simple.priceCents }];
export const crmPlanOf = (key: string | undefined, pkg: string | undefined = "custom") => {
  const plans = crmPlansFor(pkg);
  return plans.find((p) => p.key === key) ?? plans[0];
};

type CrmPackageCopy = {
  label: string;
  priceCents: number;
  /** The pricing page's line above the name, e.g. "Business Growth CRM". */
  kind: string;
  tagline: string;
  /** Who it's for. */
  audience: string;
  tag?: string;
  timeline: string;
  includes: string[];
  /** `includes` sorted into headed groups for the package card (everything in `includes`, once). */
  groups?: Array<{ title: string; icon: IconName; items: string[] }>;
  /** Above the groups, e.g. "Everything in Growth, plus:". */
  groupsLead?: string;
  /** What's left out, shown under the groups. */
  limits?: string;
  /** Shown under the list, e.g. what changes cost after launch. */
  note?: string;
};

const GROWTH_GROUPS: NonNullable<CrmPackageCopy["groups"]> = [
  {
    title: "Sales",
    icon: "pipeline",
    items: [
      "A dashboard with your key numbers",
      "Leads with sources, scoring and follow-up reminders",
      "Contacts, companies (basic), sales pipeline and deals",
    ],
  },
  {
    title: "Clients",
    icon: "users",
    items: [
      "Client records and onboarding checklists",
      "Programs & services, appointments & sessions",
      "Client progress (basic): goals and milestones",
      "A simple client portal: session recordings, announcements, shared documents and appointments",
    ],
  },
  {
    title: "Courses & learning",
    icon: "graduation",
    items: ["Course sales pages with descriptions and pricing", "Course inquiry and registration forms"],
  },
  {
    title: "Operations",
    icon: "clipboard",
    items: ["Tasks and a shared calendar", "Forms, landing pages and your website pages", "Documents, stored with the right client"],
  },
  {
    title: "Growth & finance",
    icon: "dollar",
    items: [
      "Basic email campaigns and communication integrations",
      "Standard automation workflows",
      "Products & packages, invoices, payment tracking and standard online payments",
      "Lead, sales, revenue and client reports",
    ],
  },
  {
    title: "Setup & administration",
    icon: "settings",
    items: [
      "Your logo, accent colors and wording",
      "Custom fields, pipeline and dashboard set up for you",
      "Team members and standard roles, with unlimited logins",
      "Selected integrations, workspace settings, and help & support",
      "Team training and 90 days of priority support",
    ],
  },
];

const PREMIUM_GROUPS: NonNullable<CrmPackageCopy["groups"]> = [
  {
    title: "Sales",
    icon: "pipeline",
    items: [
      "Custom CRM modules built for your business",
      "Advanced pipeline, lead and deal management",
      "Richer links between contacts, companies, deals and clients",
    ],
  },
  {
    title: "Clients",
    icon: "users",
    items: [
      "Advanced client lifecycle and custom client records",
      "Custom onboarding workflows",
      "Advanced client progress tracking",
      "An advanced client portal, with courses, lessons, quizzes and certificates",
    ],
  },
  {
    title: "Courses & learning",
    icon: "graduation",
    items: [
      "Course and lesson management",
      "Student accounts, enrollments and course access",
      "Learning progress tracking and course automations",
      "Optional, as scoped: quizzes, assignments, certificates, memberships and subscription courses",
    ],
  },
  {
    title: "Operations",
    icon: "clipboard",
    items: ["Advanced forms and page customization", "Complex document workflows", "Advanced team operations"],
  },
  {
    title: "Growth & finance",
    icon: "dollar",
    items: [
      "Advanced automation builder: multi-step workflows, conditions and branching",
      "Automation monitoring and error handling",
      "Subscriptions, recurring payments and custom invoice processes",
      "Custom dashboards, KPIs, forecasting, and course and team reports",
    ],
  },
  {
    title: "Setup & administration",
    icon: "settings",
    items: [
      "Custom roles, detailed permissions, and security and audit features as scoped",
      "Multiple advanced integrations",
      "Fuller branding, custom data structures and terminology",
      "Your data moved over, as agreed",
      "Dedicated implementation, team training and 90 days of priority support",
    ],
  },
];

const FEATURE_NOTE = "Once your CRM is launched and you and GoCWGL both mark it complete, each new feature starts at $100, depending on how complex it is.";

export const CRM_PACKAGES: Record<CrmPackageKey, CrmPackageCopy> = {
  simple: {
    label: "Simple CRM",
    priceCents: 1_000_000,
    kind: "Simple CRM",
    tagline: "Everything a growing business needs to track leads and close deals.",
    audience: "No longer offered.",
    timeline: "About 8–10 weeks",
    includes: [],
  },
  growth: {
    label: "Growth CRM",
    priceCents: 850_000,
    kind: "Business Growth CRM",
    tagline: "The complete CRM for coaches and consultants: leads, clients, sessions and payments in one place.",
    audience: "For independent business, executive and online coaches, business consultants, and small coaching or consulting firms.",
    timeline: "About 12–15 weeks",
    includes: GROWTH_GROUPS.flatMap((g) => g.items),
    groups: GROWTH_GROUPS,
    limits:
      "Not included: fully custom modules, complex automations, advanced reports, a full course platform with quizzes and certificates, complex integrations, advanced permissions, and large or complex data moves. Those come with Premium, or as a custom quote.",
    note: FEATURE_NOTE,
  },
  custom: {
    label: "Premium CRM",
    priceCents: 1_500_000,
    kind: "Advanced Business CRM",
    tag: "MOST ADVANCED",
    tagline: "Everything in Growth, plus advanced automation, custom modules and a full course platform.",
    audience:
      "For established coaching companies, growing consulting firms, multi-coach organizations, businesses with several teams, and coaches or consultants selling online courses or memberships.",
    timeline: "About 12–15 weeks",
    includes: PREMIUM_GROUPS.flatMap((g) => g.items),
    groups: PREMIUM_GROUPS,
    groupsLead: "Everything in Growth, plus:",
    limits:
      "Premium is a starting point for advanced work, not unlimited development: how many modules, integrations, automations and courses, and the size of your data move, are set in your blueprint and quote.",
    note: FEATURE_NOTE,
  },
};

/**
 * "What is a custom CRM?": the highlighted explainer at the very top of Get a CRM. Each row sets a subscription CRM
 * (HubSpot, GoHighLevel, Zoho and the like) against a custom CRM GoCWGL builds for the client.
 */
export const CRM_EXPLAINER = {
  kicker: "Custom CRM, explained",
  title: "What is a custom CRM?",
  /** Written for any reader, including someone who has never used business software: short sentences, no jargon. */
  definition: [
    {
      key: "what",
      icon: "journal",
      title: "What it is",
      text: "Think of a CRM as your business’s address book, diary and filing cabinet, all kept together on the computer. It remembers every customer, every phone call, every appointment and every sale, so nothing slips through the cracks.",
    },
    {
      key: "rent",
      icon: "receipt",
      title: "Renting one",
      text: "Most businesses rent theirs, like renting a house. They pay every month, the rent keeps going up, and they pay extra for each person who uses it. If they stop paying, they lose it.",
    },
    {
      key: "own",
      icon: "building",
      title: "Owning a custom one",
      text: "A custom CRM is like having a house built just for you, then owning it. We make it to fit the way your business already works. You pay for it once, as many of your staff can use it as you like, and it’s yours to keep.",
    },
  ],
  rows: [
    { key: "cost", icon: "dollar", topic: "What you pay", rented: "A bill every month that never ends, and it keeps going up", own: "You pay once to have it built. No monthly bill" },
    { key: "seats", icon: "users", topic: "Your staff", rented: "You pay extra, every month, for each person who uses it", own: "Everyone on your team can use it at no extra cost" },
    { key: "fit", icon: "pipeline", topic: "How it works", rented: "Made for everyone, so you have to work their way", own: "Made for you, so it works the way you already do" },
    { key: "features", icon: "lock", topic: "What it can do", rented: "The useful parts often cost more to unlock", own: "Has what you need, without extras you’ll never use" },
    { key: "data", icon: "shield", topic: "Your records", rented: "Kept by another company, under their rules", own: "Yours to keep. No one can take them away" },
    { key: "tools", icon: "grid", topic: "Everything in one place", rented: "Often needs several other programs to do the job", own: "Bookings, emails, invoices and more, all in one place" },
  ],
} as const;

/** "Why own your CRM": the reasons shown above the packages, to show clients what owning one is worth. */
export const CRM_WHY_OWN = [
  {
    key: "own",
    icon: "shield",
    title: "It’s yours, not rented",
    desc: "A rented CRM is a bill that never ends. Yours is an asset: nobody can raise your price, lock a feature behind a higher plan or close your account.",
  },
  {
    key: "fit",
    icon: "pipeline",
    title: "Built around how you sell",
    desc: "Your stages, fields, automations and your own words, like “Coaching Sessions” or “Consultations”. Menus you don’t need stay hidden.",
  },
  {
    key: "seats",
    icon: "users",
    title: "No per-seat fees",
    desc: "Rented CRMs charge for every login, every month. Yours has unlimited logins, so hiring doesn’t make your software bill grow.",
  },
  {
    key: "connected",
    icon: "bolt",
    title: "One place for everything",
    desc: "Leads, clients, sessions, courses, emails and invoices in one system, instead of five tools held together with workarounds.",
  },
] as const;

/**
 * Rented CRMs the cost comparison uses (`logo`: the brand logo beside it, from Simple Icons; without one, the `mark`
 * initials in `color`), at their published list prices (checked November 2026; update them when they
 * change). Each costs: setup + (flat monthly + per-login monthly × logins) × months.
 */
export const CRM_RENTED_OPTIONS = [
  {
    key: "hubspot-pro",
    logo: "hubspot",
    mark: "HS",
    color: "#ff7a59",
    name: "HubSpot",
    plan: "Sales Hub Professional",
    perSeatMonthlyCents: 9_000,
    flatMonthlyCents: 0,
    setupCents: 150_000,
    pricing: "$90 per login a month (yearly plan), plus a $1,500 onboarding fee",
  },
  {
    key: "hubspot-enterprise",
    logo: "hubspot",
    mark: "HS",
    color: "#ff7a59",
    name: "HubSpot",
    plan: "Sales Hub Enterprise",
    perSeatMonthlyCents: 15_000,
    flatMonthlyCents: 0,
    setupCents: 350_000,
    pricing: "$150 per login a month (yearly plan), plus a $3,500 onboarding fee",
  },
  {
    key: "ghl-unlimited",
    logo: "gohighlevel",
    mark: "HL",
    color: "#2563eb",
    name: "GoHighLevel",
    plan: "Unlimited",
    perSeatMonthlyCents: 0,
    flatMonthlyCents: 29_700,
    setupCents: 0,
    pricing: "$297 a month, plus phone, SMS, email and AI usage billed on top",
  },
  {
    key: "zoho-enterprise",
    logo: "zoho",
    mark: "Z",
    color: "#e42527",
    name: "Zoho CRM",
    plan: "Enterprise",
    perSeatMonthlyCents: 4_000,
    flatMonthlyCents: 0,
    setupCents: 0,
    pricing: "$40 per login a month (yearly plan), with paid onboarding extra",
  },
] as const;

/** The comparison's slider and period choices. */
export const CRM_COMPARISON = {
  defaultSeats: 10,
  maxSeats: 50,
  periods: [5, 7, 10] as const,
};

/**
 * The yearly Care plan after launch: keeps the CRM secure and up to date, with unlimited revisions to what's built.
 * Free for the first `freeYears` after launch, then `priceCents` a year. New features are quoted separately
 * (`CRM_FEATURE_FROM_CENTS`).
 */
export const CRM_CARE_PLAN = {
  priceCents: 80_000,
  freeYears: 1,
  includes: [
    "Security updates, backups and monitoring",
    "Code, libraries and hosting kept up to date",
    "Unlimited revisions to what’s already built",
  ],
};

/** New features (new menus, records, integrations, reports) start at this once the CRM is complete. */
export const CRM_FEATURE_FROM_CENTS = 10_000;

/** What a CRM build's price pays for (both packages). */
export const CRM_PRICE_BREAKDOWN = [
  "Discovery call and a blueprint of every screen and automation",
  "12–15 weeks of design, building and testing by our team",
  "Your data imported, and your branding on your own domain",
  "Team training and 90 days of priority support after launch",
];

export const CRM_STEPS = [
  { title: "Request your CRM", desc: "Pick Growth or Premium, tell us what you need, choose how to pay and book your discovery call." },
  { title: "Approve the blueprint", desc: "You get a plan of every screen and automation, and the final quote. Nothing is billed until you approve it." },
  { title: "We build it", desc: "12–15 weeks of design, building and testing, with weekly updates in Build progress." },
  { title: "Train and go live", desc: "We move your data in, train your team and launch together." },
];

export const CRM_FAQ = [
  {
    q: "What’s the difference between Growth and Premium?",
    a: "Both share the same design, menu, unlimited logins, branding and training. Premium adds custom modules, advanced automation, a full course platform, an advanced client portal, subscriptions, custom reports and roles, more integrations, and your data moved over.",
  },
  {
    q: "Can I sell online courses?",
    a: "Growth has course sales pages and inquiry and registration forms. Premium adds the full course platform: lessons, student accounts and progress, with quizzes, assignments, certificates and memberships as scoped.",
  },
  { q: "Can I use my own words and hide menus I don’t need?", a: "Yes. Your CRM uses your terms, and menus you don’t use stay hidden." },
  { q: "Do I own my CRM and my data?", a: "Yes. Everything we build and every record in it is yours, on your domain with your branding, and you can export your data at any time." },
  {
    q: "Are there monthly fees?",
    a: "No subscription or per-login fees. The build is one price, paid at once or over 6 or 12 monthly payments that end with the plan. Your first year after launch is free: security updates, keeping your code up to date, and unlimited revisions. After that, the Care plan is $800 a year.",
  },
  {
    q: "What’s the difference between a revision and a new feature?",
    a: "A revision changes something already in your CRM: wording, fields, layout, pipeline stages, an automation’s timing. A new feature adds something it doesn’t do yet: a new menu, record type, integration or report. Revisions are unlimited with the Care plan; new features are quoted.",
  },
  {
    q: "Can you move my data from my current CRM?",
    a: "Yes, from GoHighLevel, HubSpot, Zoho or something else. Large or complex moves are part of Premium, or quoted separately with Growth.",
  },
  { q: "Will it work with my existing website?", a: "Yes. You get embed codes for your booking calendars and forms, and every submission becomes a contact in your CRM." },
  {
    q: "Can I add features after my CRM is built?",
    a: "Yes. Once your CRM is launched and you and GoCWGL both mark it complete, each new feature starts at $100, depending on how complex it is. Request it from New features in the CRM menu and we quote it before any work starts.",
  },
  {
    q: "How do I pay?",
    a: "You choose when you request. Growth: $8,500 at once, $797 a month for 12 months ($9,564 in total) or $1,527 a month for 6 months ($9,162 in total). Premium: $15,000 at once, $1,397 a month for 12 months ($16,764 in total) or $2,697 a month for 6 months ($16,182 in total). Nothing is billed until you approve the quote; on a monthly plan you get one invoice per payment, in Invoices.",
  },
];


/**
 * Pages a client only gets once they have an active VA. Tasks & projects, under "Your team", can show before: its
 * Projects tab follows project requests (the page decides with useWorkTabs).
 */
export const VA_ONLY_TABS = new Set<PortalTab>(PORTAL_MENU_PAGES.filter((p) => p.needsVa && p.item.tab !== "projects").map((p) => p.item.tab));

/** Pages switched off for now: not in the menu, and links to them open the dashboard. */
export const HIDDEN_PORTAL_TABS = new Set<PortalTab>([]);
