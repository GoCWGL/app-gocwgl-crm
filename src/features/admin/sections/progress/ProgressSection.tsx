"use client";

import { useState, type FormEvent } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  FormError,
  Icon,
  IconButton,
  Input,
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
import type { PhaseIn, ProjectOut, ProjectSummary } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import {
  usePostProjectUpdate,
  useProject,
  useCrmRequests,
  useProjects,
  useSetProjectPhases,
  useStartProject,
  useToggleProjectTask,
  useUpdateProject,
} from "@/utils/hooks/useDelivery";
import { useAdminFunnels } from "@/utils/hooks/usePortal";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { AddChecklist, ChecklistOptions, type TemplateKey } from "./ChecklistPicker";
import { DeleteBuildModal } from "./DeleteBuildModal";
import { CrmRequestsPanel } from "./CrmRequestsPanel";
import { FunnelRequestsPanel, openFunnelRequests } from "./FunnelRequestsPanel";

const statusTone = (status: string) => PROJECT_STATUS_TONES[status as ProjectStatus] ?? "neutral";

/** One card on the left: a build, or a paid client who has no build yet. */
type Row = {
  key: string;
  clientId: string;
  name: string;
  email: string;
  build?: ProjectSummary;
};

/** Builds for clients (a client can have several), with an editable phase/task timeline. */
export function ProgressSection() {
  const { state, update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const projects = useProjects();
  const paid = useAllContacts({ stage: "paid" });
  const start = useStartProject();
  const newRequests = (useCrmRequests().data ?? []).filter((r) => r.status === "new").length;
  // Funnel requests waiting on you: paid and not built yet, or still awaiting payment or a quote.
  const funnelRequests = openFunnelRequests(useAdminFunnels().data ?? []).filter((f) => !f.projectId).length;
  const [template, setTemplate] = useState<TemplateKey>("foundation");
  const summaries = projects.data ?? [];
  const paidClients = paid.data ?? [];
  const emailOf = (id: string) => paidClients.find((c) => c.id === id)?.email ?? "";
  // Every build (oldest first per client), plus paid clients who have none yet.
  const rows: Row[] = [
    ...summaries.map((p) => ({
      key: p.id,
      clientId: p.contactId,
      name: p.clientName || p.company,
      email: emailOf(p.contactId),
      build: p,
    })),
    ...paidClients
      .filter((c) => !summaries.some((p) => p.contactId === c.id))
      .map((c): Row => ({
        key: c.id,
        clientId: c.id,
        name: contactName(c),
        email: c.email,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name) || (a.build?.startDate ?? "").localeCompare(b.build?.startDate ?? ""));
  const selected = rows.find((r) => r.key === state.projectId) ?? rows[0];
  const project = useProject(selected?.build?.id ?? "");

  const active = summaries.filter((p) => p.status !== "Launched");
  const avg = active.length ? Math.round(active.reduce((n, p) => n + p.progress, 0) / active.length) : 0;

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Builds in progress", value: active.length, tone: "cyan" },
          { label: "Average progress", value: `${avg}%`, tone: "purple" },
          {
            label: "At risk",
            value: summaries.filter((p) => p.status === "At risk").length,
            tone: "orange",
          },
          {
            label: "Launched",
            value: summaries.filter((p) => p.status === "Launched").length,
            tone: "green",
          },
        ]}
      />

      <SegmentedControl
        kind="tabs"
        label="Build progress"
        value={state.progressView}
        onChange={(progressView) => update({ progressView })}
        options={[
          { value: "builds", label: `Builds · ${summaries.length}` },
          { value: "funnels", label: funnelRequests ? `Funnel requests · ${funnelRequests}` : "Funnel requests" },
          { value: "requests", label: newRequests ? `CRM requests · ${newRequests} new` : "CRM requests" },
        ]}
      />

      {state.progressView === "funnels" ? (
        <FunnelRequestsPanel canWrite={canWrite} />
      ) : state.progressView === "requests" ? (
        <CrmRequestsPanel canWrite={canWrite} />
      ) : (
        <LoadState query={paid} isEmpty={!rows.length} empty="No builds yet. They show up here once a client pays, or start one with New build.">
          <div className="split">
            <section className="split__side stack stack--10 project-list" aria-label="Builds">
              <span className="kicker">BUILDS · {summaries.length}</span>
              {rows.map((r) => {
                const p = r.build;
                const status = p ? p.status : "Not started";
                const pct = p ? p.progress : 0;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className="card-button"
                    aria-pressed={selected?.key === r.key}
                    onClick={() => update({ projectId: r.key })}
                  >
                    <div className="cluster cluster--nowrap">
                      <Avatar name={r.name} tone={avatarTone(r.clientId)} size="md" />
                      <div className="stack stack--2 u-grow">
                        <span className="text-strong">{r.name}</span>
                        <span className="text-small">
                          {p ? `${p.package}${p.dueDate ? ` · due ${formatShort(p.dueDate)}` : ""}` : "No build started"}
                        </span>
                      </div>
                      <span className={cn("project-list__pct", pct === 100 && "u-green")}>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} variant="sweep" size="md" />
                    <Badge tone={statusTone(status)}>{status}</Badge>
                  </button>
                );
              })}
            </section>

            {selected && !selected.build && (
              <section className="split__main empty-state project-empty">
                <h2 className="modal__title">No build started for {selected.name} yet</h2>
                <p className="text-muted">
                  Pick what you are building. Each checklist lists everything to check; you can rename phases and add tasks after.
                </p>
                {canWrite && <ChecklistOptions value={template} onChange={setTemplate} />}
                <FormError error={start.error} />
                {canWrite && (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ contactId: selected.clientId, template }, { onSuccess: (p) => update({ projectId: p.id }) })}
                  >
                    {start.isPending ? "Starting…" : "Start build"}
                  </Button>
                )}
              </section>
            )}

            {selected?.build && (
              <LoadState query={project} loadingText="Loading build…">
                {project.data && (
                  <ProjectDetails
                    key={project.data.id}
                    clientId={selected.clientId}
                    name={selected.name}
                    email={selected.email}
                    otherBuilds={summaries.filter((p) => p.contactId === selected.clientId).length - 1}
                    project={project.data}
                    canWrite={canWrite}
                  />
                )}
              </LoadState>
            )}
          </div>
        </LoadState>
      )}
    </div>
  );
}

