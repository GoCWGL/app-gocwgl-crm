import type { Tone } from "@/lib/tones";

// =============================================================================
// Delivery options: build statuses, media categories, social link labels (pure UI constants).
// Projects, files, brand kits and links come from the API.
// =============================================================================

// ----------------------------------------------------------------- Projects
export type ProjectStatus = "On track" | "At risk" | "Waiting on client" | "Launched";

export const PROJECT_STATUS_TONES: Record<ProjectStatus | "Not started", Tone> = {
  "On track": "green",
  "At risk": "red",
  "Waiting on client": "amber",
  Launched: "brand",
  "Not started": "neutral",
};

export const PROJECT_STATUSES: ProjectStatus[] = ["On track", "At risk", "Waiting on client", "Launched"];

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
