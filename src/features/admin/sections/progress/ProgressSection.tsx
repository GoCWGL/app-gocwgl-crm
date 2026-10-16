"use client";

import { useState, type FormEvent } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Icon,
  ProgressBar,
  SegmentedControl,
  Select,
  StatGrid,
  Textarea,
  Timeline,
  TimelineItem,
  type PhaseState,
} from "@/components/ui";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_TONES,
  PROJECT_TEMPLATE,
  type Contact,
  type Project,
  type ProjectStatus,
} from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";
import { avatarTone } from "@/lib/tones";
import { cn, copyToClipboard, slugify } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

function progressOf(p: Project) {
  const all = p.phases.reduce((n, ph) => n + ph.tasks.length, 0);
  const done = p.phases.reduce((n, ph) => n + ph.tasks.filter((t) => t.done).length, 0);
  return { all, done, percent: all ? Math.round((done / all) * 100) : 0 };
}

/** Build projects for paid clients, with an editable phase/task timeline. */
export function ProgressSection() {
  const { state, update } = useAdmin();
  const { projects } = state;
  const paidClients = state.contacts.filter((c) => c.stage === "paid");
  const selected = paidClients.find((c) => c.id === state.projectId) ?? paidClients[0];
  const project = selected ? projects[selected.id] : undefined;

  const active = paidClients.filter((c) => projects[c.id] && projects[c.id].status !== "Launched");
  const avg = active.length ? Math.round(active.reduce((n, c) => n + progressOf(projects[c.id]).percent, 0) / active.length) : 0;

  const startBuild = (c: Contact) =>
    update((s) => ({
      projects: {
        ...s.projects,
        [c.id]: {
          package: "Revenue Engine System",
          start: TODAY_SHORT,
          due: "Nov 11",
          status: "On track",
          phases: PROJECT_TEMPLATE.map((ph) => ({ name: ph.name, tasks: ph.tasks.map((t) => ({ t, done: false })) })),
          updates: [],
        },
      },
    }));

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Builds in progress", value: active.length, tone: "cyan" },
          { label: "Average progress", value: `${avg}%`, tone: "purple" },
          { label: "At risk", value: paidClients.filter((c) => projects[c.id]?.status === "At risk").length, tone: "orange" },
          { label: "Launched", value: paidClients.filter((c) => projects[c.id]?.status === "Launched").length, tone: "green" },
        ]}
      />

      <div className="split">
        <section className="split__side stack stack--10 project-list" aria-label="Client projects">
          <span className="kicker">PAID CLIENTS · {paidClients.length}</span>
          {paidClients.map((c) => {
            const p = projects[c.id];
            const status = p ? p.status : "Not started";
            const pct = p ? progressOf(p).percent : 0;
            return (
              <button
                key={c.id}
                type="button"
                className="card-button"
                aria-pressed={selected?.id === c.id}
                onClick={() => update({ projectId: c.id })}
              >
                <div className="cluster cluster--nowrap">
                  <Avatar name={c.name} tone={avatarTone(c.id)} size="md" />
                  <div className="stack stack--2 u-grow">
                    <span className="text-strong">{c.name}</span>
                    <span className="text-small">{p ? `${p.package} · due ${p.due}` : "No build started"}</span>
                  </div>
                  <span className={cn("project-list__pct", pct === 100 && "u-green")}>{pct}%</span>
                </div>
                <ProgressBar value={pct} variant="sweep" size="md" />
                <Badge tone={PROJECT_STATUS_TONES[status]}>{status}</Badge>
              </button>
            );
          })}
        </section>

        {selected && !project && (
          <section className="split__main empty-state project-empty">
            <h2 className="modal__title">No build started for {selected.name} yet</h2>
            <p className="text-muted">Start a project from the standard system template. You can rename phases and add tasks after.</p>
            <Button variant="primary" size="lg" onClick={() => startBuild(selected)}>
              Start system build
            </Button>
          </section>
        )}

        {selected && project && <ProjectDetails key={selected.id} client={selected} project={project} />}
      </div>
    </div>
  );
}

