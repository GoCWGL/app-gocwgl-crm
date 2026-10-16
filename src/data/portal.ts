import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Client portal sample data (Rahman Wellness). Everything lives in memory;
// swap these for API calls when a backend exists.
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

export type TodoDoc = { name: string; ext: string; meta: string; preview?: "copy" | "mock" };
export type Comment = { from: string; when: string; text: string };

export type Todo = {
  id: number;
  kind: "approval" | "task" | "upload";
  title: string;
  desc: string;
  action: string;
  done: boolean;
  changesRequested: boolean;
  phase: string;
  from: string;
  sent: string;
  details: string;
  steps?: string[];
  docs: TodoDoc[];
  comments: Comment[];
};

export type BuildPhase = { name: string; tasks: Array<{ text: string; done: boolean }> };
export type Update = { who: string; date: string; text: string };

export type Invoice = { no: string; desc: string; amount: number; due: string; status: "Open" | "Paid" };

export type TicketStatus = "New" | "In progress" | "Answered" | "Done";
export type Ticket = { code: string; type: string; title: string; date: string; priority: string; status: TicketStatus };

export type ChatMessage = { mine: boolean; who: string; when: string; text: string };

export type Profile = { name: string; email: string; phone: string; business: string; website: string };

export type FunnelStatus = "live" | "build" | "pay" | "queued" | "quote";
export type Funnel = {
  id: number;
  name: string;
  type: string;
  goal: string;
  status: FunnelStatus;
  url: string;
  visits?: number;
  revenue?: number;
  pct?: number;
  price?: number;
  invoice?: string;
  note?: string;
  links?: Array<{ label: string; url: string }>;
  /** [step name, people who reached it] */
  steps: Array<[string, number]>;
};

export type SocialKey = "facebook" | "instagram" | "tiktok" | "linkedin" | "youtube" | "x" | "google";
export type CustomLink = { id: number; label: string; url: string; touched: boolean };

export type AssetCategory = "logos" | "photos" | "videos" | "docs" | "other";
export type Asset = {
  id: number;
  name: string;
  cat: AssetCategory;
  size: number;
  date: string;
  url: string;
  isImage?: boolean;
};

export type DailyReport = {
  day: number;
  dow: "WED" | "TUE" | "MON" | "SUN" | "SAT";
  leads: number;
  calls: number;
  show: number;
  clients: number;
  rev: number;
  spend: number;
  sources: Array<[string, number]>;
  notes: string[];
};

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

// ----------------------------------------------------------------- Seeds
export const INITIAL_TODOS: Todo[] = [
  {
    id: 1,
    kind: "approval",
    title: "Approve your landing page copy",
    desc: "Read the draft and tell us if anything should change.",
    action: "Approve copy",
    done: false,
    changesRequested: false,
    phase: "Funnel & landing page",
    from: "GoCWGL team",
    sent: "Oct 13",
    details:
      "Here is version 2 of your landing page copy and the matching design mockup. Please check the headline, the offer and the class list.\n\nIf it all looks right, approve it and we will connect your signup form next. If not, tell us what to change.",
    docs: [
      { name: "Landing page copy – v2.docx", ext: "DOC", meta: "Word document · 18 KB · updated Oct 13", preview: "copy" },
      { name: "Landing page mockup.png", ext: "PNG", meta: "Image · 1.2 MB · desktop and mobile", preview: "mock" },
    ],
    comments: [{ from: "GoCWGL team", when: "Oct 13", text: "Version 2 uses the “free first week” offer you mentioned on our call." }],
  },
  {
    id: 2,
    kind: "task",
    title: "Connect your Stripe account",
    desc: "Needed so new clients can pay you on the booking page.",
    action: "Mark as connected",
    done: false,
    changesRequested: false,
    phase: "Pipeline & CRM setup",
    from: "GoCWGL team",
    sent: "Oct 12",
    details: "Stripe is how your clients will pay you. Your money goes straight to your own bank account. It takes about 10 minutes.",
    steps: [
      "Create a free account at stripe.com (or sign in if you have one).",
      "Add your business details and the bank account you want to be paid into.",
      "In the CRM go to Payments › Payment methods › Stripe › Connect, or send us an invite to your Stripe account.",
      "Come back here and click “Mark as connected”.",
    ],
    docs: [{ name: "Stripe setup guide.pdf", ext: "PDF", meta: "PDF · 3 pages · step-by-step with screenshots" }],
    comments: [],
  },
  {
    id: 3,
    kind: "upload",
    title: "Send your logo files",
    desc: "PNG or SVG, the bigger the better.",
    action: "Mark as sent",
    done: true,
    changesRequested: false,
    phase: "Discovery & onboarding",
    from: "GoCWGL team",
    sent: "Oct 7",
    details: "We need your logo for the landing page, emails and your booking page.",
    docs: [
      { name: "rahman-wellness-logo.svg", ext: "SVG", meta: "Uploaded by you · Oct 8" },
      { name: "rahman-wellness-logo-white.png", ext: "PNG", meta: "Uploaded by you · Oct 8" },
    ],
    comments: [
      { from: "You", when: "Oct 8", text: "Here are both versions." },
      { from: "GoCWGL team", when: "Oct 8", text: "Perfect, thank you!" },
    ],
  },
];

