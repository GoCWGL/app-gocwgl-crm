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
  | "vaprojects"
  | "projects"
  | "ratings"
  | "build"
  | "support"
  | "billing"
  | "training"
  | "sops"
  | "affiliate"
  | "account";

/** Old ?tab= links that point at a page with a new name. */
export const PORTAL_TAB_ALIASES: Record<string, PortalTab> = { va: "team", invoices: "billing", overview: "dashboard", feedback: "ratings", live: "attendance" };

export type FunnelStatus = "live" | "build" | "pay" | "queued" | "quote";
export type FunnelTypeKey = "lead" | "booking" | "webinar" | "sales" | "membership" | "custom";
export type FunnelPackageKey = "foundation" | "bundle" | "vip";
export type CrmPackageKey = "simple" | "custom";

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
  vaprojects: { title: "Projects", subtitle: "Your open projects: requested, in progress with a VA, and completed." },
  projects: { title: "Tasks", subtitle: "Request a task, pick the main VA and any backups, and follow its status." },
  ratings: { title: "Ratings", subtitle: "Rate each VA on your team. Ratings go to GoCWGL and help us support them." },
  build: { title: "Build progress", subtitle: "Follow along as we build your system." },
  support: { title: "Request support", subtitle: "Ask for changes, report a problem, or message your team." },
  billing: { title: "Invoices", subtitle: "Invoices from your VAs and from GoCWGL." },
  training: { title: "Training", subtitle: "Short lessons from GoCWGL on getting the most from your VA team." },
  sops: { title: "SOPs", subtitle: "Your own SOPs for your VAs, and step-by-step guides from GoCWGL." },
  affiliate: { title: "Affiliate", subtitle: "Everyone you referred to GoCWGL, and the bonus for each." },
  account: { title: "Account", subtitle: "Your profile, alerts, password & 2-step verification, and who can see this portal." },
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
            items: [page("vateam", "Team", "users"), page("vaprojects", "Projects", "folder"), page("projects", "Tasks", "clipboard"), page("assets", "Assets", "lock")],
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
  PORTAL_MENU_PAGES.map((p) => [p.item.tab, p.group]),
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

/** The CRM packages clients can request (Simple CRM is no longer offered; older Simple requests keep their label). */
export const OFFERED_CRM_PACKAGES: CrmPackageKey[] = ["custom"];

/**
 * How a client pays for a Custom CRM: once, or the "Custom package option" (a set monthly payment). Same as the API's
 * CRM_PLAN_PAYMENTS.
 */
export type CrmPaymentPlanKey = CrmPaymentPlan;
export const CRM_PAYMENT_PLANS: Array<{ key: CrmPaymentPlanKey; label: string; payments: number; paymentCents: number }> = [
  { key: "one_time", label: "One-time payment", payments: 1, paymentCents: 1_500_000 },
  { key: "12_months", label: "12-month plan", payments: 12, paymentCents: 139_700 },
  { key: "6_months", label: "6-month plan", payments: 6, paymentCents: 269_700 },
];
export const crmPlanOf = (key: string | undefined) => CRM_PAYMENT_PLANS.find((p) => p.key === key) ?? CRM_PAYMENT_PLANS[0];

export const CRM_PACKAGES: Record<
  CrmPackageKey,
  {
    label: string;
    priceCents: number;
    tagline: string;
    tag?: string;
    timeline: string;
    includes: string[];
    /** `includes` sorted into a few headed groups for the package card (everything in `includes`, once). */
    groups?: Array<{ title: string; icon: IconName; items: string[] }>;
    /** Shown under the list, e.g. what changes cost after launch. */
    note?: string;
  }
