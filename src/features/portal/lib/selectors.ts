import { BUILD_PHASES, SOCIAL_NETWORKS, type SocialKey } from "@/data/portal";
import type { PhaseState } from "@/components/ui";
import { isUrl } from "@/lib/utils";
import type { PortalState } from "../state/PortalContext";

// ----------------------------------------------------------------- Health
export type HealthSummary = {
  issues: string[];
  ok: boolean;
  title: string;
  subtitle: string;
};

export function getHealth(state: Pick<PortalState, "calendarFixed" | "emailFixed">): HealthSummary {
  const issues: string[] = [];
  if (!state.calendarFixed) issues.push("Calendar sync");
  if (!state.emailFixed) issues.push("Payment follow-up email");

  if (!issues.length) {
    return {
      issues,
      ok: true,
      title: "All systems running",
      subtitle: "Every page, form, automation and connection is working normally.",
    };
  }
  const plural = issues.length > 1;
  return {
    issues,
    ok: false,
    title: `Your system is running · ${issues.length} item${plural ? "s" : ""} need attention`,
    subtitle: `${issues.join(" and ")} ${plural ? "need" : "needs"} a quick look. Everything else is working normally.`,
  };
}

// ------------------------------------------------------------------ Build
export type BuildPhaseView = {
  name: string;
  state: PhaseState;
  label: "Done" | "In progress" | "Up next";
  tasks: Array<{ text: string; done: boolean }>;
};

export function getBuildProgress() {
  const all = BUILD_PHASES.reduce((n, p) => n + p.tasks.length, 0);
  const done = BUILD_PHASES.reduce((n, p) => n + p.tasks.filter((t) => t.done).length, 0);
  const currentIndex = BUILD_PHASES.findIndex((p) => p.tasks.some((t) => !t.done));
  const phasesDone = BUILD_PHASES.filter((p) => p.tasks.every((t) => t.done)).length;

  const phases: BuildPhaseView[] = BUILD_PHASES.map((p, i) => {
    const isDone = p.tasks.every((t) => t.done);
    const isCurrent = i === currentIndex;
    return {
      name: p.name,
      state: isDone ? "done" : isCurrent ? "current" : "upcoming",
      label: isDone ? "Done" : isCurrent ? "In progress" : "Up next",
      tasks: p.tasks,
    };
  });

  return {
    percent: Math.round((done / all) * 100),
    current: currentIndex >= 0 ? BUILD_PHASES[currentIndex].name : "Launched",
    summary: `${done} of ${all} tasks done · ${phasesDone} of ${BUILD_PHASES.length} phases complete`,
    phases,
  };
}

// ------------------------------------------------------------ Social links
/** Error text for a social link, or "" when it is valid (or empty). */
export function socialLinkError(key: SocialKey, value: string): string {
  const network = SOCIAL_NETWORKS.find((n) => n.key === key)!;
  if (!value.trim()) return "";
  if (!isUrl(value)) return `Enter a full link, like https://${network.placeholder}`;
  const host = value
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .toLowerCase();
  if (!network.hosts.some((h) => host === h || host.endsWith("." + h))) {
    return `This does not look like a ${network.label} link`;
  }
  return "";
}

/** All valid links (socials + custom) the client has saved. */
export function getSavedLinks(state: Pick<PortalState, "socials" | "customLinks">) {
  return [
    ...SOCIAL_NETWORKS.filter((n) => isUrl(state.socials[n.key] || "")).map((n) => ({
      key: "s-" + n.key,
      label: n.key === "google" ? "Google Business" : n.label,
      url: state.socials[n.key],
    })),
    ...state.customLinks
      .filter((c) => isUrl(c.url))
      .map((c) => ({ key: "c-" + c.id, label: c.label.trim() || c.url.replace(/^https?:\/\//, ""), url: c.url })),
  ];
}
