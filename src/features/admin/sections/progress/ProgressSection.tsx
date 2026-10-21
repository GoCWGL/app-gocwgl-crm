"use client";

import { useState, type FormEvent } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  FormError,
  Icon,
  LoadState,
  ProgressBar,
  SegmentedControl,
  Select,
  StatGrid,
  Textarea,
  Timeline,
  TimelineItem,
  type PhaseState,
} from "@/components/ui";
import { PROJECT_STATUSES, PROJECT_STATUS_TONES, type ProjectStatus } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { cn, copyToClipboard, slugify } from "@/lib/utils";
import type { ContactOut, PhaseIn, ProjectOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import {
  usePostProjectUpdate,
  useProject,
  useProjects,
  useSetProjectPhases,
  useStartProject,
  useToggleProjectTask,
  useUpdateProject,
} from "@/utils/hooks/useDelivery";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { AddChecklist, ChecklistOptions, type TemplateKey } from "./ChecklistPicker";

const statusTone = (status: string) => PROJECT_STATUS_TONES[status as ProjectStatus] ?? "neutral";

/** Build projects for paid clients, with an editable phase/task timeline. */
export function ProgressSection() {
  const { state, update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const projects = useProjects();
  const paid = useAllContacts({ stage: "paid" });
  const start = useStartProject();
  const [template, setTemplate] = useState<TemplateKey>("system");
  const summaries = projects.data ?? [];
  const summaryOf = (id: string) => summaries.find((p) => p.contactId === id);
  // Paid clients, plus anyone who already has a build (e.g. a client who later stopped paying).
  const paidClients = paid.data ?? [];
  const extra = summaries.filter((p) => !paidClients.some((c) => c.id === p.contactId));
  const rows: Array<{ id: string; name: string; email: string; contact?: ContactOut }> = [
    ...paidClients.map((c) => ({ id: c.id, name: contactName(c), email: c.email, contact: c })),
    ...extra.map((p) => ({ id: p.contactId, name: p.clientName || p.company, email: "" })),
  ];
  const selected = rows.find((c) => c.id === state.projectId) ?? rows[0];
  const selectedSummary = selected ? summaryOf(selected.id) : undefined;
  const project = useProject(selectedSummary ? selected.id : "");

  const active = summaries.filter((p) => p.status !== "Launched");
  const avg = active.length ? Math.round(active.reduce((n, p) => n + p.progress, 0) / active.length) : 0;

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Builds in progress", value: active.length, tone: "cyan" },
          { label: "Average progress", value: `${avg}%`, tone: "purple" },
          { label: "At risk", value: summaries.filter((p) => p.status === "At risk").length, tone: "orange" },
          { label: "Launched", value: summaries.filter((p) => p.status === "Launched").length, tone: "green" },
        ]}
      />

      <LoadState query={paid} isEmpty={!rows.length} empty="No paid clients yet. Builds start once a client pays.">
        <div className="split">
          <section className="split__side stack stack--10 project-list" aria-label="Client projects">
            <span className="kicker">PAID CLIENTS · {paidClients.length}</span>
            {rows.map((c) => {
              const p = summaryOf(c.id);
              const status = p ? p.status : "Not started";
              const pct = p ? p.progress : 0;
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
                      <span className="text-small">{p ? `${p.package}${p.dueDate ? ` · due ${formatShort(p.dueDate)}` : ""}` : "No build started"}</span>
                    </div>
                    <span className={cn("project-list__pct", pct === 100 && "u-green")}>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} variant="sweep" size="md" />
                  <Badge tone={statusTone(status)}>{status}</Badge>
                </button>
              );
            })}
          </section>

          {selected && !selectedSummary && (
            <section className="split__main empty-state project-empty">
              <h2 className="modal__title">No build started for {selected.name} yet</h2>
              <p className="text-muted">Pick what you are building. Each checklist lists everything to check; you can rename phases and add tasks after.</p>
              {canWrite && <ChecklistOptions value={template} onChange={setTemplate} />}
              <FormError error={start.error} />
              {canWrite && (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={start.isPending}
                  onClick={() => start.mutate({ contactId: selected.id, body: { template } })}
                >
                  {start.isPending ? "Starting…" : "Start build"}
                </Button>
              )}
            </section>
          )}

          {selected && selectedSummary && (
            <LoadState query={project} loadingText="Loading build…">
              {project.data && (
                <ProjectDetails key={selected.id} clientId={selected.id} name={selected.name} email={selected.email} project={project.data} canWrite={canWrite} />
              )}
            </LoadState>
          )}
        </div>
      </LoadState>
    </div>
  );
}

/** The phases as the API's PUT body (keeps ids so tasks keep their history). */
const phasesIn = (phases: ProjectOut["phases"]): PhaseIn[] =>
  phases.map((ph) => ({ id: ph.id, name: ph.name, tasks: ph.tasks.map((t) => ({ id: t.id, text: t.text, done: t.done })) }));

