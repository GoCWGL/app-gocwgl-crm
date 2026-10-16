import type { Tone } from "@/lib/tones";

// =============================================================================
// Contacts, tags and pipelines for the admin CRM (sample data, in memory).
// =============================================================================

/** Subscription price per client per month (shown across the CRM). */
export const PLAN_PRICE = 97;

export type CoreStage = "lead" | "booked" | "paid" | "lost";

export type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  /** Date they signed up, e.g. "Oct 14". */
  signed: string;
  stage: CoreStage;
  /** Scheduled call weekday ("Wed") and time, when a call is booked. */
  day: string;
  time: string;
  paidOn: string;
};

export type LeadSource = "Manual entry" | "Landing page" | "Landing page · FB ad" | "Landing page · Referral";

export const LEAD_SOURCES: Array<{ value: LeadSource; label: string }> = [
  { value: "Manual entry", label: "Added manually" },
  { value: "Landing page", label: "Landing page" },
  { value: "Landing page · FB ad", label: "Facebook ad" },
  { value: "Landing page · Referral", label: "Referral" },
];

/** Friendly names for the landing page sources (filters and reports). */
export const SOURCE_LABELS: Partial<Record<LeadSource, string>> = {
  "Landing page": "Direct / organic",
  "Landing page · FB ad": "Facebook ad",
  "Landing page · Referral": "Referral",
};

export const INITIAL_CONTACTS: Contact[] = [
  { id: 1, name: "James Carter", email: "james.carter@example.com", phone: "(555) 201-4410", source: "Landing page", signed: "Oct 14", stage: "lead", day: "", time: "", paidOn: "" },
  { id: 2, name: "Daniel Kim", email: "daniel.kim@example.com", phone: "(555) 310-8822", source: "Landing page · FB ad", signed: "Oct 13", stage: "booked", day: "Wed", time: "2:00 PM", paidOn: "" },
  { id: 3, name: "Maria Santos", email: "maria.santos@example.com", phone: "(555) 442-1090", source: "Landing page", signed: "Oct 13", stage: "booked", day: "Thu", time: "10:00 AM", paidOn: "" },
  { id: 4, name: "Sofia Reyes", email: "sofia.reyes@example.com", phone: "(555) 718-3321", source: "Landing page · Referral", signed: "Oct 13", stage: "lead", day: "", time: "", paidOn: "" },
  { id: 5, name: "Hannah Lee", email: "hannah.lee@example.com", phone: "(555) 602-7781", source: "Landing page · FB ad", signed: "Oct 12", stage: "lead", day: "", time: "", paidOn: "" },
  { id: 6, name: "Emma Lopez", email: "emma.lopez@example.com", phone: "(555) 239-5567", source: "Landing page", signed: "Oct 11", stage: "booked", day: "Fri", time: "11:30 AM", paidOn: "" },
  { id: 7, name: "Ethan Cruz", email: "ethan.cruz@example.com", phone: "(555) 880-1243", source: "Landing page · FB ad", signed: "Oct 10", stage: "booked", day: "Mon", time: "4:00 PM", paidOn: "" },
  { id: 8, name: "Marco Bianchi", email: "marco.bianchi@example.com", phone: "(555) 914-6630", source: "Landing page · Referral", signed: "Oct 6", stage: "paid", day: "", time: "", paidOn: "Oct 8" },
  { id: 9, name: "Aisha Rahman", email: "aisha.rahman@example.com", phone: "(555) 527-0094", source: "Landing page", signed: "Oct 2", stage: "paid", day: "", time: "", paidOn: "Oct 6" },
  { id: 10, name: "Noah Patel", email: "noah.patel@example.com", phone: "(555) 363-2218", source: "Landing page · FB ad", signed: "Sep 30", stage: "lost", day: "", time: "", paidOn: "" },
  { id: 11, name: "Grace Tan", email: "grace.tan@example.com", phone: "(555) 145-9902", source: "Landing page", signed: "Sep 28", stage: "paid", day: "", time: "", paidOn: "Sep 30" },
  { id: 12, name: "Liam Walsh", email: "liam.walsh@example.com", phone: "(555) 771-4456", source: "Landing page · Referral", signed: "Sep 26", stage: "lead", day: "", time: "", paidOn: "" },
];

