import type { Tone } from "@/lib/tones";

// =============================================================================
// Ticket options (pure UI constants). Tickets come from the API.
// =============================================================================

export type BugSeverity = "Critical" | "High" | "Medium" | "Low";
/** Ticket statuses from the API ("Done" is the closed state). */
export type BugStatus = "New" | "In progress" | "Waiting on client" | "Answered" | "Done";
export type TicketType = "bug" | "change" | "feature" | "question";

export const TICKET_TYPES: Array<{ value: TicketType; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "change", label: "Change request" },
  { value: "feature", label: "Feature request" },
  { value: "question", label: "Question" },
];

export const SEVERITY_TONES: Record<BugSeverity, Tone> = { Critical: "red", High: "orange", Medium: "amber", Low: "slate" };
export const BUG_STATUS_TONES: Record<BugStatus, Tone> = {
  New: "cyan",
  "In progress": "purple",
  "Waiting on client": "amber",
  Answered: "sky",
  Done: "green",
};
export const SEVERITIES: BugSeverity[] = ["Critical", "High", "Medium", "Low"];
export const BUG_STATUSES: BugStatus[] = ["New", "In progress", "Waiting on client", "Answered", "Done"];