function ProjectDetails({
  clientId,
  name,
  email,
  project,
  canWrite,
}: {
  clientId: string;
  name: string;
  email: string;
  project: ProjectOut;
  canWrite: boolean;
}) {
  const { emailContact } = useAdmin();
  const updateProject = useUpdateProject();
  const setPhasesMutation = useSetProjectPhases();
  const toggleTask = useToggleProjectTask();
  const postUpdateMutation = usePostProjectUpdate();
  const [view, setView] = useState<"admin" | "client">(canWrite ? "admin" : "client");
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [updateText, setUpdateText] = useState("");
  const [copied, setCopied] = useState(false);

  const isAdmin = view === "admin" && canWrite;
  const all = project.phases.reduce((n, ph) => n + ph.tasks.length, 0);
  const done = project.phases.reduce((n, ph) => n + ph.tasks.filter((t) => t.done).length, 0);
  // The percentage is the API's own `progress`.
  const progress = { all, done, percent: project.progress };
  const firstOpen = project.phases.findIndex((ph) => ph.tasks.some((t) => !t.done));
  const phasesDone = project.phases.filter((ph) => ph.tasks.length && ph.tasks.every((t) => t.done)).length;
  const link = `progress.[yourdomain].com/${slugify(name)}`;
  const error = updateProject.error ?? setPhasesMutation.error ?? toggleTask.error ?? postUpdateMutation.error;

  const setPhases = (phases: PhaseIn[]) => setPhasesMutation.mutate({ contactId: clientId, phases });

  const addTask = (e: FormEvent, i: number) => {
    e.preventDefault();
    const text = (drafts[i] ?? "").trim();
    if (!text) return;
    setDrafts({ ...drafts, [i]: "" });
    setPhases(phasesIn(project.phases).map((ph, k) => (k === i ? { ...ph, tasks: [...ph.tasks, { text, done: false }] } : ph)));
  };

  const postUpdate = (e: FormEvent) => {
    e.preventDefault();
    const text = updateText.trim();
    if (!text) return;
    postUpdateMutation.mutate({ contactId: clientId, text }, { onSuccess: () => setUpdateText("") });
  };

  return (
    <section className="split__main stack stack--14">
      <div className="build-hero">
        <div className="cluster cluster--between">
          <div className="stack stack--4">
            <span className="kicker">{isAdmin ? `SYSTEM BUILD${email ? ` · ${email}` : ""}` : "YOUR SYSTEM BUILD"}</span>
            <h2 className="project-title">{name}</h2>
            <span className="text-muted">
              {project.package} · Started {formatShort(project.startDate)} · Target launch {formatShort(project.dueDate, "not set")}
            </span>
          </div>
          {canWrite && (
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
          )}
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
                disabled={updateProject.isPending}
                onChange={(e) => updateProject.mutate({ contactId: clientId, body: { status: e.target.value as ProjectStatus } })}
              />
            </Field>
          ) : (
            <Badge tone={statusTone(project.status)} size="lg">
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
                emailContact(clientId, {
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
      <FormError error={error} />

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
              <TimelineItem key={ph.id} state={state} mark={isDone ? "✓" : String(i + 1)} last={i === project.phases.length - 1}>
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
                      <div key={task.id} className={cn("task-row", task.done && "task-row--done")}>
                        {isAdmin ? (
                          <input
                            type="checkbox"
                            aria-label={task.text}
                            checked={task.done}
                            disabled={toggleTask.isPending}
                            onChange={() => toggleTask.mutate({ contactId: clientId, taskId: task.id, done: !task.done })}
                          />
                        ) : (
                          <span className={cn("task-row__check", task.done && "task-row__check--done")} aria-hidden="true">
                            {task.done ? "✓" : ""}
                          </span>
                        )}
                        <span className="task-row__text">{task.text}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            className="task-row__delete"
                            aria-label={`Delete task ${task.text}`}
                            disabled={setPhasesMutation.isPending}
                            onClick={() =>
                              setPhases(phasesIn(project.phases).map((x, xi) => (xi === i ? { ...x, tasks: x.tasks.filter((_, yk) => yk !== k) } : x)))
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
                        <Button type="submit" variant="outline" size="sm" disabled={setPhasesMutation.isPending}>
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
        {isAdmin && <AddChecklist clientId={clientId} />}
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
            <Button type="submit" variant="primary" className="u-self-end" disabled={postUpdateMutation.isPending}>
              {postUpdateMutation.isPending ? "Posting…" : "Post update"}
            </Button>
          </form>
        )}
        <div>
          {project.updates.length === 0 && <p className="text-muted">No updates posted yet.</p>}
          {project.updates.map((u) => (
            <div className="update-row" key={u.id}>
              <span className="update-row__dot" aria-hidden="true" />
              <div className="stack stack--2">
                <span className="update-row__date">
                  {formatShort(u.createdAt)}
                  {u.author && ` · ${u.author}`}
                </span>
                <span className="text-body u-ink">{u.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
