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

type TaskVaLite = { id: string; name: string; role?: string; readAt?: string | null };

/** "Riley", "Riley and Ben", "Riley, Ben and Sam", "Riley, Ben and 2 more". */
export function vaNames(vas: TaskVaLite[], none = "GoCWGL is picking a VA"): string {
  const n = vas.map((v) => v.name);
  if (!n.length) return none;
  if (n.length === 1) return n[0];
  if (n.length <= 3) return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  return `${n.slice(0, 2).join(", ")} and ${n.length - 2} more`;
}

/** When every VA on the task had read the conversation (the earliest of their read marks), for "read" ticks. */
export function allReadAt(vas: TaskVaLite[]): string | null {
  if (!vas.length || vas.some((v) => !v.readAt)) return null;
  return vas.map((v) => v.readAt!).sort()[0];
}

/** "Riley" (main VA only), "Riley + 1 backup", "Riley + 2 backups"; the API sends the main VA first. */
export function assigneeLabel(vas: TaskVaLite[], none = "GoCWGL is picking a VA"): string {
  if (!vas.length) return none;
  const backups = vas.length - 1;
  return backups ? `${vas[0].name} + ${backups} backup${backups === 1 ? "" : "s"}` : vas[0].name;
}

/** "Riley (main), Ben (backup)" for the full list. */
export const assigneeDetail = (vas: TaskVaLite[]) =>
  vas.length > 1 ? vas.map((v) => `${v.name} (${v.role === "backup" ? "backup" : "main"})`).join(", ") : assigneeLabel(vas);
