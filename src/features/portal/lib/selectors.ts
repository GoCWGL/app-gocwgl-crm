import type { PhaseState } from "@/components/ui";
import { SOCIAL_NETWORKS, type CustomLink, type SocialKey } from "@/data/portal";
import { isUrl } from "@/lib/utils";
import type { ProjectOut } from "@/utils/api/models";

// ------------------------------------------------------------------ Build
export type BuildPhaseView = {
  name: string;
  state: PhaseState;
  label: "Done" | "In progress" | "Up next";
  tasks: Array<{ text: string; done: boolean }>;
};

/** Phase states for the timeline. The percentage is the API's own `progress`. */
export function getBuildProgress(project: ProjectOut) {
  const all = project.phases.reduce((n, p) => n + p.tasks.length, 0);
  const done = project.phases.reduce((n, p) => n + p.tasks.filter((t) => t.done).length, 0);
  const currentIndex = project.phases.findIndex((p) => p.tasks.some((t) => !t.done));
  const phasesDone = project.phases.filter((p) => p.tasks.every((t) => t.done)).length;

  const phases: BuildPhaseView[] = project.phases.map((p, i) => {
    const isDone = p.tasks.every((t) => t.done);
    const isCurrent = i === currentIndex;
    return {
      name: p.name,
      state: isDone ? "done" : isCurrent ? "current" : "upcoming",
      label: isDone ? "Done" : isCurrent ? "In progress" : "Up next",
      tasks: p.tasks.map((t) => ({ text: t.text, done: t.done })),
    };
  });

  return {
    percent: project.progress,
    current: currentIndex >= 0 ? project.phases[currentIndex].name : "Launched",
    summary: `${done} of ${all} tasks done · ${phasesDone} of ${project.phases.length} phases complete`,
    phases,
  };
}

// ------------------------------------------------------------ Social links
/** Quick check while typing; the API validates hosts too and its 422 messages win. */
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
export function getSavedLinks(socials: Partial<Record<SocialKey, string>>, customLinks: CustomLink[]) {
  return [
    ...SOCIAL_NETWORKS.filter((n) => isUrl(socials[n.key] || "")).map((n) => ({
      key: "s-" + n.key,
      label: n.key === "google" ? "Google Business" : n.label,
      url: socials[n.key] as string,
    })),
    ...customLinks
      .filter((c) => isUrl(c.url))
      .map((c) => ({ key: "c-" + c.id, label: c.label.trim() || c.url.replace(/^https?:\/\//, ""), url: c.url })),
  ];
}
