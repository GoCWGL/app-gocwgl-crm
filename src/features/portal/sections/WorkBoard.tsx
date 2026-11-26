"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Avatar, Button, ConfirmDialog, Field, FormError, GripIcon, Icon, Input, LoadState, Modal, SegmentedControl, Textarea } from "@/components/ui";
import { errorMessage } from "@/utils/errors";
import { avatarTone } from "@/lib/tones";
import type { ClientProjectOut, ProjectClientUpdate, TeamVa, VaRequestOut } from "@/utils/api/models";
import { useSession } from "@/utils/auth/session";
import {
  useMarkProjectRead,
  usePostProjectMessage,
  useProjectMessages,
  useProjects,
  useRequestProject,
  useUpdateProject,
  usePlaceProject,
  useVaRequests,
  useVaTeam,
} from "@/utils/hooks/useClientWork";
import { assigneeDetail, assigneeLabel, isOpenProject, PRIORITY, PROJECT_STATUS, vaNames, type ProjectPriority, type ProjectStatus } from "../lib/projects";
import { assignmentOf, VaAssign, type VaAssignment } from "../components/VaPicker";
import { LinkInputs } from "../components/TaskLinks";
import { SubtaskDraftList } from "../components/TaskSubtasks";
import { TaskBoard, type BoardCard } from "../components/TaskBoard";
import { VaRequestModal } from "../components/VaRequestModal";
import { TaskConversation } from "../components/TaskConversation";
import { subtaskActivity } from "../components/CommentsActivity";
import { useConfirmClose } from "../components/ConfirmClose";
import { NotMoved, useConfirmMove } from "../components/ConfirmMove";
import { TaskBar, TaskFilter, TaskSearch, TaskTabs, taskText } from "../components/TaskFilters";
import { WorkEmpty } from "../components/WorkEmpty";
import { TaskSheet, TaskStatus, type TaskEdits } from "../components/TaskSheet";
import { useProjectSubtasks } from "@/utils/hooks/useSubtasks";
import { usePortal } from "../state/PortalContext";
import { REQUEST_STATUS, RequestPopup } from "./TeamSection";

/** The board's columns, in order, with what each means from the client's side. */
const COLUMNS: Array<{ status: ProjectStatus; hint: string }> = [
  { status: "requested", hint: "Waiting for a VA to start" },
  { status: "in_progress", hint: "A VA is working on it" },
  { status: "review", hint: "Ready for you to check" },
  { status: "done", hint: "Finished" },
];
const CANCELLED = { status: "cancelled" as const, hint: "Cancelled or declined" };

/** A project still on its way to a VA (sent, in review, approved, finding the VA). */
const PROJECT_REQUESTED = new Set<VaRequestOut["status"]>(["new", "reviewing", "approved", "posted", "interviewing"]);

/** Which column a project sits in: requested until its VA is on it, then in progress, then done (or cancelled). */
function projectColumn(r: VaRequestOut): ProjectStatus {
  if (PROJECT_REQUESTED.has(r.status)) return "requested";
  if (r.status === "matched") return "in_progress";
  if ((r.status === "inactive" || r.status === "closed") && r.matchedVa) return "done";
  return "cancelled";
}

const vaChip = (vas: Array<{ id: string; name: string }>, label: string, title?: string) => (
  <span className="tk-avatars" title={title}>
    <span className="tk-avatars__stack">
      {vas.slice(0, 3).map((v) => (
        <Avatar key={v.id} name={v.name} tone={avatarTone(v.id)} size="sm" />
      ))}
    </span>
    <span className="tk-avatars__names">{label}</span>
  </span>
);

export type WorkKind = "tasks" | "projects";

/**
 * Client portal › VA › Tasks & projects: tasks (everyday work for the VAs on the team) and projects (one-time work by
 * a VA GoCWGL brings in) together on one board, a column per stage. The client drags a task to move it along;
 * projects move as GoCWGL works on them. Clicking a card opens everything about it.
 */