/** The phases as the API's PUT body (keeps ids so tasks keep their history). */
const phasesIn = (phases: ProjectOut["phases"]): PhaseIn[] =>
  phases.map((ph) => ({
    id: ph.id,
    name: ph.name,
    tasks: ph.tasks.map((t) => ({ id: t.id, text: t.text, done: t.done })),
  }));

function ProjectDetails({
  clientId,
  name,
  email,
  otherBuilds,
  project,
  canWrite,
}: {
  clientId: string;
  name: string;
  email: string;
  /** How many other builds this client has. */
  otherBuilds: number;
  project: ProjectOut;
  canWrite: boolean;
}) {
  const { update } = useAdmin();
  const updateProject = useUpdateProject();
  const setPhasesMutation = useSetProjectPhases();
  const toggleTask = useToggleProjectTask();
  const postUpdateMutation = usePostProjectUpdate();
  const [view, setView] = useState<"admin" | "client">(canWrite ? "admin" : "client");
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [updateText, setUpdateText] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const isAdmin = view === "admin" && canWrite;
  const all = project.phases.reduce((n, ph) => n + ph.tasks.length, 0);
  const done = project.phases.reduce((n, ph) => n + ph.tasks.filter((t) => t.done).length, 0);
  // The percentage is the API's own `progress`.
  const progress = { all, done, percent: project.progress };
  const firstOpen = project.phases.findIndex((ph) => ph.tasks.some((t) => !t.done));
  const phasesDone = project.phases.filter((ph) => ph.tasks.length && ph.tasks.every((t) => t.done)).length;
  const link = `progress.[yourdomain].com/${slugify(name)}`;
  const error = updateProject.error ?? setPhasesMutation.error ?? toggleTask.error ?? postUpdateMutation.error;

  const setPhases = (phases: PhaseIn[]) => setPhasesMutation.mutate({ projectId: project.id, phases });

  const addTask = (e: FormEvent, i: number) => {
    e.preventDefault();
    const text = (drafts[i] ?? "").trim();
    if (!text) return;
    setDrafts({ ...drafts, [i]: "" });
    setPhases(phasesIn(project.phases).map((ph, k) => (k === i ? { ...ph, tasks: [...ph.tasks, { text, done: false }] } : ph)));
  };

  // The build's name is what the client sees as the title in their portal.
  const saveName = (e: FormEvent) => {
    e.preventDefault();
    const pkg = nameDraft.trim();
    if (!pkg || pkg === project.package) return setRenaming(false);
    updateProject.mutate(
      { projectId: project.id, body: { package: pkg } },
      {
        onSuccess: () => {
          setRenaming(false);
          update({ toast: `Build renamed to “${pkg}”.` });
        },
      },
    );
  };

  const postUpdate = (e: FormEvent) => {
    e.preventDefault();
    const text = updateText.trim();
    if (!text) return;
    postUpdateMutation.mutate({ projectId: project.id, text }, { onSuccess: () => setUpdateText("") });
  };

  return (
    <section className="split__main stack stack--14">
      <div className="build-hero">
        <div className="cluster cluster--between">
          <div className="stack stack--4">
            <span className="kicker">{isAdmin ? `${name.toUpperCase()}${email ? ` · ${email}` : ""}` : "YOUR BUILD"}</span>
            {renaming ? (
              <form className="cluster cluster--8 cluster--nowrap" onSubmit={saveName}>
                <Input
                  id="pg-name"
                  aria-label="Build name"
                  className="project-title__input"
                  maxLength={120}
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
                />
                <Button type="submit" variant="primary" size="sm" disabled={!nameDraft.trim() || updateProject.isPending}>
                  {updateProject.isPending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="cluster cluster--8 cluster--nowrap">
                <h2 className="project-title">{project.package}</h2>
                {isAdmin && (
                  <IconButton
                    label="Rename build"
                    size="sm"
                    ghost
                    onClick={() => {
                      setNameDraft(project.package);
                      setRenaming(true);
                    }}
                  >
                    <Icon name="edit" size={14} />
                  </IconButton>
                )}
              </div>
            )}
            <span className="text-muted">
              Started {formatShort(project.startDate)} · Target launch {formatShort(project.dueDate, "not set")}
              {otherBuilds > 0 && ` · ${otherBuilds} other ${otherBuilds === 1 ? "build" : "builds"}`}
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
            <>
              {/* Where the client finds this build in their portal: the Funnels page or the CRM page. */}
              <Field label={<span className="kicker kicker--sm">SHOWS UNDER</span>} htmlFor="pg-kind">
                <Select
                  id="pg-kind"
                  size="sm"
                  value={project.kind}
                  options={[
                    { value: "funnel", label: "Funnels" },
                    { value: "crm", label: "CRM" },
                  ]}
                  disabled={updateProject.isPending}
                  onChange={(e) =>
                    updateProject.mutate({
                      projectId: project.id,
                      body: { kind: e.target.value as ProjectOut["kind"] },
                    })
                  }
                />
              </Field>
              <Field label={<span className="kicker kicker--sm">STATUS</span>} htmlFor="pg-status">
                <Select
                  id="pg-status"
                  size="sm"
                  className="u-strong"
                  value={project.status}
                  options={PROJECT_STATUSES}
                  disabled={updateProject.isPending}
                  onChange={(e) =>
                    updateProject.mutate({
                      projectId: project.id,
                      body: { status: e.target.value as ProjectStatus },
                    })
                  }
                />
              </Field>
            </>
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
            <Button variant="outline" size="sm" aria-haspopup="dialog" onClick={() => update({ newBuildOpen: true, newBuildContactId: clientId })}>
              + Another build for {name}
            </Button>
            <Button variant="danger" size="sm" aria-haspopup="dialog" onClick={() => setConfirmDelete(true)}>
              Delete build
            </Button>
          </div>
        )}
        {confirmDelete && <DeleteBuildModal name={name} project={project} otherBuilds={otherBuilds} onClose={() => setConfirmDelete(false)} />}
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
                  <Icon
                    name="chevronRight"
                    size={14}
                    strokeWidth={2.2}
                    className={cn("phase-toggle__chevron", expanded && "phase-toggle__chevron--open")}
                  />
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
                            onChange={() =>
                              toggleTask.mutate({
                                projectId: project.id,
                                taskId: task.id,
                                done: !task.done,
                              })
                            }
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
                              setPhases(
                                phasesIn(project.phases).map((x, xi) =>
                                  xi === i
                                    ? {
                                        ...x,
                                        tasks: x.tasks.filter((_, yk) => yk !== k),
                                      }
                                    : x,
                                ),
                              )
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
        {isAdmin && <AddChecklist projectId={project.id} />}
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
