import type { Tone } from "@/lib/tones";

// =============================================================================
// Delivery: client build projects, media folders, brand kits and links.
// =============================================================================

// ----------------------------------------------------------------- Projects
export type ProjectStatus = "On track" | "At risk" | "Waiting on client" | "Launched";

export type Project = {
  package: string;
  start: string;
  due: string;
  status: ProjectStatus;
  phases: Array<{ name: string; tasks: Array<{ t: string; done: boolean }> }>;
  updates: Array<{ date: string; text: string }>;
};

export const PROJECT_STATUS_TONES: Record<ProjectStatus | "Not started", Tone> = {
  "On track": "green",
  "At risk": "red",
  "Waiting on client": "amber",
  Launched: "brand",
  "Not started": "neutral",
};

export const PROJECT_STATUSES: ProjectStatus[] = ["On track", "At risk", "Waiting on client", "Launched"];

/** Phases used when starting a new system build. */
export const PROJECT_TEMPLATE = [
  { name: "Discovery & onboarding", tasks: ["Kickoff call", "Collect logins and brand assets", "Map the customer journey"] },
  { name: "Funnel & landing page", tasks: ["Write landing page copy", "Design landing page", "Connect signup form"] },
  { name: "Pipeline & CRM setup", tasks: ["Create pipeline stages", "Import existing contacts", "Set up tags"] },
  { name: "Automations", tasks: ["Welcome email sequence", "Booking reminders", "Payment follow-up"] },
  { name: "Content templates", tasks: ["Email templates", "Social post templates"] },
  { name: "Reporting & launch", tasks: ["Daily reporting setup", "Final testing", "Launch and handover call"] },
];

const tasks = (list: Array<[string, boolean]>) => list.map(([t, done]) => ({ t, done }));

/** Build projects by contact id. */
export const INITIAL_PROJECTS: Record<number, Project> = {
  9: {
    package: "Revenue Engine System", start: "Oct 6", due: "Nov 3", status: "On track",
    phases: [
      { name: "Discovery & onboarding", tasks: tasks([["Kickoff call", true], ["Collect logins and brand assets", true], ["Map the customer journey", true]]) },
      { name: "Funnel & landing page", tasks: tasks([["Write landing page copy", true], ["Design landing page", true], ["Connect signup form", false]]) },
      { name: "Pipeline & CRM setup", tasks: tasks([["Create pipeline stages", true], ["Import existing contacts", false], ["Set up tags", false]]) },
      { name: "Automations", tasks: tasks([["Welcome email sequence", false], ["Booking reminders", false], ["Payment follow-up", false]]) },
      { name: "Content templates", tasks: tasks([["Email templates", false], ["Social post templates", false]]) },
      { name: "Reporting & launch", tasks: tasks([["Daily reporting setup", false], ["Final testing", false], ["Launch and handover call", false]]) },
    ],
    updates: [
      { date: "Oct 13", text: "Your landing page design is approved and the pipeline stages are set up. Next: connecting the signup form." },
      { date: "Oct 8", text: "Kickoff done! We have everything we need to start building." },
    ],
  },
  8: {
    package: "Revenue Engine System", start: "Sep 15", due: "Oct 13", status: "Launched",
    phases: [
      { name: "Discovery & onboarding", tasks: tasks([["Kickoff call", true], ["Collect logins and brand assets", true]]) },
      { name: "Funnel & landing page", tasks: tasks([["Landing page live", true]]) },
      { name: "Pipeline & automations", tasks: tasks([["Pipeline set up", true], ["Automations live", true]]) },
      { name: "Reporting & launch", tasks: tasks([["Launch and handover call", true]]) },
    ],
    updates: [{ date: "Oct 13", text: "Your system is live! Thanks for building with us." }],
  },
};

// -------------------------------------------------------------------- Media
export type MediaCategory = "logos" | "photos" | "videos" | "docs" | "deliverables" | "other";

export const MEDIA_CATEGORIES: Array<{ value: MediaCategory; label: string }> = [
  { value: "logos", label: "Logos" },
  { value: "photos", label: "Photos" },
  { value: "videos", label: "Videos" },
  { value: "docs", label: "Documents" },
  { value: "deliverables", label: "Deliverables" },
  { value: "other", label: "Other" },
];