const phase = (name: string, tasks: Array<[string, boolean]>): BuildPhase => ({
  name,
  tasks: tasks.map(([text, done]) => ({ text, done })),
});

export const BUILD_PHASES: BuildPhase[] = [
  phase("Discovery & onboarding", [["Kickoff call", true], ["Collect logins and brand assets", true], ["Map the customer journey", true]]),
  phase("Funnel & landing page", [["Write landing page copy", true], ["Design landing page", true], ["Connect signup form", false]]),
  phase("Pipeline & CRM setup", [["Create pipeline stages", true], ["Import existing contacts", false], ["Set up tags", false]]),
  phase("Automations", [["Welcome email sequence", false], ["Booking reminders", false], ["Payment follow-up", false]]),
  phase("Content templates", [["Email templates", false], ["Social post templates", false]]),
  phase("Reporting & launch", [["Daily reporting setup", false], ["Final testing", false], ["Launch and handover call", false]]),
];

export const BUILD_DUE = "Nov 3";

export const INITIAL_UPDATES: Update[] = [
  { who: "GoCWGL", date: "Oct 13", text: "Your landing page design is approved and the pipeline stages are set up. Next: connecting the signup form." },
  { who: "GoCWGL", date: "Oct 8", text: "Kickoff done! We have everything we need to start building." },
];

export const PAYMENT_CARD = "Visa •••• 4242";
export const PLAN_PRICE = 97;

export const INITIAL_INVOICES: Invoice[] = [
  { no: "INV-1003", desc: "System setup fee", amount: 497, due: "Oct 20", status: "Open" },
  { no: "INV-0998", desc: "Monthly retainer — October", amount: 97, due: "Oct 6", status: "Paid" },
  { no: "INV-0981", desc: "Monthly retainer — September", amount: 97, due: "Sep 6", status: "Paid" },
];

export const INITIAL_TICKETS: Ticket[] = [
  { code: "REQ-214", type: "Change request", title: "Add a testimonials section to the landing page", date: "Oct 12", priority: "Medium", status: "In progress" },
  { code: "BUG-102", type: "Bug", title: "Form submissions not showing in Pipeline", date: "Oct 13", priority: "High", status: "In progress" },
  { code: "REQ-201", type: "Question", title: "How do I add my assistant to the portal?", date: "Oct 7", priority: "Low", status: "Answered" },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  { mine: false, who: "GoCWGL team", when: "Oct 13, 4:10 PM", text: "Hi Aisha! Your landing page is ready for review. Have a look under Build progress and approve the copy when you can." },
  { mine: true, who: "You", when: "Oct 13, 6:32 PM", text: "Looks great! One question — can we add a few testimonials?" },
  { mine: false, who: "GoCWGL team", when: "Oct 14, 9:05 AM", text: "Absolutely. I created a request for it (REQ-214). We will have it in by Friday." },
];

export const INITIAL_PROFILE: Profile = {
  name: "Aisha Rahman",
  email: "aisha@rahmanwellness.example",
  phone: "(555) 527-0094",
  business: "Rahman Wellness Studio",
  website: "https://rahmanwellness.example",
};

export const INITIAL_TEAM = [
  { name: "Aisha Rahman", email: "aisha@rahmanwellness.example", role: "Owner" },
  { name: "Jo Rahman", email: "jo@rahmanwellness.example", role: "Viewer" },
];

export const ALERT_OPTIONS = [
  { key: "report", label: "Daily report email", desc: "Your numbers every morning at 7:00 AM" },
  { key: "lead", label: "New lead alerts", desc: "An email the moment someone signs up" },
  { key: "health", label: "System health alerts", desc: "If anything in your system needs attention" },
  { key: "build", label: "Build updates", desc: "When your GoCWGL team posts progress" },
] as const;

