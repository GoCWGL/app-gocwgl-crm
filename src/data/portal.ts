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
  | "live"
  | "journal"
  | "team"
  | "vateam"
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
export const PORTAL_TAB_ALIASES: Record<string, PortalTab> = { va: "team", invoices: "billing", overview: "dashboard", feedback: "ratings" };

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
  live: { title: "Live work", subtitle: "Who on your VA team is working for you right now, and on what." },
  journal: { title: "VA tracker", subtitle: "Everything your VAs logged for your business, day by day." },
  team: { title: "Request VA", subtitle: "Ask GoCWGL for a VA, and follow each request until you're matched." },
  vateam: { title: "VA Team", subtitle: "The virtual assistants working with your business right now." },
  projects: { title: "Tasks", subtitle: "Request a task, pick the VA for it, and follow its status." },
  ratings: { title: "VA ratings", subtitle: "Rate each VA on your team. Ratings go to GoCWGL and help us support them." },
  build: { title: "Build progress", subtitle: "Follow along as we build your system." },
  support: { title: "Request support", subtitle: "Ask for changes, report a problem, or message your team." },
  billing: { title: "Invoices", subtitle: "Invoices from your VAs and from GoCWGL." },
  training: { title: "Training", subtitle: "Short lessons from GoCWGL on getting the most from your VA team." },
  sops: { title: "SOPs", subtitle: "Step-by-step guides from GoCWGL." },
  affiliate: { title: "Affiliate", subtitle: "Your referral ID, the businesses you referred, and your bonuses." },
  account: { title: "Account", subtitle: "Your profile, alerts and who can see this portal." },
};

/** One page in the portal menu. `view` opens one tab of that page (CRM, Funnels and VA tracker have tabs). */
export type PortalMenuItem = {
  key: string;
  tab: PortalTab;
  label: string;
  icon: IconName;
  view?: "builds" | "packages" | "progress" | "tracker" | "live";
  /** Shown only once the client has an active VA: new clients don't see it yet. */
  needsVa?: boolean;
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

/** Build pages (CRM, Funnels) share the same three tabs. */
const buildPages = (tab: "crm" | "funnels", noun: string, icon: IconName): PortalMenuItem[] => [
  page(tab, `Your ${noun} builds`, icon, { key: `${tab}-builds`, view: "builds" }),
  page(tab, `Get a ${noun}`, "sparkle", { key: `${tab}-packages`, view: "packages" }),
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
        groups: [{ items: buildPages("crm", "CRM", "rocket") }],
      },
      {
        key: "funnel-menu",
        label: "Funnel",
        icon: "funnel",
        description: "Your funnels, packages and progress",
        groups: [{ items: buildPages("funnels", "funnel", "funnel") }],
      },
      {
        key: "vas",
        label: "VA",
        icon: "briefcase",
        description: "Your virtual assistant team and their work",
        groups: [
          { title: "Hiring", items: [page("team", "Request VA", "briefcase")] },
          {
            title: "Your team",
            needsVa: true,
            items: [page("vateam", "VA Team", "users"), page("projects", "Tasks", "clipboard"), page("ratings", "VA ratings", "star")],
          },
          {
            title: "Time & activity",
            needsVa: true,
            items: [
              page("journal", "VA tracker", "journal", { view: "tracker" }),
              page("journal", "Live work", "pulse", { key: "live", view: "live" }),
            ],
          },
          { title: "Learn", needsVa: true, items: [page("training", "Training", "graduation"), page("sops", "SOPs", "form")] },
        ],
      },
    ],
  },
  {
    title: "Account",
    items: [
      page("support", "Request support", "lifebuoy", { needsVa: true }),
      page("billing", "Invoices", "invoice"),
      page("affiliate", "Affiliate", "gift"),
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

export const CRM_PACKAGES: Record<
  CrmPackageKey,
  {
    label: string;
    priceCents: number;
    tagline: string;
    tag?: string;
    timeline: string;
    includes: string[];
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
    note: "After launch, new features or menus start at $500 each, depending on how complex they are.",
  },
};

/** Optional extras, quoted per project. */
export const CRM_ADDONS = [
  { key: "migration", label: "Data migration", desc: "We move contacts, deals and history from your current CRM or spreadsheets." },
  { key: "sms", label: "SMS and WhatsApp", desc: "Two-way texting with leads and clients, right from a contact." },
  { key: "care", label: "Care plan", desc: "Hosting, backups, monitoring and small changes every month." },
  { key: "training", label: "Extra team training", desc: "More sessions and written guides for new hires." },
] as const;

export const CRM_STEPS = [
  { title: "Discovery call", desc: "We learn how you find, sell to and serve your clients." },
  { title: "Blueprint", desc: "You get a plan of every screen and automation, and the final quote, to approve." },
  { title: "Build", desc: "We build it and post weekly updates in Build progress." },
  { title: "Training and launch", desc: "We move your data in, train your team and go live together." },
];

export const CRM_FAQ = [
  { q: "Do I own my CRM and my data?", a: "Yes. Everything we build and every record in it is yours, and you can export your data at any time." },
  { q: "Are there monthly fees?", a: "The build is a one-time price. Hosting and ongoing changes can be covered by an optional care plan." },
  { q: "Can you move my data from my current CRM?", a: "Yes. We import your spreadsheets and move your data over from your current CRM." },
  { q: "Not sure it’s the right fit?", a: "Book a call. We go through what you need on the call, before you pay anything." },
  {
    q: "Can I add features after my CRM is built?",
    a: "Yes. Once your Custom CRM is live, each new feature or menu starts at $500, depending on how complex it is. We quote it before any work starts.",
  },
  { q: "How do I pay?", a: "After the call we send you an invoice for the agreed package. It shows up in Invoices." },
];


/** Pages a client only gets once they have an active VA. */
export const VA_ONLY_TABS = new Set<PortalTab>(PORTAL_MENU_PAGES.filter((p) => p.needsVa).map((p) => p.item.tab));

/** Pages switched off for now: not in the menu, and links to them open the dashboard. */
export const HIDDEN_PORTAL_TABS = new Set<PortalTab>(["affiliate"]);