function ProjectDetails({ client, project }: { client: Contact; project: Project }) {
  const { update, emailContact } = useAdmin();
  const [view, setView] = useState<"admin" | "client">("admin");
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [updateText, setUpdateText] = useState("");
  const [copied, setCopied] = useState(false);

  const isAdmin = view === "admin";
  const progress = progressOf(project);
  const firstOpen = project.phases.findIndex((ph) => ph.tasks.some((t) => !t.done));
  const phasesDone = project.phases.filter((ph) => ph.tasks.length && ph.tasks.every((t) => t.done)).length;
  const link = `progress.[yourdomain].com/${slugify(client.name)}`;

  const save = (patch: Partial<Project>) =>
    update((s) => ({ projects: { ...s.projects, [client.id]: { ...s.projects[client.id], ...patch } } }));
  const setPhases = (phases: Project["phases"]) => save({ phases });

  const addTask = (e: FormEvent, i: number) => {
    e.preventDefault();
    const text = (drafts[i] ?? "").trim();
    if (!text) return;
    setDrafts({ ...drafts, [i]: "" });
    setPhases(project.phases.map((ph, k) => (k === i ? { ...ph, tasks: [...ph.tasks, { t: text, done: false }] } : ph)));
  };

  const postUpdate = (e: FormEvent) => {
    e.preventDefault();
    const text = updateText.trim();
    if (!text) return;
    setUpdateText("");
    save({ updates: [{ date: TODAY_SHORT, text }, ...project.updates] });
  };

  return (
    <section className="split__main stack stack--14">
      <div className="build-hero">
        <div className="cluster cluster--between">
          <div className="stack stack--4">
            <span className="kicker">{isAdmin ? `SYSTEM BUILD · ${client.email}` : "YOUR SYSTEM BUILD"}</span>
            <h2 className="project-title">{client.name}</h2>
            <span className="text-muted">
              {project.package} · Started {project.start} · Target launch {project.due}
            </span>
          </div>
          <SegmentedControl
            variant="soft"
            size="sm"
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "admin", label: "Edit" },
              { value: "client", label: "Client view" },
            ]}
          />
        </div>
        <div className="build-hero__progress">
          <span className="build-hero__pct">{progress.percent}%</span>
          <div className="stack stack--6 u-grow">
            <ProgressBar value={progress.percent} variant="glow" size="lg" label="Build progress" />
            <span className="text-small">
              {progress.done} of {progress.all} tasks done · {phasesDone} of {project.phases.length} phases complete
            </span>
          </div>
          {isAdmin ? (
            <Field label={<span className="kicker kicker--sm">STATUS</span>} htmlFor="pg-status">
              <Select
                id="pg-status"
                size="sm"
                className="u-strong"
                value={project.status}
                options={PROJECT_STATUSES}
                onChange={(e) => save({ status: e.target.value as ProjectStatus })}
              />
            </Field>
          ) : (
            <Badge tone={PROJECT_STATUS_TONES[project.status]} size="lg">
              {project.status}
            </Badge>
          )}
        </div>
        {isAdmin && (
          <div className="cluster project-share">
            <span className="project-share__link">{link}</span>
            <span className="u-spacer" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                copyToClipboard(`https://${link}`);
                setCopied(true);
              }}
            >
              {copied ? "Link copied" : "Copy client link"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                emailContact(client.id, {
                  subject: `Your system build is ${progress.percent}% complete`,
                  body: `Hi {first_name},\n\nQuick update on your system build: we are ${progress.percent}% done (${progress.done} of ${progress.all} tasks).\n\nSee the full progress here: https://${link}\n\nTalk soon,\n[Your Name]`,
                })
              }
            >
              Email progress to client
            </Button>
          </div>
        )}
      </div>

      <div className="stack stack--10">
        <span className="kicker">BUILD PHASES</span>
        <Timeline>
          {project.phases.map((ph, i) => {
            const done = ph.tasks.filter((t) => t.done).length;
            const isDone = ph.tasks.length > 0 && done === ph.tasks.length;
            const isCurrent = i === firstOpen;
            const state: PhaseState = isDone ? "done" : isCurrent ? "current" : "upcoming";
            const label = isDone ? "Done" : isCurrent || done > 0 ? "In progress" : "Up next";
            const expanded = !!open[i];
            return (
              <TimelineItem key={i} state={state} mark={isDone ? "✓" : String(i + 1)} last={i === project.phases.length - 1}>
                <button type="button" className="phase-toggle" aria-expanded={expanded} onClick={() => setOpen({ ...open, [i]: !expanded })}>
                  <span className="stack stack--2 u-grow">
                    <span className="text-strong">{ph.name}</span>
                    <span className="text-small">
                      {done} / {ph.tasks.length} tasks
                    </span>
                  </span>
                  <Badge tone={isDone ? "green" : label === "In progress" ? "brand" : "neutral"}>{label}</Badge>
                  <Icon name="chevronRight" size={14} strokeWidth={2.2} className={cn("phase-toggle__chevron", expanded && "phase-toggle__chevron--open")} />
                </button>
                <ProgressBar
                  value={ph.tasks.length ? (done / ph.tasks.length) * 100 : 0}
                  variant={isDone ? "solid" : "sweep"}
                  tone={isDone ? "green" : undefined}
                  size="sm"
                />
                {expanded && (
                  <div className="stack stack--4">
                    {ph.tasks.map((task, k) => (
                      <div key={k} className={cn("task-row", task.done && "task-row--done")}>
                        {isAdmin ? (
                          <input
                            type="checkbox"
                            aria-label={task.t}
                            checked={task.done}
                            onChange={() =>
                              setPhases(
                                project.phases.map((x, xi) =>
                                  xi === i ? { ...x, tasks: x.tasks.map((y, yk) => (yk === k ? { ...y, done: !y.done } : y)) } : x,
                                ),
                              )
                            }
                          />
                        ) : (
                          <span className={cn("task-row__check", task.done && "task-row__check--done")} aria-hidden="true">
                            {task.done ? "✓" : ""}
                          </span>
                        )}
                        <span className="task-row__text">{task.t}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            className="task-row__delete"
                            aria-label={`Delete task ${task.t}`}
                            onClick={() =>
                              setPhases(project.phases.map((x, xi) => (xi === i ? { ...x, tasks: x.tasks.filter((_, yk) => yk !== k) } : x)))
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {isAdmin && (
                      <form className="cluster cluster--8 cluster--nowrap" onSubmit={(e) => addTask(e, i)}>
                        <input
                          className="input input--sm task-input"
                          aria-label={`New task for ${ph.name}`}
                          placeholder="Add a task…"
                          value={drafts[i] ?? ""}
                          onChange={(e) => setDrafts({ ...drafts, [i]: e.target.value })}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Add
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </TimelineItem>
            );
          })}
        </Timeline>
      </div>

      <div className="card">
        <span className="kicker">PROGRESS UPDATES</span>
        {isAdmin && (
          <form className="stack stack--8" onSubmit={postUpdate}>
            <Field label="Post an update your client will see" htmlFor="pg-update">
              <Textarea
                id="pg-update"
                rows={3}
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="e.g. Your landing page is live in preview. Next up: connecting the pipeline."
              />
            </Field>
            <Button type="submit" variant="primary" className="u-self-end">
              Post update
            </Button>
          </form>
        )}
        <div>
          {project.updates.map((u, i) => (
            <div className="update-row" key={i}>
              <span className="update-row__dot" aria-hidden="true" />
              <div className="stack stack--2">
                <span className="update-row__date">{u.date}</span>
                <span className="text-body u-ink">{u.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
