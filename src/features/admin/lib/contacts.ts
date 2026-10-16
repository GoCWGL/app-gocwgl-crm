import {
  PLAN_PRICE,
  STAGE_COLORS,
  TAG_COLORS,
  WEEK_DAYS,
  type Contact,
  type CoreStage,
  type Pipeline,
  type Subscription,
  type Tag,
} from "@/data/admin";
import type { Tone } from "@/lib/tones";
import { formatMoney } from "@/lib/utils";

export type StageInfo = { label: string; tone: Tone };

/** Name and color of each sales stage (they can be renamed / recolored). */
export function getSalesStages(pipelines: Pipeline[]): Record<CoreStage, StageInfo> {
  const map = {} as Record<CoreStage, StageInfo>;
  pipelines[0].stages.forEach((st) => {
    map[st.id as CoreStage] = { label: st.name, tone: (STAGE_COLORS[st.color] ?? STAGE_COLORS[0]).tone };
  });
  return map;
}

export function stageTone(colorIndex: number): Tone {
  return (STAGE_COLORS[colorIndex] ?? STAGE_COLORS[0]).tone;
}

export function tagTone(tag: Tag): Tone {
  return (TAG_COLORS[tag.color] ?? TAG_COLORS[0]).tone;
}

/** "Wed 14 Oct · 2:00 PM", "Needs a time" or "—". */
export function callText(contact: Contact): string {
  if (contact.day) {
    const date = WEEK_DAYS.find(([d]) => d === contact.day)?.[1] ?? "";
    return `${contact.day} ${date} Oct · ${contact.time}`;
  }
  return contact.stage === "booked" ? "Needs a time" : "—";
}

export function subscriptionOf(subs: Subscription[], contactId: number): Subscription | undefined {
  return subs.find((s) => s.cid === contactId);
}

/** Paying client with an active (or trial) subscription. */
export function isActiveClient(contact: Contact, subs: Subscription[]): boolean {
  const sub = subscriptionOf(subs, contact.id);
  return contact.stage === "paid" && (!sub || sub.status === "Active" || sub.status === "Trial");
}

/** Lost lead, paused subscription, or paid client who stopped paying. */
export function isInactiveClient(contact: Contact, subs: Subscription[]): boolean {
  const sub = subscriptionOf(subs, contact.id);
  return contact.stage === "lost" || sub?.status === "Paused" || (contact.stage === "paid" && !isActiveClient(contact, subs));
}

export type ContactStatus = "lead" | "active" | "inactive";

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: Tone }> = {
  active: { label: "Active client", tone: "green" },
  inactive: { label: "Inactive", tone: "slate" },
  lead: { label: "Lead", tone: "cyan" },
};

export function contactStatus(stage: CoreStage, paused: boolean): ContactStatus {
  if (paused || stage === "lost") return "inactive";
  return stage === "paid" ? "active" : "lead";
}

export const monthly = (count: number) => formatMoney(count * PLAN_PRICE) + "/mo";
