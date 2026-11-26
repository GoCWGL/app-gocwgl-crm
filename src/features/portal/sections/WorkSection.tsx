"use client";

import { useState } from "react";
import { Button, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useProjects, useVaRequests } from "@/utils/hooks/useClientWork";
import { isOpenProject } from "../lib/projects";
import { useHasVaWork, useShowPackages } from "../lib/vaAccess";
import { usePortal } from "../state/PortalContext";
import { ProjectsSection } from "./ProjectsSection";
import { VaProjectsSection } from "./VaProjectsSection";

type WorkTab = "tasks" | "projects";

/** On its way to a VA (sent, in review, approved, finding the VA). */
const REQUESTED_PROJECT = new Set(["new", "reviewing", "approved", "posted", "interviewing"]);

/**
 * Which tabs of Tasks & projects the client gets. Tasks needs an active VA; Projects shows with the VA packages, or
 * while the client has project requests to follow (also before their first VA). `known` once both are loaded.
 */
export function useWorkTabs() {
  const vaWork = useHasVaWork();
  const showVaPackages = useShowPackages("va");
  const requests = useVaRequests();
  const hasProjects = (requests.data ?? []).some((r) => r.engagement === "project");
  const projects = showVaPackages || hasProjects;
  return { tasks: vaWork.has, projects, canRequestProject: showVaPackages, any: vaWork.has || projects, known: vaWork.known && !requests.isPending };
}

/** The tab showing: the one picked, if the client has it, else Tasks, else Projects. */
export function useWorkTab(): WorkTab {
  const { state } = usePortal();
  const tabs = useWorkTabs();
  if (state.workView === "projects" && tabs.projects) return "projects";
  if (state.workView === "tasks" && tabs.tasks) return "tasks";
  return tabs.tasks || !tabs.projects ? "tasks" : "projects";
}

/**
 * Client portal › VA › Tasks & projects. A task goes to a VA already on the team; a project is a one-time task the
 * team can't do, done by a different VA with the skills (not a daily VA unless the client asks and they agree).
 * A summary banner with the request buttons, a switch between the two, then the list.
 */
export function WorkSection() {
  const { update, readOnly } = usePortal();
  const tabs = useWorkTabs();
  const tab = useWorkTab();
  // The request forms open from the banner, the list bar or an empty list.
  const [asking, setAsking] = useState<WorkTab | null>(null);

  const tasks = useProjects().data ?? [];
  const projects = (useVaRequests().data ?? []).filter((r) => r.engagement === "project");
  const openTasks = tasks.filter(isOpenProject).length;
  const toReview = tasks.filter((t) => t.status === "review").length;
  const projectsRequested = projects.filter((r) => REQUESTED_PROJECT.has(r.status)).length;
  const projectsActive = projects.filter((r) => r.status === "matched").length;
  const projectsOpen = projectsRequested + projectsActive;
  const finished =
    tasks.filter((t) => t.status === "done").length + projects.filter((r) => (r.status === "inactive" || r.status === "closed") && r.matchedVa).length;

  const canTask = tabs.tasks && !readOnly;
  const canProject = tabs.canRequestProject && !readOnly;
  const ask = (t: WorkTab) => {
    update({ workView: t });
    setAsking(t);
  };
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const headline =
    tabs.tasks && openTasks
      ? `${plural(openTasks, "open task")}${projectsOpen ? ` · ${plural(projectsOpen, "project")}` : ""}`
      : projectsOpen
        ? `${plural(projectsOpen, "project")} underway`
        : "You’re all caught up";

  return (
    <div className="page-stack work">
      <section className="work-hero" aria-label="Your VA work">
        <div className="work-hero__main">
          <span className="work-hero__kicker">
            <span className="work-hero__pulse" aria-hidden="true" />
            YOUR VA WORK
          </span>
          <h2 className="work-hero__title">{headline}</h2>
          <p className="work-hero__text">
            {tabs.tasks
              ? "Give everyday work to the VAs on your team as tasks. For a one-time job they can’t do, request a project and GoCWGL brings in a VA with the right skills."
              : "Request a project for one-time work that needs specific skills. GoCWGL reviews it, quotes the payment and assigns a VA who has them."}
          </p>
          {(canTask || canProject) && (
            <div className="work-hero__actions">
              {canTask && (
                <Button variant="primary" size="lg" onClick={() => ask("tasks")}>
                  <Icon name="plus" size={15} strokeWidth={2.4} /> Request a task
                </Button>
              )}
              {canProject && (
                <button type="button" className="work-hero__ghost" onClick={() => ask("projects")}>
                  <Icon name="briefcase" size={15} /> Request a project
                </button>
              )}
            </div>
          )}
        </div>
        <dl className="work-hero__stats">
          {tabs.tasks && <HeroStat icon="clipboard" label="Open tasks" value={openTasks} />}
          {tabs.tasks && <HeroStat icon="eye" label="Ready for your review" value={toReview} accent={toReview > 0} />}
          <HeroStat icon="folder" label="Projects in progress" value={projectsActive} hint={projectsRequested ? `+ ${projectsRequested} requested` : undefined} />
          <HeroStat icon="circleCheck" label="Completed" value={finished} />
        </dl>
      </section>

      {tabs.tasks && tabs.projects && (
        <div className="work-switch" role="tablist" aria-label="Tasks or projects">
          <SwitchCard
            on={tab === "tasks"}
            onClick={() => update({ workView: "tasks" })}
            icon="clipboard"
            title="Tasks"
            text="Everyday work for the VAs already on your team."
            chip="Your current VAs"
            count={openTasks}
            countLabel="open"
          />
          <SwitchCard
            on={tab === "projects"}
            onClick={() => update({ workView: "projects" })}
            icon="briefcase"
            title="Projects"
            text="One-time work that needs specific skills, done by a different VA."
            chip="A new, skilled VA"
            tone="purple"
            count={projectsOpen}
            countLabel="active"
          />
        </div>
      )}

      <div className={`work-body is-${tab}`} key={tab}>
        {tab === "projects" ? (
          <VaProjectsSection asking={asking === "projects"} onAsk={(v) => setAsking(v ? "projects" : null)} canRequest={canProject} />
        ) : (
          <ProjectsSection requesting={asking === "tasks"} onRequest={(v) => setAsking(v ? "tasks" : null)} />
        )}
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value, hint, accent }: { icon: IconName; label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("work-hero__stat", accent && "is-accent")}>
      <dt>
        <Icon name={icon} size={14} /> {label}
      </dt>
      <dd>{value}</dd>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function SwitchCard({
  on,
  onClick,
  icon,
  title,
  text,
  chip,
  tone = "brand",
  count,
  countLabel,
}: {
  on: boolean;
  onClick: () => void;
  icon: IconName;
  title: string;
  text: string;
  chip: string;
  tone?: "brand" | "purple";
  count: number;
  countLabel: string;
}) {
  return (
    <button type="button" role="tab" aria-selected={on} className={cn("work-switch__card", `is-${tone}`, on && "is-on")} onClick={onClick}>
      <span className="work-switch__icon" aria-hidden="true">
        <Icon name={icon} size={20} strokeWidth={1.9} />
      </span>
      <span className="work-switch__body">
        <span className="work-switch__title">
          {title}
          <span className="work-switch__chip">{chip}</span>
        </span>
        <span className="work-switch__text">{text}</span>
      </span>
      <span className="work-switch__count">
        <b>{count}</b>
        {countLabel}
      </span>
    </button>
  );
}