export const INITIAL_FUNNELS: Funnel[] = [
  {
    id: 1,
    name: "Instagram lead ad funnel",
    type: "Lead capture",
    goal: "Turn ad clicks into free-week signups",
    status: "live",
    url: "go.rahmanwellness.example/ig",
    visits: 410,
    revenue: 582,
    links: [
      { label: "Instagram", url: "https://instagram.com/rahmanwellness" },
      { label: "Facebook", url: "https://facebook.com/rahmanwellness" },
    ],
    steps: [["Ad landing page", 410], ["Signup form", 61], ["Thank-you + booking", 24], ["Paid membership", 6]],
  },
  {
    id: 2,
    name: "Newsletter opt-in",
    type: "Lead magnet",
    goal: "Grow the email list with a free stretching guide",
    status: "live",
    url: "rahmanwellness.example/guide",
    visits: 238,
    revenue: 0,
    steps: [["Guide page", 238], ["Email signup", 54], ["Welcome emails", 54]],
  },
  {
    id: 3,
    name: "Free First Week funnel",
    type: "Booking funnel",
    goal: "Main website funnel: free week → intro call → membership",
    status: "build",
    url: "",
    pct: 41,
    steps: [["Landing page", 0], ["Signup form", 0], ["Booking page", 0], ["Checkout", 0]],
  },
];

export const INITIAL_SOCIALS: Record<SocialKey, string> = {
  facebook: "https://facebook.com/rahmanwellness",
  instagram: "https://instagram.com/rahmanwellness",
  tiktok: "",
  linkedin: "",
  youtube: "",
  x: "",
  google: "",
};

export const INITIAL_CUSTOM_LINKS: CustomLink[] = [
  { id: 1, label: "Class schedule app", url: "https://app.example.com/rahman-wellness", touched: false },
];

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

export const INITIAL_ASSETS: Asset[] = [
  { id: 1, name: "rahman-wellness-logo.svg", cat: "logos", size: 24576, date: "Oct 8", url: "" },
  { id: 2, name: "rahman-wellness-logo-white.png", cat: "logos", size: 118000, date: "Oct 8", url: "" },
  { id: 3, name: "studio-front.jpg", cat: "photos", size: 2400000, date: "Oct 9", url: "" },
  { id: 4, name: "class-in-session.jpg", cat: "photos", size: 3100000, date: "Oct 9", url: "" },
  { id: 5, name: "welcome-video.mp4", cat: "videos", size: 48000000, date: "Oct 10", url: "" },
  { id: 6, name: "class-schedule-fall.pdf", cat: "docs", size: 410000, date: "Oct 11", url: "" },
];

export const INITIAL_BRAND_KIT = {
  colors: ["#1F3A34", "#C9A77C", "#F5EFE6"],
  headingFont: "Playfair Display",
  bodyFont: "Inter",
};

// --------------------------------------------------------------- Overview
export const KPI_BY_RANGE: Record<RangeKey, { leads: number; calls: number; clients: number; revenue: number; deltas: string[]; period: string }> = {
  "7": { leads: 12, calls: 6, clients: 2, revenue: 980, deltas: ["+20%", "+50%", "+0%", "+12%"], period: "7 days" },
  "30": { leads: 46, calls: 19, clients: 7, revenue: 3430, deltas: ["+18%", "+27%", "+40%", "+31%"], period: "30 days" },
  "90": { leads: 121, calls: 48, clients: 16, revenue: 8120, deltas: ["+9%", "+14%", "+23%", "+19%"], period: "90 days" },
};

/** New leads per day for Oct 1–14. */
export const DAILY_LEADS = [2, 1, 3, 2, 0, 1, 2, 3, 1, 2, 4, 1, 3, 2];

export const LIVE_ACTIVITY: Array<{ who: string; what: string; when: string; color: string }> = [
  { who: "Priya Shah", what: "signed up from your Instagram ad", when: "12 min ago", color: "#7C3AED" },
  { who: "Tom Becker", what: "booked a call for Thu 10:00 AM", when: "1 hour ago", color: "#F59E0B" },
  { who: "Welcome email", what: "sent to Priya Shah", when: "12 min ago", color: "#0891B2" },
  { who: "Lena Ortiz", what: "paid $97 — new client", when: "Yesterday", color: "#10B981" },
  { who: "Daily report", what: "for Oct 13 is ready", when: "Today, 7:00 AM", color: "#0E7490" },
  { who: "Reminder text", what: "sent to Mei Chen", when: "Yesterday", color: "#0891B2" },
];

