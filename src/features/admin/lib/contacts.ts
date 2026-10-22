import { STAGE_COLORS, TAG_COLORS, type CoreStage } from "@/data/admin";
import type { Tone } from "@/lib/tones";
import type { ContactOut, PipelineOut, SubscriptionOut } from "@/utils/api/models";
import { formatCall } from "@/utils/format/dates";
import { formatPerInterval } from "@/utils/format/money";

export type StageInfo = { label: string; tone: Tone };

const DEFAULT_STAGES: Record<CoreStage, StageInfo> = {
  lead: { label: "New lead", tone: "cyan" },
  booked: { label: "Call booked", tone: "amber" },
  paid: { label: "Paid subscriber", tone: "green" },
  lost: { label: "Lost", tone: "slate" },
};

/** The built-in sales pipeline (its stages are the contacts' `stage`). */
export function salesPipeline(pipelines: PipelineOut[] | undefined): PipelineOut | undefined {
  return pipelines?.find((p) => p.isSystem);
}

/** Name and color of each sales stage (they can be renamed / recolored in the pipeline editor). */
export function getSalesStages(pipelines: PipelineOut[] | undefined): Record<CoreStage, StageInfo> {
  const map = { ...DEFAULT_STAGES };
  salesPipeline(pipelines)?.stages.forEach((st) => {
    if (st.key in map) map[st.key as CoreStage] = { label: st.name, tone: stageTone(st.color) };
  });
  return map;
}

/** Stage info for any stage string the API sends (unknown ones fall back to "lead"). */
export function stageOf(stages: Record<CoreStage, StageInfo>, stage: string): StageInfo {
  return stages[stage as CoreStage] ?? stages.lead;
}

export function stageTone(colorIndex: number): Tone {
  return (STAGE_COLORS[colorIndex] ?? STAGE_COLORS[0]).tone;
}

export function tagTone(tag: { color: number }): Tone {
  return (TAG_COLORS[tag.color] ?? TAG_COLORS[0]).tone;
}

/** "Wed 14 Oct · 2:00 PM", "Needs a time" or "—". */
export function callText(contact: Pick<ContactOut, "callAt" | "stage">): string {
  if (contact.callAt) return formatCall(contact.callAt);
  return contact.stage === "booked" ? "Needs a time" : "—";
}

/** A contact's current subscription (the newest one that isn't canceled, else the newest). */
export function subscriptionOf(subs: SubscriptionOut[] | undefined, contactId: string): SubscriptionOut | undefined {
  const mine = (subs ?? []).filter((s) => s.contactId === contactId);
  return mine.find((s) => s.status !== "Canceled") ?? mine[0];
}

/** "Active · $97/mo" or "None". */
export function subscriptionText(sub: SubscriptionOut | undefined): string {
  return sub ? `${sub.status} · ${formatPerInterval(sub.amountCents, sub.interval, sub.currency)}` : "None";
}

/** Subscription states that still count as a current client. "Awaiting payment" is a yearly invoice that went out and isn't paid yet. */
const CURRENT_SUBSCRIPTION = ["Active", "Trial", "Awaiting payment"];

/** Paying client whose subscription (if any) hasn't been paused or cancelled. */
export function isActiveClient(contact: ContactOut, subs: SubscriptionOut[] | undefined): boolean {
  const sub = subscriptionOf(subs, contact.id);
  return contact.stage === "paid" && (!sub || CURRENT_SUBSCRIPTION.includes(sub.status));
}

/** Lost lead, paused subscription, or paid client whose subscription was cancelled. */
export function isInactiveClient(contact: ContactOut, subs: SubscriptionOut[] | undefined): boolean {
  const sub = subscriptionOf(subs, contact.id);
  return contact.stage === "lost" || sub?.status === "Paused" || (contact.stage === "paid" && !isActiveClient(contact, subs));
}

export type ContactStatus = "lead" | "active" | "inactive";

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: Tone }> = {
  active: { label: "Active client", tone: "green" },
  inactive: { label: "Inactive", tone: "slate" },
  lead: { label: "Lead", tone: "cyan" },
};

export function contactStatus(stage: string, paused: boolean, archived = false): ContactStatus {
  if (archived || paused || stage === "lost") return "inactive";
  return stage === "paid" ? "active" : "lead";
}

/** Display name of a contact (the API's read-only `name`, else first + last, else email). */
export function contactName(c: Pick<ContactOut, "name" | "firstName" | "lastName" | "email"> | undefined | null): string {
  if (!c) return "";
  return c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
}

/** "Rahman Wellness" (company) or the person's name. */
export function businessName(c: ContactOut | undefined | null): string {
  return c?.company || contactName(c);
}
