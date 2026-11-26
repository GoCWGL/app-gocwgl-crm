"use client";

import { useState } from "react";
import { Button, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useProjects, useVaRequests } from "@/utils/hooks/useClientWork";
import { isOpenProject } from "../lib/projects";
import { useHasVaWork, useShowPackages } from "../lib/vaAccess";
import { usePortal } from "../state/PortalContext";
import { WorkBoard } from "./WorkBoard";

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
 * A slim summary with the request buttons, then both on one board.
 */
export function WorkSection() {
  const { readOnly } = usePortal();
  const tabs = useWorkTabs();
  // The request forms open from the banner, the list bar or an empty list.
  const [asking, setAsking] = useState<WorkTab | null>(null);

  const tasks = useProjects().data ?? [];
  const projects = (useVaRequests().data ?? []).filter((r) => r.engagement === "project");
  const openTasks = tasks.filter(isOpenProject).length;
  const toReview = tasks.filter((t) => t.status === "review").length;
  const projectsRequested = projects.filter((r) => REQUESTED_PROJECT.has(r.status)).length;
  const projectsActive = projects.filter((r) => r.status === "matched").length;
  const finished =
    tasks.filter((t) => t.status === "done").length + projects.filter((r) => (r.status === "inactive" || r.status === "closed") && r.matchedVa).length;

  const canTask = tabs.tasks && !readOnly;
  const canProject = tabs.canRequestProject && !readOnly;
  const ask = (t: WorkTab) => setAsking(t);

  return (
    <div className="page-stack work">
      <section className="work-summary" aria-label="Your VA work at a glance">
        <dl className="work-summary__stats">
          {tabs.tasks && <SummaryStat icon="clipboard" tone="brand" label="Open tasks" value={openTasks} hint="With your VAs" />}
          {tabs.tasks && (
            <SummaryStat
              icon="eye"
              tone="sky"
              label="Waiting on you"
              value={toReview}
              hint={toReview ? "Ready to check" : "Nothing to check"}
              accent={toReview > 0}
            />
          )}
          <SummaryStat
            icon="briefcase"
            tone="purple"
            label="Projects underway"
            value={projectsActive}
            hint={projectsRequested ? `+${projectsRequested} finding a VA` : "One-time work"}
          />
          <SummaryStat icon="circleCheck" tone="green" label="Completed" value={finished} hint="All time" />
        </dl>
        {(canTask || canProject) && (
          <div className="work-summary__actions">
            {canTask && (
              <Button variant="primary" onClick={() => ask("tasks")}>
                <Icon name="plus" size={15} strokeWidth={2.4} /> New task
              </Button>
            )}
            {canProject && (
              <button type="button" className="work-summary__project" onClick={() => ask("projects")}>
                <Icon name="briefcase" size={15} /> New project
              </button>
            )}
          </div>
        )}
      </section>

      <WorkBoard asking={asking} onAsk={setAsking} hasTasks={tabs.tasks} canRequestProject={canProject} />
    </div>
  );
}

function SummaryStat({
  icon,
  tone,
  label,
  value,
  hint,
  accent,
}: {
  icon: IconName;
  tone: "brand" | "sky" | "purple" | "green";
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("work-stat", `is-${tone}`, accent && "is-accent")}>
      <span className="work-stat__icon" aria-hidden="true">
        <Icon name={icon} size={16} strokeWidth={2} />
      </span>
      <span className="work-stat__text">
        <dt>{label}</dt>
        <dd>{value}</dd>
        <span className="work-stat__hint">{hint}</span>
      </span>
    </div>
  );
}