> = {
  simple: {
    label: "Simple CRM",
    priceCents: 1_000_000,
    tagline: "Everything a growing business needs to track leads and close deals.",
    timeline: "About 8–10 weeks",
    includes: [
      "Contacts and companies, with tags and notes",
      "Sales pipelines with drag-and-drop stages",
      "Automations: follow-ups, reminders and task assignment",
      "Email: templates, one-off emails and campaigns",
      "Calendar with online booking",
      "Forms that drop leads straight into your CRM",
      "Surveys and feedback forms",
      "Dashboard with your key numbers",
      "Import your contacts from a spreadsheet",
      "Up to 5 team logins",
      "Training session and 30 days of support after launch",
    ],
  },
  custom: {
    label: "Custom CRM",
    priceCents: 1_500_000,
    tag: "MOST COMPLETE",
    tagline: "Built around exactly how your business runs, with room to grow.",
    timeline: "About 12–15 weeks",
    includes: [
      "Contacts, companies and sales pipelines, with tags and notes",
      "Automations, email campaigns, calendar booking and forms",
      "Custom records for your business (jobs, properties, cases, orders…)",
      "Invoicing and online payments",
      "A client portal for your own customers",
      "Roles and permissions, with unlimited team logins",
      "Integrations with the tools you already use (accounting, Zapier, webhooks, API)",
      "SMS reminders and call logging",
      "AI helpers: lead scoring, email drafts and call summaries",
      "Custom reports and dashboards",
      "Data moved over from your current CRM",
      "Your branding, on your own domain",
      "Team training and 90 days of priority support",
    ],
    groups: [
      {
        title: "Sales and contacts",
        icon: "users",
        items: [
          "Contacts, companies and sales pipelines, with tags and notes",
          "Custom records for your business (jobs, properties, cases, orders…)",
          "Custom reports and dashboards",
        ],
      },
      {
        title: "Automation and messaging",
        icon: "bolt",
        items: [
          "Automations, email campaigns, calendar booking and forms",
          "SMS reminders and call logging",
          "AI helpers: lead scoring, email drafts and call summaries",
        ],
      },
      {
        title: "Payments and portals",
        icon: "card",
        items: [
          "Invoicing and online payments",
          "A client portal for your own customers",
          "Roles and permissions, with unlimited team logins",
        ],
      },
      {
        title: "Setup and launch",
        icon: "rocket",
        items: [
          "Integrations with the tools you already use (accounting, Zapier, webhooks, API)",
          "Data moved over from your current CRM",
          "Your branding, on your own domain",
          "Team training and 90 days of priority support",
        ],
      },
    ],
    note: "Once your CRM is launched and you and GoCWGL both mark it complete, each new feature starts at $100, depending on how complex it is.",
  },
};

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
    desc: "No bending your process to fit generic software. Your stages, your records, your automations, set up the way your team already works.",
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
    desc: "Funnels, bookings, emails, invoices and your client portal in one system, instead of five tools held together with workarounds.",
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
  priceCents: 50_000,
  freeYears: 1,
  includes: [
    "Security updates, backups and monitoring",
    "Code, libraries and hosting kept up to date",
    "Unlimited revisions to what’s already built",
  ],
};

/** New features (new menus, records, integrations, reports) start at this once the CRM is complete. */
export const CRM_FEATURE_FROM_CENTS = 10_000;

/** What the Custom CRM price pays for, shown under "Why it costs what it does". */
export const CRM_PRICE_BREAKDOWN = [
  "Discovery call and a blueprint of every screen and automation",
  "12–15 weeks of design, building and testing by our team",
  "Your data moved over, and your branding on your own domain",
  "Team training and 90 days of priority support after launch",
];

export const CRM_STEPS = [
  { title: "Discovery call", desc: "We learn how you find, sell to and serve your clients." },
  { title: "Blueprint", desc: "You get a plan of every screen and automation, and the final quote, to approve." },
  { title: "Build", desc: "We build it and post weekly updates in Build progress." },
  { title: "Training and launch", desc: "We move your data in, train your team and go live together." },
];

export const CRM_FAQ = [
  { q: "Do I own my CRM and my data?", a: "Yes. Everything we build and every record in it is yours, and you can export your data at any time." },
  {
    q: "Are there monthly fees?",
    a: "No monthly or per-login fees. The build is one price, paid at once or spread over 6 or 12 monthly payments. Your first year after launch is free: security updates, keeping your code up to date, and unlimited revisions. After that, the Care plan is $500 a year.",
  },
  {
    q: "What’s the difference between a revision and a new feature?",
    a: "A revision changes something already in your CRM: wording, fields, layout, pipeline stages, an automation’s timing. A new feature adds something it doesn’t do yet: a new menu, record type, integration or report. Revisions are unlimited with the Care plan; new features are quoted.",
  },
  { q: "Can you move my data from my current CRM?", a: "Yes. We import your spreadsheets and move your data over from your current CRM." },
  { q: "Not sure it’s the right fit?", a: "Book a call. We go through what you need on the call, before you pay anything." },
  {
    q: "Can I add features after my CRM is built?",
    a: "Yes. Once your CRM is launched and you and GoCWGL both mark it complete, each new feature starts at $100, depending on how complex it is. Request it from New features in the CRM menu and we quote it before any work starts.",
  },
  {
    q: "How do I pay?",
    a: "You choose when you request: one payment of $15,000, or the custom package option, either $1,397 a month for 12 months ($16,764 in total) or $2,697 a month for 6 months ($16,182 in total). After the call we send your invoice; on a monthly plan you get one invoice per payment. They show up in Invoices.",
  },
];


/** Pages a client only gets once they have an active VA (Projects, under "Your team", shows before: project requests). */
export const VA_ONLY_TABS = new Set<PortalTab>(PORTAL_MENU_PAGES.filter((p) => p.needsVa && p.item.tab !== "vaprojects").map((p) => p.item.tab));

/** Pages switched off for now: not in the menu, and links to them open the dashboard. */
export const HIDDEN_PORTAL_TABS = new Set<PortalTab>([]);
