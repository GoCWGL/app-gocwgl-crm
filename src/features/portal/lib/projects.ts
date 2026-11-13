import type { Tone } from "@/lib/tones";
import type { ClientProjectOut } from "@/utils/api/models";

export type ProjectStatus = ClientProjectOut["status"];
export type ProjectPriority = ClientProjectOut["priority"];

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "sky" },
  in_progress: { label: "In progress", tone: "brand" },
  review: { label: "In review", tone: "purple" },
  done: { label: "Done", tone: "green" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

/** The order a project moves through (cancelled is off to the side). */
export const PROJECT_FLOW: ProjectStatus[] = ["requested", "in_progress", "review", "done"];

export const PRIORITY: Record<ProjectPriority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "slate" },
  normal: { label: "Normal", tone: "cyan" },
  high: { label: "High", tone: "red" },
};

export const isOpenProject = (p: { status: ProjectStatus }) => p.status !== "done" && p.status !== "cancelled";
