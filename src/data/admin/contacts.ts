import type { Tone } from "@/lib/tones";

// =============================================================================
// Contact, tag and pipeline options for the admin CRM (pure UI constants).
// Contacts, tags and pipelines themselves come from the API.
// =============================================================================

export type CoreStage = "lead" | "booked" | "paid" | "lost";

export const CORE_STAGES: CoreStage[] = ["lead", "booked", "paid", "lost"];

/** Where a contact came from (the API's LeadSource values). */
export type LeadSource =
  | "Manual entry"
  | "Landing page"
  | "Landing page · FB ad"
  | "Landing page · Referral"
  | "Portal sign-up"
  | "Lead form"
  | "Survey"
  | "Booking page"
  | "Google sign-in";

/** Sources a person can pick when adding a contact by hand. */
export const LEAD_SOURCES: Array<{ value: LeadSource; label: string }> = [
  { value: "Manual entry", label: "Added manually" },
  { value: "Landing page", label: "Landing page" },
  { value: "Landing page · FB ad", label: "Facebook ad" },
  { value: "Landing page · Referral", label: "Referral" },
];

/** Friendly names for every source (filters and reports). */
export const SOURCE_LABELS: Partial<Record<LeadSource, string>> = {
  "Manual entry": "Added manually",
  "Landing page": "Direct / organic",
  "Landing page · FB ad": "Facebook ad",
  "Landing page · Referral": "Referral",
  "Portal sign-up": "Portal sign-up",
  "Lead form": "Lead form",
  Survey: "Survey",
  "Booking page": "Booking page",
  "Google sign-in": "Google sign-in",
};

// --------------------------------------------------------------------- Tags
/** Colors a tag can have, in the order of the color picker (the API stores the index). */
export const TAG_COLORS: Array<{ name: string; tone: Tone }> = [
  { name: "Red", tone: "red" },
  { name: "Orange", tone: "orange" },
  { name: "Purple", tone: "purple" },
  { name: "Blue", tone: "cyan" },
  { name: "Teal", tone: "teal" },
  { name: "Green", tone: "green" },
  { name: "Pink", tone: "pink" },
];

// ---------------------------------------------------------------- Pipelines
/** Colors a pipeline stage can have, in the order of the color picker (the API stores the index). */
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