/** Weekdays shown in the calendar, with their October date. */
export const WEEK_DAYS: Array<[string, string]> = [
  ["Mon", "12"],
  ["Tue", "13"],
  ["Wed", "14"],
  ["Thu", "15"],
  ["Fri", "16"],
];

// --------------------------------------------------------------------- Tags
/** Colors a tag can have, in the order of the color picker. */
export const TAG_COLORS: Array<{ name: string; tone: Tone }> = [
  { name: "Red", tone: "red" },
  { name: "Orange", tone: "orange" },
  { name: "Purple", tone: "purple" },
  { name: "Blue", tone: "cyan" },
  { name: "Teal", tone: "teal" },
  { name: "Green", tone: "green" },
  { name: "Pink", tone: "pink" },
];

export type Tag = { id: string; name: string; color: number };

export const INITIAL_TAGS: Tag[] = [
  { id: "hot", name: "Hot lead", color: 0 },
  { id: "follow", name: "Follow up", color: 1 },
  { id: "vip", name: "VIP", color: 2 },
  { id: "fb", name: "Facebook ad", color: 3 },
  { id: "referral", name: "Referral", color: 4 },
  { id: "newsletter", name: "Newsletter", color: 5 },
];

/** Tags on each contact, by contact id. */
export const INITIAL_CONTACT_TAGS: Record<number, string[]> = {
  1: ["hot", "follow"], 2: ["fb"], 3: ["hot"], 4: ["referral"], 5: ["fb", "follow"], 6: ["newsletter"],
  7: ["fb"], 8: ["vip", "referral"], 9: ["vip"], 10: ["fb"], 11: [], 12: ["referral", "follow"],
};

// ---------------------------------------------------------------- Pipelines
/** Colors a pipeline stage can have, in the order of the color picker. */
export const STAGE_COLORS: Array<{ name: string; tone: Tone }> = [
  { name: "Cyan", tone: "cyan" },
  { name: "Amber", tone: "amber" },
  { name: "Green", tone: "green" },
  { name: "Gray", tone: "slate" },
  { name: "Purple", tone: "purple" },
  { name: "Pink", tone: "pink" },
  { name: "Teal", tone: "teal" },
  { name: "Orange", tone: "orange" },
];

export type PipelineStage = { id: string; name: string; color: number; core?: boolean };

export type Pipeline = {
  id: string;
  name: string;
  /** The built-in sales pipeline; its stages are the contacts' `stage`. */
  system?: boolean;
  stages: PipelineStage[];
  /** For custom pipelines: which stage each contact is in. */
  items?: Record<number, string>;
  /** For custom pipelines: card order. */
  order?: number[];
};

export const INITIAL_PIPELINES: Pipeline[] = [
  {
    id: "sales",
    name: "Sales pipeline",
    system: true,
    stages: [
      { id: "lead", name: "New lead", color: 0, core: true },
      { id: "booked", name: "Call booked", color: 1, core: true },
      { id: "paid", name: "Paid subscriber", color: 2, core: true },
      { id: "lost", name: "Lost", color: 3, core: true },
    ],
  },
  {
    id: "onboarding",
    name: "Client onboarding",
    stages: [
      { id: "kickoff", name: "Kickoff call", color: 4 },
      { id: "setup", name: "Account setup", color: 0 },
      { id: "live", name: "Live", color: 2 },
    ],
    items: { 11: "kickoff", 9: "setup", 8: "live" },
    order: [11, 9, 8],
  },
];

export const INITIAL_PIPE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