export function WorkBoard({
  asking,
  onAsk,
  hasTasks,
  canRequestProject,
}: {
  /** The request form open (Tasks & projects owns it: the banner opens it too). */
  asking: WorkKind | null;
  onAsk: (kind: WorkKind | null) => void;
  /** The client has an active VA, so tasks (and requesting them). */
  hasTasks: boolean;
  canRequestProject: boolean;
}) {
  const { readOnly, notify } = usePortal();
  const tasksQ = useProjects();
  const requestsQ = useVaRequests();
  const team = useVaTeam();
  const update = useUpdateProject();
  const place = usePlaceProject();
  const [openId, setOpenId] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | WorkKind>("");
  const [vaFilter, setVaFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState<"hide" | "show">("hide");
  // "Your order" is the board's own order (shared with the VAs), and the one where cards can be moved up and down.
  const [sort, setSort] = useState<"board" | "newest" | "due">("board");
  const tasks = tasksQ.data ?? [];
  const projects = (requestsQ.data ?? []).filter((r) => r.engagement === "project");
  const openedTask = tasks.find((p) => `task:${p.id}` === openId) ?? null;
  const openedProject = projects.find((r) => `project:${r.id}` === openId) ?? null;
  const projectVa = (r: VaRequestOut) => r.matchedVa ?? (PROJECT_REQUESTED.has(r.status) ? r.requestedVa : null);

  // Both kinds as board cards, with what the filters and sort need.
  const all: Array<BoardCard & { vaIds: string[]; text: string; createdAt: string }> = [
    ...tasks.map((p) => ({
      id: `task:${p.id}`,
      kind: "task" as const,
      column: p.status,
      title: p.title,
      details: p.details,
      priority: p.priority,
      dueDate: p.dueDate,
      links: p.links.length,
      messages: p.messageCount ?? 0,
      unread: p.unreadCount ?? 0,
      who: p.vas.length ? vaChip(p.vas, assigneeLabel(p.vas), assigneeDetail(p.vas)) : <span className="tk-row__muted">GoCWGL is picking</span>,
      vaIds: p.vas.map((v) => v.id),
      text: taskText(p.title, p.details, p.vas.map((v) => v.name).join(" "), p.requestedByName),
      createdAt: p.createdAt,
      position: p.position ?? 0,
    })),
    ...projects.map((r) => {
      const va = projectVa(r);
      const column = projectColumn(r);
      return {
        id: `project:${r.id}`,
        kind: "project" as const,
        column,
        title: r.role,
        details: r.overview,
        dueDate: r.dueDate,
        stage: column === "requested" || r.status === "declined" ? REQUEST_STATUS[r.status].label : undefined,
        messages: r.commentCount ?? 0,
        who: va ? vaChip([va], r.matchedVa ? va.name : `${va.name} (asked for)`) : <span className="tk-row__muted">GoCWGL is finding a VA</span>,
        vaIds: va ? [va.id] : [],
        text: taskText(r.role, r.category, r.overview, r.important, va?.name),
        createdAt: r.createdAt,
        position: r.position ?? 0,
      };
    }),
  ];
  // The VAs on their tasks and projects, for the VA filter (A–Z).
  const vas = [
    ...new Map([...tasks.flatMap((p) => p.vas), ...projects.flatMap((r) => (projectVa(r) ? [projectVa(r)!] : []))].map((v) => [v.id, v.name])),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const q = search.trim().toLowerCase();
  const filtered = !!(q || vaFilter || kind);
  const shown = all
    .filter(
      (c) =>
        (showCancelled === "show" || c.column !== "cancelled") &&
        (!kind || c.kind === kind.slice(0, -1)) &&
        (!vaFilter || (vaFilter === "none" ? !c.vaIds.length : c.vaIds.includes(vaFilter))) &&
        (!q || c.text.includes(q)),
    )
    .sort((a, b) =>
      sort === "board"
        ? a.position - b.position
        : sort === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.createdAt.localeCompare(a.createdAt),
    );
  const cancelledCount = all.filter((c) => c.column === "cancelled").length;

  const [askMove, moveDialog] = useConfirmMove();
  // A drop: a task to another column and/or a new place in it; a project only up or down its own column.
  const move = (c: BoardCard, to: ProjectStatus, position: number) => {
    const failed = (err: unknown) => {
      if (!(err instanceof NotMoved)) notify(`Couldn’t move “${c.title}”: ${errorMessage(err)}`);
      throw err;
    };
    const p = tasks.find((t) => `task:${t.id}` === c.id);
    if (!p) {
      const r = projects.find((x) => `project:${x.id}` === c.id);
      return r ? place.mutateAsync({ id: r.id, position }).catch(failed) : Promise.reject(new Error("Not found."));
    }
    const status = to !== p.status ? (to as NonNullable<ProjectClientUpdate["status"]>) : undefined;
    // A new column changes its status: ask first (Cancel puts the card back). Reordering in a column doesn't ask.
    const asked = status
      ? askMove({
          title: p.title,
          from: p.status,
          to,
          note: <p>{p.vas.length ? `${vaNames(p.vas)} ${p.vas.length > 1 ? "see" : "sees"} the change right away.` : "The change shows on your board right away."}</p>,
        })
      : Promise.resolve();
    return asked
      .then(() => update.mutateAsync({ id: p.id, body: { status, position } }))
      .then(() => status && notify(`“${p.title}” moved to ${PROJECT_STATUS[to].label}.`), failed);
  };

  return (
    <div className="page-stack">
      <TaskBar
        top={
          <>
            <TaskTabs
              value={kind}
              onChange={setKind}
              options={[
                { value: "", label: "All", count: tasks.length + projects.length },
                { value: "tasks", label: "Tasks", count: tasks.length },
                { value: "projects", label: "Projects", count: projects.length },
              ]}
            />
            <span className="u-spacer" />
            <TaskSearch value={search} onChange={setSearch} placeholder="Search tasks, projects or details" />
          </>
        }
        filters={
          <>
            <TaskFilter
              icon="user"
              label="VA"
              value={vaFilter}
              onChange={setVaFilter}
              active={!!vaFilter}
              options={[{ value: "", label: "Any VA" }, ...vas.map(([id, name]) => ({ value: id, label: name })), { value: "none", label: "Not assigned yet" }]}
            />
            <TaskFilter
              icon="close"
              label="Cancelled"
              value={showCancelled}
              onChange={setShowCancelled}
              active={showCancelled === "show"}
              options={[
                { value: "hide", label: "Hidden" },
                { value: "show", label: `Shown (${cancelledCount})` },
              ]}
            />
            <span className="u-spacer" />
            <TaskFilter
              icon="chart"
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "board", label: "Your order" },
                { value: "newest", label: "Newest first" },
                { value: "due", label: "Due soonest" },
              ]}
            />
            {filtered && (
              <button
                type="button"
                className="tk-bar__clear"
                onClick={() => {
                  setKind("");
                  setVaFilter("");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            )}
          </>
        }
      />

      <LoadState
        query={tasksQ.isPending ? tasksQ : requestsQ}
        loadingText="Loading your tasks and projects…"
        isEmpty={!all.length || (filtered && !shown.length)}
        empty={
          kind && !q && !vaFilter ? (
            kind === "tasks" ? (
              <WorkEmpty
                icon="clipboard"
                title="No tasks yet"
                text="Tasks are everyday work for the VAs on your team. Request one and follow it here until it’s done."
                action={!readOnly && hasTasks ? { label: "Request a task", onClick: () => onAsk("tasks") } : undefined}
              />
            ) : (
              <WorkEmpty
                icon="briefcase"
                tone="purple"
                title="No projects yet"
                text="Projects are one-time work that needs specific skills. GoCWGL reviews it, quotes the price and assigns a VA who has them."
                action={!readOnly && canRequestProject ? { label: "Request a project", onClick: () => onAsk("projects") } : undefined}
              />
            )
          ) : filtered ? (
            <WorkEmpty icon="search" title="Nothing matches these filters" text="Try another search or VA." />
          ) : (
            <WorkEmpty
              icon="clipboard"
              title="No tasks or projects yet"
              text={
                hasTasks
                  ? "Request a task for the VAs on your team, or a project for one-time work, and follow it here until it’s done."
                  : "Request a project for one-time work and follow it here until it’s done."
              }
              action={
                readOnly
                  ? undefined
                  : hasTasks
                    ? { label: "Request a task", onClick: () => onAsk("tasks") }
                    : canRequestProject
                      ? { label: "Request a project", onClick: () => onAsk("projects") }
                      : undefined
              }
            />
          )
        }
      >
        <p className="work-hint">
          <GripIcon size={14} />
          {readOnly
            ? "Click any card to see everything about it."
            : sort === "board"
              ? "Drag cards up and down to put them in your order, or a task to another column to move it along. Projects move columns as GoCWGL works on them."
              : "Drag a task to another column to move it along (it goes to the bottom). Switch Sort to “Your order” to arrange cards."}
        </p>
        <TaskBoard
          cards={shown}
          columns={showCancelled === "show" ? [...COLUMNS, CANCELLED] : COLUMNS}
          manual={sort === "board"}
          onOpen={(c) => setOpenId(c.id)}
          canMove={(c, to) => !readOnly && c.kind === "task" && c.column !== "cancelled" && to !== "cancelled"}
          canReorder={(c) => !readOnly && c.column !== "cancelled"}
          onMove={move}
        />
      </LoadState>

      {openedTask && <ProjectDetails p={openedTask} team={team.data ?? []} onClose={() => setOpenId("")} />}
      {openedProject && <RequestPopup r={openedProject} onClose={() => setOpenId("")} />}
      {moveDialog}

      {asking === "tasks" && <RequestModal team={team.data ?? []} onClose={() => onAsk(null)} />}
      {asking === "projects" && <VaRequestModal project onClose={() => onAsk(null)} />}
    </div>
  );
}

/** The full task in a pop-up: what was asked, every link, the VAs on it (changeable while open) and cancelling a request. */
function ProjectDetails({ p, team, onClose }: { p: ClientProjectOut; team: TeamVa[]; onClose: () => void }) {
  const { readOnly, notify } = usePortal();
  const update = useUpdateProject();
  const [cancelling, setCancelling] = useState(false);
  const messages = useProjectMessages(p.id);
  const { viewAsClientId } = useSession();
  // Opening the task (or a new message arriving while it's open) reads the conversation. GoCWGL viewing as the
  // client doesn't (the server ignores it), so the client still sees the mark.
  const { mutate: markRead } = useMarkProjectRead();
  const unread = p.unreadCount ?? 0;
  useEffect(() => {
    if (unread > 0 && !viewAsClientId) markRead(p.id);
  }, [p.id, unread, viewAsClientId, markRead, messages.data?.length]);
  const post = usePostProjectMessage();
  const subtasks = useProjectSubtasks();
  // Its own mutation, so a failed save shows only in the edit form.
  const editTask = useUpdateProject();
  const canEdit = !readOnly && isOpenProject(p);
  const saveEdits = (e: TaskEdits, done: () => void) =>
    editTask.mutate(
      { id: p.id, body: { ...e } },
      {
        onSuccess: () => {
          notify("Task updated.");
          done();
        },
      },
    );

  // Moving it: click a stage in the Status card, then confirm.
  const [movingTo, setMovingTo] = useState<ProjectStatus | null>(null);
  const move =
    readOnly || p.status === "cancelled"
      ? undefined
      : {
          can: (to: ProjectStatus) => to !== "cancelled",
          // Asks first (below), so a stray click doesn't move it.
          pick: (to: ProjectStatus) => (update.reset(), setMovingTo(to)),
          pending: update.isPending,
          hint: "Click a stage to move the task there.",
        };
  const actions =
    !readOnly && p.status === "requested" ? (
      <Button variant="danger" size="sm" className="tk-side__btn" disabled={update.isPending} onClick={() => (update.reset(), setCancelling(true))}>
        <Icon name="close" size={13} /> Cancel request
      </Button>
    ) : undefined;
  const [askClose, closeDialog] = useConfirmClose(onClose, "task");
  const vaWord = p.vas.length > 1 ? "your VAs" : (p.vas[0]?.name ?? "your VA");

  return (
    <Modal
      open
      width={1120}
      onClose={askClose}
      titleId="client-task"
      kicker="YOUR TASK REQUEST"
      title={p.title}
      className="tk-modal"
      footer={
        <>
          <span className="text-small">{p.vas.length > 1 ? "Every VA on it sees" : "Your VA sees"} exactly what’s here, and can edit it too. Updates show every 30 seconds.</span>
          <span className="u-spacer" />
          <Button variant="primary" onClick={askClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        {!cancelling && <FormError error={update.error} />}
        <TaskSheet
          t={p}
          people={{ icon: "user", label: "Requested by", value: p.requestedByName || "You" }}
          assignees={{
            title: p.vas.length > 1 ? "Assigned VAs" : "Assigned VA",
            people: p.vas.map((v) => ({ id: v.id, name: v.name, note: p.vas.length > 1 ? (v.role === "backup" ? "Backup VA" : "Main VA") : "Does this task" })),
            empty: "GoCWGL is picking the VA for this task.",
            change: canEdit ? (
              <VaAssign
                team={team}
                idPrefix="pj-edit"
                value={assignmentOf(p.vas)}
                disabled={update.isPending}
                onChange={(next) =>
                  update.mutate({ id: p.id, body: { mainVaId: next.main, backupVaIds: next.backups } }, { onSuccess: () => notify("VAs on this task updated.") })
                }
              />
            ) : undefined,
          }}
          move={move}
          actions={actions}
          emptyDetails="You didn’t add details to this request."
          edit={canEdit ? { save: saveEdits, saving: editTask.isPending, error: editTask.error, reset: editTask.reset } : undefined}
          subtasks={{
            actions: subtasks,
            canEdit: !readOnly && p.status !== "cancelled",
            emptyHint: `Break the work into steps. You and ${vaWord} can tick them off as you go.`,
          }}
          conversation={
            <TaskConversation
              side="client"
              otherName={vaWord}
              otherPlural={p.vas.length > 1}
              vaName={p.vas.length ? vaNames(p.vas) : "your VA"}
              messages={messages}
              send={(body, done) => post.mutate({ id: p.id, body }, { onSuccess: done })}
              sending={post.isPending}
              sendError={post.error}
              closed={p.status === "cancelled"}
              readOnly={readOnly}
              staffViewing={!!viewAsClientId}
              activity={[
                { id: "created", at: p.createdAt, who: p.requestedByName || "You", icon: "plus", text: "requested this task" },
                ...subtaskActivity(p.subtasks),
                ...(p.completedAt ? [{ id: "done", at: p.completedAt, who: "This task", icon: "circleCheck" as const, text: "was moved to Done" }] : []),
              ]}
            />
          }
        />
      </div>
      {closeDialog}
      {movingTo && (
        <ConfirmDialog
          title={`Move this task to ${PROJECT_STATUS[movingTo].label}?`}
          confirmLabel={`Yes, move to ${PROJECT_STATUS[movingTo].label}`}
          icon="arrowRight"
          pending={update.isPending}
          error={update.error}
          onClose={() => setMovingTo(null)}
          onConfirm={() =>
            update.mutate(
              { id: p.id, body: { status: movingTo as NonNullable<ProjectClientUpdate["status"]> } },
              {
                onSuccess: () => {
                  notify(`Moved to ${PROJECT_STATUS[movingTo].label}.`);
                  setMovingTo(null);
                },
              },
            )
          }
        >
          <div className="tk-confirm">
            <p className="tk-confirm__task">“{p.title}”</p>
            <div className="tk-confirm__move">
              <TaskStatus status={p.status} />
              <Icon name="arrowRight" size={14} />
              <TaskStatus status={movingTo} />
            </div>
            <p>{p.vas.length ? `${vaNames(p.vas)} ${p.vas.length > 1 ? "see" : "sees"} the change right away.` : "The change shows on your board right away."}</p>
          </div>
        </ConfirmDialog>
      )}
      {cancelling && (
        <ConfirmDialog
          title="Cancel this task request?"
          confirmLabel="Yes, cancel it"
          icon="close"
          pending={update.isPending}
          error={update.error}
          onClose={() => setCancelling(false)}
          onConfirm={() =>
            update.mutate(
              { id: p.id, body: { cancel: true } },
              {
                onSuccess: () => {
                  notify("Request cancelled.");
                  setCancelling(false);
                  onClose();
                },
              },
            )
          }
        >
          “{p.title}” is cancelled and comes off the board (show it with the Cancelled filter). {p.vas.length ? `${vaNames(p.vas)} won’t work on it.` : ""}
        </ConfirmDialog>
      )}
    </Modal>
  );
}

function RequestModal({ team, onClose }: { team: TeamVa[]; onClose: () => void }) {
  const { notify } = usePortal();
  const request = useRequestProject();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [assign, setAssign] = useState<VaAssignment>({ main: team.length === 1 ? team[0].vaId : null, backups: [] });
  const [priority, setPriority] = useState<ProjectPriority>("normal");
  const [dueDate, setDueDate] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    request.mutate(
      {
        title: title.trim(),
        details: details.trim(),
        subtasks: subtasks.map((t) => t.trim()).filter(Boolean),
        links: links.map((l) => l.trim()).filter(Boolean),
        mainVaId: assign.main, backupVaIds: assign.backups,
        priority,
        dueDate: dueDate || null,
      },
      {
        onSuccess: () => {
          notify(
            assign.backups.length
              ? `Task requested with ${assign.backups.length} backup VA${assign.backups.length === 1 ? "" : "s"}.`
              : "Task requested. GoCWGL will confirm it with your VA.",
          );
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      width={640}
      onClose={onClose}
      onSubmit={submit}
      titleId="request-project"
      title="Request a task"
      subtitle="Tell us what you need and who you’d like on it. Your VA sees everything you add here."
      footer={
        <>
          <span className="vrf-foot">Fields marked * are required.</span>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || request.isPending}>
            {request.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="vrf">
        <FormError error={request.error} />
        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Task</h3>
            <p>What needs doing, and what done looks like.</p>
          </header>
          <div className="vrf-section__body">
            <Field label="Title" htmlFor="pj-title" required>
              <Input id="pj-title" value={title} maxLength={160} placeholder="e.g. Clean up and tag our CRM contacts" onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="Description" htmlFor="pj-details">
              <Textarea
                id="pj-details"
                rows={5}
                value={details}
                maxLength={5000}
                placeholder="Steps, examples, logins they’ll need (shared safely), anything that helps."
                onChange={(e) => setDetails(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Subtasks (optional)</h3>
            <p>Break the work into steps. You and your VA tick them off in the task as you go.</p>
          </header>
          <div className="vrf-section__body">
            <SubtaskDraftList value={subtasks} onChange={setSubtasks} idPrefix="pj-sub" />
          </div>
        </section>

        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Links (optional)</h3>
            <p>Docs, folders, examples or recordings your VA should open.</p>
          </header>
          <div className="vrf-section__body">
            <LinkInputs value={links} onChange={setLinks} idPrefix="pj-link" />
          </div>
        </section>

        <section className="vrf-section">
          <header className="vrf-section__head">
            <h3>Assigned VA, priority and deadline</h3>
            <p>Pick the main VA and any backups, how urgent it is, and when you need it.</p>
          </header>
          <div className="vrf-section__body">
            <VaAssign team={team} value={assign} onChange={setAssign} idPrefix="pj-new" />
            <div className="vrf-grid vrf-grid--2">
              <Field label="Priority">
                <SegmentedControl
                  label="Priority"
                  size="sm"
                  value={priority}
                  onChange={setPriority}
                  options={(["low", "normal", "high"] as const).map((v) => ({ value: v, label: PRIORITY[v].label }))}
                />
              </Field>
              <Field label="Deadline" htmlFor="pj-due">
                <Input id="pj-due" type="date" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
