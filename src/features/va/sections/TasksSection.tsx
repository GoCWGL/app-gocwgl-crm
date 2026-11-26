"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Button, ConfirmDialog, GripIcon, Icon, Input, LoadState, Modal, StatGrid, type IconName } from "@/components/ui";
import { TaskBoard, type BoardCard } from "@/features/portal/components/TaskBoard";
import { TaskConversation } from "@/features/portal/components/TaskConversation";
import { TaskBar, TaskFilter, TaskSearch, taskText } from "@/features/portal/components/TaskFilters";
import { TaskSheet, TaskStatus } from "@/features/portal/components/TaskSheet";
import { isOpenProject, vaNames, type ProjectStatus } from "@/features/portal/lib/projects";
import { cn } from "@/lib/utils";
import type { VaProjectOut, VaTaskOut, VaTaskUpdate } from "@/utils/api/models";
import { errorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useSession } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { useMarkVaTaskRead, usePlaceVaProject, usePostVaTaskMessage, useUpdateVaTask, useVaProjects, useVaTaskMessages, useVaTasks } from "@/utils/hooks/useVaPortal";
import { useVaAccess } from "../lib/access";
import { useVa } from "../state/VaContext";

type RangeKey = "any" | "week" | "month" | "next30" | "custom";
type DateField = "created" | "due";
type Sort = "board" | "due" | "newest";

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "any", label: "Any date" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "next30", label: "Next 30 days" },
  { value: "custom", label: "Custom" },
];

/** "YYYY-MM-DD" for a local date. */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => iso(new Date());

/** [from, to] (inclusive, "YYYY-MM-DD") for a preset; null = any date. */
function presetRange(key: RangeKey): [string, string] | null {
  const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "week") {
    const monday = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - ((d0.getDay() + 6) % 7));
    return [iso(monday), iso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6))];
  }
  if (key === "month") return [iso(new Date(d0.getFullYear(), d0.getMonth(), 1)), iso(new Date(d0.getFullYear(), d0.getMonth() + 1, 0))];
  if (key === "next30") return [iso(d0), iso(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 30))];
  return null;
}

const isOverdue = (t: BoardCard) => !!t.dueDate && t.column !== "done" && t.column !== "cancelled" && t.dueDate < today();

/** The board's columns, in order, with what each means from the VA's side. */
const COLUMNS: Array<{ status: ProjectStatus; hint: string }> = [
  { status: "requested", hint: "Not started yet" },
  { status: "in_progress", hint: "You’re working on it" },
  { status: "review", hint: "Waiting for the client to check" },
  { status: "done", hint: "Finished" },
];
const CANCELLED = { status: "cancelled" as const, hint: "Cancelled by the client" };

/** Lets a Start task button anywhere on the page show the "timer started" banner. */
const TimerNotice = createContext<(message: string) => void>(() => undefined);
const useTimerNotice = () => useContext(TimerNotice);

/** A task or a project on the VA's board, with what the filters and sort need. */
type Item = BoardCard & { contactId: string; clientName: string; createdAt: string; text: string };

/** Where a project sits: in progress while they're on it, then done (or cancelled). GoCWGL moves it. */
const projectColumn = (p: VaProjectOut): ProjectStatus =>
  p.status === "inactive" || p.status === "closed" ? "done" : p.status === "cancelled" || p.status === "declined" ? "cancelled" : "in_progress";

/**
 * VA portal › Tasks: client tasks assigned to this VA (the client's "Tasks" requests), moved along by the VA, and the
 * open projects GoCWGL matched them to, together on one board.
 */
