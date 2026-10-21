import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Client portal copy and options (pure UI constants). Everything the client or
// the server creates (to-dos, funnels, invoices, reports…) comes from the API.
// =============================================================================

// ------------------------------------------------------------------ Types
export type PortalTab =
  | "funnels"
  | "crm"
  | "build"
  | "assets"
  | "support"
  | "billing"
  | "account";

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

export type AssetCategory = "logos" | "photos" | "videos" | "docs" | "other";

// ------------------------------------------------------------- Navigation
export const PORTAL_PAGES: Record<PortalTab, { title: string; subtitle: string }> = {
  funnels: { title: "Funnels", subtitle: "The funnels built for you, how they perform, and requests for new ones." },
  crm: { title: "CRM", subtitle: "Have GoCWGL build a CRM around how your business sells." },
  build: { title: "Build progress", subtitle: "Follow along as we build your system." },
  assets: { title: "Assets", subtitle: "Upload your logos, photos and brand files for your GoCWGL team." },
  support: { title: "Support", subtitle: "Ask for changes, report a problem, or message your team." },
  billing: { title: "Transaction history", subtitle: "Your invoices and payments to GoCWGL." },
  account: { title: "Account", subtitle: "Your profile, alerts and who can see this portal." },
};

export const PORTAL_NAV: Array<{ group: string; items: Array<{ tab: PortalTab; label: string; icon: IconName; tone: Tone }> }> = [
  {
    group: "My system",
    items: [
      { tab: "funnels", label: "Funnels", icon: "funnel", tone: "brand" },
      { tab: "crm", label: "CRM", icon: "users", tone: "purple" },
    ],
  },
  {
    group: "Working with GoCWGL",
    items: [
      { tab: "build", label: "Build progress", icon: "rocket", tone: "brand" },
      { tab: "assets", label: "Assets", icon: "folderUpload", tone: "indigo" },
      { tab: "support", label: "Support", icon: "message", tone: "sky" },
      { tab: "billing", label: "Transactions", icon: "invoice", tone: "pink" },
    ],
  },
];

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

export const ASSET_CATEGORIES: Array<{ value: AssetCategory; label: string }> = [
  { value: "logos", label: "Logos" },
  { value: "photos", label: "Photos" },
  { value: "videos", label: "Videos" },
  { value: "docs", label: "Documents" },
  { value: "other", label: "Other" },
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
/** CRM requests go to the team as support requests whose title starts with this. */
export const CRM_REQUEST_PREFIX = "CRM build request";

export const CRM_PACKAGES: Record<
  CrmPackageKey,
  { label: string; priceCents: number; tagline: string; tag?: string; timeline: string; includes: string[] }
> = {
  simple: {
    label: "Simple CRM",
    priceCents: 1_000_000,
    tagline: "Everything a growing business needs to track leads and close deals.",
    timeline: "About 6–8 weeks",
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
    timeline: "About 10–14 weeks",
    includes: [
      "Everything in Simple CRM",
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
  { q: "Can you move my data from my current CRM?", a: "Yes. Spreadsheet imports are included in both packages, and the Custom CRM also moves data over from your current CRM." },
  { q: "Not sure which package fits?", a: "Request either one. We confirm the right package on the discovery call before you pay anything." },
];

export const CRM_TEAM_SIZES = ["Just me", "2–5 people", "6–20 people", "More than 20"];
