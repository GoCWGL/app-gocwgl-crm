import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Client portal copy and options (pure UI constants). Everything the client or
// the server creates (to-dos, funnels, invoices, reports…) comes from the API.
// =============================================================================

// ------------------------------------------------------------------ Types
export type PortalTab =
  | "overview"
  | "funnels"
  | "reports"
  | "health"
  | "build"
  | "assets"
  | "support"
  | "billing"
  | "account";

export type FunnelStatus = "live" | "build" | "pay" | "queued" | "quote";
export type FunnelTypeKey = "lead" | "booking" | "webinar" | "sales" | "membership" | "custom";
export type FunnelAddonKey = "emails" | "upsell" | "ab";

/** What the client fills in when requesting a funnel (the API's FunnelRequestIn, minus the name). */
export type FunnelRequestDetails = {
  typeKey: FunnelTypeKey;
  offer: string;
  audience: string;
  notes: string;
  addons: FunnelAddonKey[];
  speed: "standard" | "rush";
};

export type SocialKey = "facebook" | "instagram" | "tiktok" | "linkedin" | "youtube" | "x" | "google";
export type CustomLink = { id: string; label: string; url: string; touched: boolean };

export type AssetCategory = "logos" | "photos" | "videos" | "docs" | "other";

export type RangeKey = "7" | "30" | "90";

// ------------------------------------------------------------- Navigation
export const PORTAL_PAGES: Record<PortalTab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "How your system and your business are doing." },
  funnels: { title: "Funnels", subtitle: "The funnels built for you, how they perform, and requests for new ones." },
  reports: { title: "Daily reports", subtitle: "Your numbers each day, with what they mean." },
  health: { title: "System health", subtitle: "Every part of your system, checked around the clock." },
  build: { title: "Build progress", subtitle: "Follow along as we build your system." },
  assets: { title: "Assets", subtitle: "Upload your logos, photos and brand files for your GoCWGL team." },
  support: { title: "Support", subtitle: "Ask for changes, report a problem, or message your team." },
  billing: { title: "Billing", subtitle: "Your plan, payments and invoices." },
  account: { title: "Account", subtitle: "Your profile, alerts and who can see this portal." },
};

export const PORTAL_NAV: Array<{ group: string; items: Array<{ tab: PortalTab; label: string; icon: IconName; tone: Tone }> }> = [
  {
    group: "My system",
    items: [
      { tab: "overview", label: "Overview", icon: "grid", tone: "cyan" },
      { tab: "funnels", label: "Funnels", icon: "funnel", tone: "brand" },
      { tab: "reports", label: "Daily reports", icon: "chart", tone: "teal" },
      { tab: "health", label: "System health", icon: "pulse", tone: "green" },
    ],
  },
  {
    group: "Working with GoCWGL",
    items: [
      { tab: "build", label: "Build progress", icon: "rocket", tone: "brand" },
      { tab: "assets", label: "Assets", icon: "folderUpload", tone: "indigo" },
      { tab: "support", label: "Support", icon: "message", tone: "sky" },
      { tab: "billing", label: "Billing", icon: "card", tone: "pink" },
    ],
  },
];

export const ALERT_OPTIONS = [
  { key: "report", label: "Daily report email", desc: "Your numbers every morning at 7:00 AM" },
  { key: "lead", label: "New lead alerts", desc: "An email the moment someone signs up" },
  { key: "health", label: "System health alerts", desc: "If anything in your system needs attention" },
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

// ----------------------------------------------------------------- Reports
export const SOURCE_COLORS: Record<string, string> = {
  "Instagram ad": "#7C3AED",
  "Landing page": "#0891B2",
  Referral: "#10B981",
  "Google search": "#F59E0B",
};

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
  custom: "Tell us what you need and we will send a quote.",
};

/** Descriptions for each add-on; labels and prices come from the catalog. */
export const FUNNEL_ADDON_COPY: Record<FunnelAddonKey, string> = {
  emails: "5 emails that nurture people who do not buy right away",
  upsell: "Offer an extra right after checkout",
  ab: "A second version of the page to see which converts better",
};