export function TasksSection() {
  const { ready, readOnly } = useVaAccess();
  const query = useVaTasks(ready);
  const projectsQ = useVaProjects(ready);
  const update = useUpdateVaTask();
  const placeProject = usePlaceVaProject();
  const [showCancelled, setShowCancelled] = useState<"hide" | "show">("hide");
  const [range, setRange] = useState<RangeKey>("any");
  const [field, setField] = useState<DateField>("due");
  // "Your order": the board's own order, shared with each client's board, where cards can be moved up and down.
  const [sort, setSort] = useState<Sort>("board");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 30));
  });
  // Only the client picked under Active clients in the menu (all of them until one is picked).
  const { goTo, client: scope } = useVa();
  const myId = useMyVaId();
  const myTasks = useMemo(() => (query.data ?? []).filter((t) => !scope || t.contactId === scope), [query.data, scope]);
  const myProjects = useMemo(() => (projectsQ.data ?? []).filter((p) => !scope || p.contactId === scope), [projectsQ.data, scope]);
  const [kind, setKind] = useState<"" | "task" | "project">("");
  const [timerNote, setTimerNote] = useState("");
  const [moveError, setMoveError] = useState("");
  const [client, setClient] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState("");
  // Tasks and projects as board cards.
  const all: Item[] = [
    ...myTasks.map((t) => ({
      id: `task:${t.id}`,
      kind: "task" as const,
      column: t.status,
      title: t.title,
      details: t.details,
      priority: t.priority,
      dueDate: t.dueDate,
      links: t.links.length,
      messages: t.messageCount ?? 0,
      unread: t.unreadCount ?? 0,
      who: (
        <span className="kb-card__client">
          <Icon name="building" size={12} /> {t.clientName || "Your client"}
          {roleNote(t, myId) && <span className="tk-row__muted"> · {roleNote(t, myId)}</span>}
        </span>
      ),
      contactId: t.contactId,
      clientName: t.clientName,
      createdAt: t.createdAt,
      position: t.position ?? 0,
      text: taskText(t.title, t.details, t.clientName, t.requestedByName),
    })),
    ...myProjects.map((p) => ({
      id: `project:${p.id}`,
      kind: "project" as const,
      column: projectColumn(p),
      title: p.role,
      details: p.overview,
      dueDate: p.dueDate,
      stage: p.category || undefined,
      who: (
        <span className="kb-card__client">
          <Icon name="building" size={12} /> {p.clientName || "Your client"}
        </span>
      ),
      contactId: p.contactId,
      clientName: p.clientName,
      createdAt: p.createdAt,
      position: p.position ?? 0,
      text: taskText(p.role, p.category, p.overview, p.important, p.clientName),
    })),
  ];
  // The clients they have work from, for the client picker (A–Z).
  const clients = useMemo(() => {
    const byId = new Map<string, { name: string; open: number }>();
    for (const t of [...myTasks, ...myProjects]) {
      const c = byId.get(t.contactId) ?? { name: t.clientName || "Your client", open: 0 };
      if ("title" in t ? isOpenProject(t) : projectColumn(t) === "in_progress") c.open += 1;
      byId.set(t.contactId, c);
    }
    return [...byId].map(([id, c]) => ({ id, ...c })).sort((a, b) => a.name.localeCompare(b.name));
  }, [myTasks, myProjects]);
  const picked = clients.some((c) => c.id === client) ? client : "";
  const openedTask = myTasks.find((t) => `task:${t.id}` === openId) ?? null;
  const openedProject = myProjects.find((p) => `project:${p.id}` === openId) ?? null;

  // Date range: on the requested date or the due date (work with no due date only matches "Any date").
  const span = range === "custom" ? ([from, to] as [string, string]) : presetRange(range);
  const inRange = (t: Item) => {
    if (!span) return true;
    const d = field === "due" ? t.dueDate : t.createdAt.slice(0, 10);
    return !!d && d >= span[0] && d <= span[1];
  };
  const q = search.trim().toLowerCase();
  const dated = all.filter((t) => inRange(t) && (!kind || t.kind === kind) && (!picked || t.contactId === picked) && (!q || t.text.includes(q)));
  const shown = dated
    .filter((t) => showCancelled === "show" || t.column !== "cancelled")
    .sort((a, b) =>
      sort === "board"
        ? a.position - b.position
        : sort === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.createdAt.localeCompare(a.createdAt),
    );
  const cancelledCount = all.filter((t) => t.column === "cancelled").length;
  const filtered = !!(picked || span || q || kind);

  // Dragging a task: In progress (also starts their timer, like Start task), In review or Done. Projects don't drag.
  // A drop: a task to another column and/or a new place in it; a project only up or down its own column.
  const move = (c: BoardCard, to: ProjectStatus, position: number) => {
    const t = myTasks.find((x) => `task:${x.id}` === c.id);
    if (!t) {
      const p = myProjects.find((x) => `project:${x.id}` === c.id);
      if (!p) return Promise.reject(new Error("Not found."));
      return placeProject.mutateAsync({ id: p.id, position }).catch((err) => {
        setMoveError(`Couldn’t move “${c.title}”: ${errorMessage(err)}`);
        throw err;
      });
    }
    const status = to !== t.status ? (to as VaTaskUpdate["status"]) : undefined;
    return update.mutateAsync({ id: t.id, status, position }).then(
      (res) => {
        setMoveError("");
        if (res?.timerStarted) setTimerNote(`Timer started for ${res.clientName || "your client"}: “${res.title}”.`);
      },
      (err) => {
        setMoveError(`Couldn’t move “${t.title}”: ${errorMessage(err)}`);
        throw err;
      },
    );
  };

  return (
    <TimerNotice.Provider value={setTimerNote}>
    <div className="page-stack">
      {timerNote && (
        <div className="tk-timer-note" role="status">
          <span className="tk-timer-note__icon" aria-hidden="true">
            <Icon name="play" size={14} />
          </span>
          <span className="u-grow">{timerNote}</span>
          <Button size="sm" variant="primary" onClick={() => goTo("time")}>
            Open timer
          </Button>
          <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => setTimerNote("")}>
            ×
          </button>
        </div>
      )}
      {moveError && (
        <span className="form-error" role="alert">
          {moveError}
        </span>
      )}
      <StatGrid
        items={[
          { label: "To start", value: String(all.filter((t) => t.column === "requested").length), tone: "sky" },
          { label: "In progress", value: String(all.filter((t) => t.column === "in_progress").length), tone: "brand" },
          { label: "In review", value: String(all.filter((t) => t.column === "review").length), tone: "purple" },
          { label: "Overdue", value: String(all.filter(isOverdue).length), tone: all.some(isOverdue) ? "red" : "slate" },
        ]}
      />

      <TaskBar
        top={
          <>
            <span className="tk-bar__note">
              <GripIcon size={14} />
              {readOnly
                ? "Click a card to see everything about it."
                : sort === "board"
                  ? "Drag cards up and down to put them in order, or a task to another column to move it along. Click a card for everything about it."
                  : "Drag a task to another column to move it along. Switch Sort to “Your order” to arrange cards."}
            </span>
            <span className="u-spacer" />
            <TaskSearch value={search} onChange={setSearch} placeholder="Search tasks, projects or clients" />
          </>
        }
        filters={
          <>
            {!scope && (
              <TaskFilter
                icon="building"
                label="Client"
                value={picked}
                onChange={setClient}
                active={!!picked}
                options={[
                  { value: "", label: `All clients (${clients.length})` },
                  ...clients.map((c) => ({ value: c.id, label: c.open ? `${c.name} · ${c.open} open` : c.name })),
                ]}
              />
            )}
            <TaskFilter
              icon="form"
              label="Show"
              value={kind}
              onChange={setKind}
              active={!!kind}
              options={[
                { value: "", label: "Tasks and projects" },
                { value: "task", label: `Tasks only (${myTasks.length})` },
                { value: "project", label: `Projects only (${myProjects.length})` },
              ]}
            />
            <TaskFilter
              icon="calendar"
              label="Dates by"
              value={field}
              onChange={setField}
              options={[
                { value: "due", label: "Due date" },
                { value: "created", label: "Requested date" },
              ]}
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
            <TaskFilter icon="clock" label="Range" value={range} onChange={setRange} active={range !== "any"} options={RANGES} />
            {range === "custom" && (
              <span className="tk-bar__dates">
                <Input type="date" size="sm" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                <span aria-hidden="true">–</span>
                <Input type="date" size="sm" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </span>
            )}
            {span && range !== "custom" && (
              <span className="tk-bar__range">
                {formatShort(span[0])} – {formatShort(span[1])}
              </span>
            )}
            <span className="u-spacer" />
            <TaskFilter
              icon="chart"
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "board", label: "Your order" },
                { value: "due", label: "Due soonest" },
                { value: "newest", label: "Newest first" },
              ]}
            />
            {filtered && (
              <button
                type="button"
                className="tk-bar__clear"
                onClick={() => {
                  setKind("");
                  setClient("");
                  setRange("any");
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
        query={query.isPending ? query : projectsQ}
        loadingText="Loading your tasks and projects…"
        isEmpty={!all.length || (filtered && !shown.length)}
        empty={
          q
            ? "Nothing matches your search."
            : span
              ? "Nothing in these dates. Try another range."
              : picked || kind
                ? "Nothing matches these filters."
                : "No tasks or projects yet. When a client requests a task and picks you, or GoCWGL puts you on a project, it shows up here."
        }
      >
        <TaskBoard
          cards={shown}
          columns={showCancelled === "show" ? [...COLUMNS, CANCELLED] : COLUMNS}
          onOpen={(c) => setOpenId(c.id)}
          manual={sort === "board"}
          canMove={(c, to) => !readOnly && c.kind === "task" && c.column !== "cancelled" && to !== "requested" && to !== "cancelled"}
          canReorder={(c) => !readOnly && c.column !== "cancelled"}
          onMove={move}
        />
      </LoadState>
      {openedTask && <TaskDetails t={openedTask} readOnly={readOnly} onClose={() => setOpenId("")} />}
      {openedProject && <ProjectDetails p={openedProject} onClose={() => setOpenId("")} />}
    </div>
    </TimerNotice.Provider>
  );
}

/** What a VA can move a task to, in order. */
const VA_STATUSES: Array<{ value: "in_progress" | "review" | "done"; label: string; hint: string; icon: IconName; confirm: string }> = [
  {
    value: "in_progress",
    label: "In progress",
    hint: "You’re working on it",
    icon: "play",
    confirm: "The client sees that you’ve started on it.",
  },
  {
    value: "review",
    label: "In review",
    hint: "Ready for the client to check",
    icon: "eye",
    confirm: "The client is asked to check your work.",
  },
  {
    value: "done",
    label: "Done",
    hint: "Finished",
    icon: "circleCheck",
    confirm: "The task moves to Done for you and the client. You can reopen it later by picking another status.",
  },
];

/**
 * Change the task's status (in the details pop-up), after a confirmation. Starting a task also starts their timer
 * for the client.
 */
function StatusPicker({ t }: { t: VaTaskOut }) {
  const update = useUpdateVaTask();
  const onTimer = useTimerNotice();
  const [asking, setAsking] = useState<(typeof VA_STATUSES)[number] | null>(null);
  if (t.status === "cancelled") return <p className="text-small">The client cancelled this task, so its status can’t be changed.</p>;
  const startsTimer = asking?.value === "in_progress" && t.status === "requested";
  const confirm = () =>
    asking &&
    update.mutate(
      { id: t.id, status: asking.value },
      {
        onSuccess: (res) => {
          setAsking(null);
          if (res?.timerStarted) onTimer(`Timer started for ${res.clientName || "your client"}: “${res.title}”.`);
        },
      },
    );
  return (
    <div className="stack stack--8">
      <div className="tk-sheet__h">
        <Icon name="gauge" size={14} /> Update status
      </div>
      <div className="tk-status-pick" role="radiogroup" aria-label="Task status">
        {VA_STATUSES.map((o) => {
          const on = t.status === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              className={cn("tk-status-pick__opt", `is-${o.value}`, on && "is-on")}
              disabled={update.isPending}
              onClick={() => {
                if (on) return;
                update.reset();
                setAsking(o);
              }}
            >
              <Icon name={on ? "check" : o.icon} size={14} />
              <span className="stack stack--0">
                <strong>{o.label}</strong>
                <span>{on ? "Current status" : o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {t.status === "requested" && <span className="text-small">Not started yet. Pick “In progress” when you begin; it also starts your timer.</span>}
      {asking && (
        <ConfirmDialog
          title={`Move this task to ${asking.label}?`}
          confirmLabel={`Yes, mark ${asking.label.toLowerCase()}`}
          icon={asking.icon}
          pending={update.isPending}
          error={update.error}
          onConfirm={confirm}
          onClose={() => setAsking(null)}
        >
          <div className="tk-confirm">
            <p className="tk-confirm__task">“{t.title}”</p>
            <div className="tk-confirm__move">
              <TaskStatus status={t.status} />
              <Icon name="arrowRight" size={14} />
              <TaskStatus status={asking.value} />
            </div>
            <p>
              {asking.confirm} {t.clientName ? `${t.clientName} sees the change right away.` : ""}
            </p>
            {startsTimer && (
              <p className="tk-confirm__note">
                <Icon name="play" size={12} /> This also starts your timer for {t.clientName || "this client"}.
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** A pop-up with everything about one task: the client's full request (details, every link, priority, due date), GoCWGL's note, and the status change. */
function TaskDetails({ t, readOnly, onClose }: { t: VaTaskOut; readOnly: boolean; onClose: () => void }) {
  const myId = useMyVaId();
  const messages = useVaTaskMessages(t.id);
  const post = usePostVaTaskMessage();
  // Opening the task (or a new message arriving while it's open) reads the conversation.
  const { mutate: markRead } = useMarkVaTaskRead();
  const unread = t.unreadCount ?? 0;
  useEffect(() => {
    if (unread > 0 && !readOnly) markRead(t.id);
  }, [t.id, unread, readOnly, markRead, messages.data?.length]);
  return (
    <Modal
      open
      width={1080}
      onClose={onClose}
      titleId="va-task"
      kicker={`TASK FROM ${(t.clientName || "YOUR CLIENT").toUpperCase()}`}
      title={t.title}
      footer={
        <>
          <span className="text-small">Updates every 30 seconds, in step with the client’s request.</span>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <TaskSheet
        t={t}
        people={{
          icon: "building",
          label: "Client",
          value: `${t.clientName || "Your client"}${roleNote(t, myId) ? ` · ${roleNote(t, myId)}` : ""}`,
        }}
        actions={readOnly ? undefined : <StatusPicker t={t} />}
        emptyDetails="The client didn’t add details. Ask them in the conversation if anything’s unclear."
        conversation={
          <TaskConversation
            side="va"
            otherName={t.clientName || "the client"}
            vaName={vaNames(t.vas, "your VA")}
            otherReadAt={t.clientReadAt}
            messages={messages}
            send={(body, done) => post.mutate({ id: t.id, body }, { onSuccess: done })}
            sending={post.isPending}
            sendError={post.error}
            closed={t.status === "cancelled"}
            readOnly={readOnly}
          />
        }
      />
    </Modal>
  );
}

/** A project's pop-up: what the client asked for (no budget or price), the client and the due date. */
function ProjectDetails({ p, onClose }: { p: VaProjectOut; onClose: () => void }) {
  const column = projectColumn(p);
  const lists: Array<[string, IconName, string[]]> = [
    ["What you’ll do", "clipboard", p.responsibilities],
    ["Must have", "circleCheck", p.mustHave],
    ["Nice to have", "star", p.niceToHave],
  ];
  const facts: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "building", label: "Client", value: p.clientName || "Your client" },
    { icon: "folder", label: "Category", value: p.category || "—" },
    { icon: "clock", label: "Due date", value: p.dueDate ? formatShort(p.dueDate) : "No due date" },
    { icon: "calendar", label: "You were put on it", value: p.matchedAt ? formatShort(p.matchedAt) : "—" },
  ];
  return (
    <Modal
      open
      width={760}
      onClose={onClose}
      titleId="va-project"
      kicker={`PROJECT FOR ${(p.clientName || "YOUR CLIENT").toUpperCase()}`}
      title={p.role}
      footer={
        <>
          <span className="text-small">One-time work. GoCWGL moves it to Done when it’s finished.</span>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="tk-sheet">
        <div className="tk-sheet__status">
          <TaskStatus status={column} />
        </div>
        <section className="tk-sheet__section">
          <h4 className="tk-sheet__h">
            <Icon name="textLong" size={14} /> Overview
          </h4>
          {p.overview ? <div className="tk-sheet__details">{p.overview}</div> : <p className="tk-sheet__muted">No overview added.</p>}
        </section>
        {lists
          .filter(([, , items]) => items.length)
          .map(([label, icon, items]) => (
            <section key={label} className="tk-sheet__section">
              <h4 className="tk-sheet__h">
                <Icon name={icon} size={14} /> {label}
              </h4>
              <ul className="tk-sheet__list">
                {items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          ))}
        {p.important && (
          <section className="rd-important">
            <span className="rd-important__icon" aria-hidden="true">
              <Icon name="message" size={15} />
            </span>
            <span className="stack stack--2">
              <strong>Important to the client</strong>
              <span className="va-pre">{p.important}</span>
            </span>
          </section>
        )}
        <section className="tk-sheet__section">
          <h4 className="tk-sheet__h">
            <Icon name="form" size={14} /> At a glance
          </h4>
          <dl className="tk-sheet__facts">
            {facts.map((f) => (
              <div key={f.label} className="tk-sheet__fact">
                <dt>
                  <Icon name={f.icon} size={13} /> {f.label}
                </dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Modal>
  );
}

/** The VA whose portal this is (the VA, or the one staff are viewing as). */
function useMyVaId(): string {
  const me = useMe().data;
  const { viewAsVaId } = useSession();
  return viewAsVaId || me?.id || "";
}

/** Your part on a shared task: "you're the backup for Riley", "Ben is your backup", or "" when it's only yours. */
const roleNote = (t: VaTaskOut, myId: string) => {
  if (t.vas.length < 2) return "";
  const me = t.vas.find((v) => v.id === myId);
  const main = t.vas.find((v) => v.role !== "backup");
  if (me?.role === "backup") return main ? `you’re the backup for ${main.name}` : "you’re a backup";
  const backups = t.vas.filter((v) => v.role === "backup" && v.id !== myId);
  return backups.length ? `${vaNames(backups)} ${backups.length === 1 ? "is your backup" : "are your backups"}` : "";
};