// ----------------------------------------------------------------- Reports
export const DAILY_REPORTS: DailyReport[] = [
  {
    day: 14, dow: "WED", leads: 4, calls: 2, show: 100, clients: 1, rev: 497, spend: 38,
    sources: [["Instagram ad", 2], ["Landing page", 1], ["Referral", 1]],
    notes: [
      "Best day this week for new leads. The Instagram ad is doing most of the work.",
      "Both booked calls showed up, and one became a client.",
      "Tip: reply to Priya today — fast replies double the chance she books.",
    ],
  },
  {
    day: 13, dow: "TUE", leads: 3, calls: 1, show: 100, clients: 1, rev: 97, spend: 41,
    sources: [["Landing page", 2], ["Referral", 1]],
    notes: ["Steady day. Lena joined after her call.", "Ad cost per lead was $13.67, a little higher than last week."],
  },
  {
    day: 12, dow: "MON", leads: 1, calls: 2, show: 50, clients: 0, rev: 0, spend: 35,
    sources: [["Instagram ad", 1]],
    notes: [
      "Quieter Monday. One person missed their call, so a reminder text was sent to rebook.",
      "We are testing a new ad image starting tomorrow.",
    ],
  },
  {
    day: 11, dow: "SUN", leads: 2, calls: 0, show: 0, clients: 1, rev: 97, spend: 30,
    sources: [["Google search", 1], ["Landing page", 1]],
    notes: ["Jordan paid straight from the booking page without a call."],
  },
  {
    day: 10, dow: "SAT", leads: 1, calls: 1, show: 100, clients: 0, rev: 0, spend: 30,
    sources: [["Landing page", 1]],
    notes: ["Weekend traffic is lower, which is normal."],
  },
];

export const SOURCE_COLORS: Record<string, string> = {
  "Instagram ad": "#7C3AED",
  "Landing page": "#0891B2",
  Referral: "#10B981",
  "Google search": "#F59E0B",
};

// ------------------------------------------------------------------ Health
export const INCIDENTS = [
  { date: "Oct 9", title: "Booking page loaded slowly for 14 minutes", fix: "Resolved by your GoCWGL team. No bookings were lost." },
  { date: "Sep 30", title: "Facebook lead ads paused by Facebook", fix: "Reconnected the ad account. Leads resumed the same day." },
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
export const PRIORITIES = ["Low", "Medium", "High", "Critical — my system is down"];

// --------------------------------------------------------- Funnel requests
export const FUNNEL_TYPES = [
  { key: "lead", label: "Lead magnet", price: 297, desc: "Free guide or checklist in exchange for an email.", steps: ["Opt-in page", "Thank-you page", "Delivery email"] },
  { key: "booking", label: "Booking funnel", price: 397, desc: "Landing page that gets people to book a call.", steps: ["Landing page", "Booking page", "Confirmation"] },
  { key: "webinar", label: "Webinar / event", price: 597, desc: "Registration, reminders and replay pages.", steps: ["Registration page", "Reminder emails", "Replay page"] },
  { key: "sales", label: "Sales & checkout", price: 697, desc: "Sell a product or package with online payment.", steps: ["Sales page", "Checkout", "Thank-you page"] },
  { key: "membership", label: "Membership signup", price: 897, desc: "Recurring membership with onboarding.", steps: ["Plans page", "Checkout", "Onboarding emails"] },
  { key: "custom", label: "Something else", price: 0, desc: "Tell us what you need and we will send a quote.", steps: ["Custom"] },
] as const;

export type FunnelTypeKey = (typeof FUNNEL_TYPES)[number]["key"];

export const FUNNEL_ADDONS = [
  { key: "emails", label: "Email follow-up sequence", price: 147, desc: "5 emails that nurture people who do not buy right away" },
  { key: "upsell", label: "Upsell / order bump", price: 97, desc: "Offer an extra right after checkout" },
  { key: "ab", label: "A/B test landing page", price: 97, desc: "A second version of the page to see which converts better" },
] as const;

export const RUSH_PRICE = 150;

// --------------------------------------------------- Landing page preview
export const LANDING_COPY = [
  { label: "HEADLINE", text: "Feel stronger, calmer and more like yourself.", size: 20, weight: 800 },
  { label: "SUBHEADLINE", text: "Small-group wellness classes and 1:1 coaching in a studio built around you.", size: 15, weight: 600 },
  { label: "OFFER", text: "Start with a free first week — no card needed.", size: 15, weight: 700 },
  { label: "CLASSES", text: "Mobility & Stretch\nStrength Foundations\nBreathwork & Recovery", size: 14, weight: 500 },
  { label: "BUTTON", text: "Book your free intro call", size: 14, weight: 800 },
];

export const MOCKUP_FEATURES = ["Small groups of 6", "1:1 coaching", "Free first week"];