export type MediaFile = {
  id: number;
  name: string;
  cat: MediaCategory;
  size: number;
  date: string;
  /** Uploaded by the client (from their portal) or by your team. */
  by: "client" | "team";
  url: string;
};

/** Media files by contact id. */
export const INITIAL_MEDIA: Record<number, MediaFile[]> = {
  9: [
    { id: 1, name: "rahman-wellness-logo.svg", cat: "logos", size: 24576, date: "Oct 8", by: "client", url: "" },
    { id: 2, name: "rahman-wellness-logo-white.png", cat: "logos", size: 118000, date: "Oct 8", by: "client", url: "" },
    { id: 3, name: "studio-front.jpg", cat: "photos", size: 2400000, date: "Oct 9", by: "client", url: "" },
    { id: 4, name: "class-in-session.jpg", cat: "photos", size: 3100000, date: "Oct 9", by: "client", url: "" },
    { id: 5, name: "welcome-video.mp4", cat: "videos", size: 48000000, date: "Oct 10", by: "client", url: "" },
    { id: 6, name: "class-schedule-fall.pdf", cat: "docs", size: 410000, date: "Oct 11", by: "client", url: "" },
    { id: 7, name: "Landing page copy – v2.docx", cat: "docs", size: 18000, date: "Oct 13", by: "team", url: "" },
    { id: 8, name: "Landing page mockup.png", cat: "deliverables", size: 1200000, date: "Oct 13", by: "team", url: "" },
  ],
  8: [
    { id: 11, name: "bianchi-logo.png", cat: "logos", size: 86000, date: "Sep 16", by: "client", url: "" },
    { id: 12, name: "menu-photos.zip", cat: "other", size: 22000000, date: "Sep 18", by: "client", url: "" },
    { id: 13, name: "Launch handover.pdf", cat: "deliverables", size: 640000, date: "Oct 13", by: "team", url: "" },
  ],
};

export const BRAND_KITS: Record<number, { colors: string[]; fonts: string }> = {
  9: { colors: ["#1F3A34", "#C9A77C", "#F5EFE6"], fonts: "Playfair Display / Inter" },
};

// ---------------------------------------------------------- Client links
export const SOCIAL_LABELS: Record<string, { label: string; short: string; tone: Tone }> = {
  facebook: { label: "Facebook", short: "Fb", tone: "sky" },
  instagram: { label: "Instagram", short: "Ig", tone: "pink" },
  tiktok: { label: "TikTok", short: "Tt", tone: "ink" },
  linkedin: { label: "LinkedIn", short: "In", tone: "cyan" },
  youtube: { label: "YouTube", short: "Yt", tone: "red" },
  x: { label: "X (Twitter)", short: "X", tone: "ink" },
  google: { label: "Google Business", short: "G", tone: "green" },
};

export type ClientLinks = {
  updated: string;
  socials: Array<[string, string]>;
  custom: Array<[string, string]>;
  /** Funnel name → link labels shown on it. */
  funnels: Array<[string, string[]]>;
};

/** Social and custom links each client added in their portal, by contact id. */
export const CLIENT_LINKS: Record<number, ClientLinks> = {
  9: {
    updated: "Oct 14",
    socials: [
      ["facebook", "https://facebook.com/rahmanwellness"],
      ["instagram", "https://instagram.com/rahmanwellness"],
    ],
    custom: [["Class schedule app", "https://app.example.com/rahman-wellness"]],
    funnels: [
      ["Instagram lead ad funnel", ["Instagram", "Facebook"]],
      ["Free First Week funnel", ["Facebook", "Instagram", "Class schedule app"]],
    ],
  },
  8: {
    updated: "Sep 20",
    socials: [
      ["instagram", "https://instagram.com/bianchikitchen"],
      ["google", "https://g.page/bianchikitchen"],
    ],
    custom: [],
    funnels: [],
  },
};

/** Business names used when an admin opens "View as client". */
export const CLIENT_BUSINESSES: Record<number, string> = { 9: "Rahman Wellness", 8: "Bianchi Kitchen" };
