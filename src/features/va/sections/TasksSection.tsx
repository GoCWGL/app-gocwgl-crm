"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Button, ConfirmDialog, Icon, Input, LoadState, Modal, StatGrid, type IconName } from "@/components/ui";
import { TaskConversation, UnreadMark } from "@/features/portal/components/TaskConversation";
import { TaskBar, TaskFilter, TaskSearch, TaskTabs, taskText } from "@/features/portal/components/TaskFilters";
import { TaskSheet, TaskStatus } from "@/features/portal/components/TaskSheet";
import { isOpenProject, PRIORITY, PROJECT_STATUS, vaNames } from "@/features/portal/lib/projects";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaTaskOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useSession } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { useMarkVaTaskRead, usePostVaTaskMessage, useUpdateVaTask, useVaTaskMessages, useVaTasks } from "@/utils/hooks/useVaPortal";
import { useVaAccess } from "../lib/access";
import { useVa } from "../state/VaContext";

type View = "open" | "done" | "all";
type RangeKey = "any" | "week" | "month" | "next30" | "custom";
type DateField = "created" | "due";
type Sort = "due" | "newest";

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

const isOverdue = (t: VaTaskOut) => !!t.dueDate && isOpenProject(t) && t.dueDate < today();

/** Lets a Start task button anywhere on the page show the "timer started" banner. */
const TimerNotice = createContext<(message: string) => void>(() => undefined);
const useTimerNotice = () => useContext(TimerNotice);

/** VA portal › Tasks: client tasks assigned to this VA (the client's "Tasks" requests), moved along by the VA. */
export function TasksSection() {
  const { ready, readOnly } = useVaAccess();
  const query = useVaTasks(ready);
  const [view, setView] = useState<View>("open");
  const [range, setRange] = useState<RangeKey>("any");
  const [field, setField] = useState<DateField>("due");
  const [sort, setSort] = useState<Sort>("due");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 30));
  });
  // Only the client picked under Active clients in the menu (all of them until one is picked).
  const { goTo, client: scope } = useVa();
  const all = useMemo(() => (query.data ?? []).filter((t) => !scope || t.contactId === scope), [query.data, scope]);
  const [timerNote, setTimerNote] = useState("");
  const [client, setClient] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState("");
  // The clients they have tasks from, for the client picker (A–Z).
  const clients = useMemo(() => {
    const byId = new Map<string, { name: string; open: number }>();
    for (const t of all) {
      const c = byId.get(t.contactId) ?? { name: t.clientName || "Your client", open: 0 };
      if (isOpenProject(t)) c.open += 1;
      byId.set(t.contactId, c);
    }
    return [...byId].map(([id, c]) => ({ id, ...c })).sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);
  const picked = clients.some((c) => c.id === client) ? client : "";
  const opened = all.find((t) => t.id === openId) ?? null;

  // Date range: on the requested date or the due date (tasks with no due date only match "Any date").
  const span = range === "custom" ? ([from, to] as [string, string]) : presetRange(range);
  const inRange = (t: VaTaskOut) => {
    if (!span) return true;
    const d = field === "due" ? t.dueDate : t.createdAt.slice(0, 10);
    return !!d && d >= span[0] && d <= span[1];
  };
  const q = search.trim().toLowerCase();
  const dated = all.filter(
    (t) => inRange(t) && (!picked || t.contactId === picked) && (!q || taskText(t.title, t.details, t.clientName, t.requestedByName).includes(q)),
  );
  const open = dated.filter(isOpenProject);
  const done = dated.filter((t) => t.status === "done");
  const shown = (view === "open" ? open : view === "done" ? done : dated).slice().sort((a, b) =>
    sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.createdAt.localeCompare(a.createdAt),
  );

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
      <StatGrid
        items={[
          { label: "To start", value: String(all.filter((t) => t.status === "requested").length), tone: "sky" },
          { label: "In progress", value: String(all.filter((t) => t.status === "in_progress").length), tone: "brand" },
          { label: "In review", value: String(all.filter((t) => t.status === "review").length), tone: "purple" },
          { label: "Overdue", value: String(all.filter(isOverdue).length), tone: all.some(isOverdue) ? "red" : "slate" },
        ]}
      />

      <TaskBar
        top={
          <>
            <TaskTabs
              value={view}
              onChange={setView}
              options={[
                { value: "open", label: "Open", count: open.length },
                { value: "done", label: "Done", count: done.length },
                { value: "all", label: "All", count: dated.length },
              ]}
            />
            <span className="u-spacer" />
            <TaskSearch value={search} onChange={setSearch} placeholder="Search tasks, details or clients" />
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
              icon="calendar"
              label="Dates by"
              value={field}
              onChange={setField}
              options={[
                { value: "due", label: "Due date" },
                { value: "created", label: "Requested date" },
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
                { value: "due", label: "Due soonest" },
                { value: "newest", label: "Newest first" },
              ]}
            />
            {(picked || range !== "any" || search) && (
              <button
                type="button"
                className="tk-bar__clear"
                onClick={() => {
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
        query={query}
        loadingText="Loading your tasks…"
        isEmpty={!shown.length}
        empty={
          q
            ? "No tasks match your search."
            : span
            ? "No tasks in these dates. Try another range."
            : view === "open"
              ? "No open tasks. When a client requests a task and picks you, it shows up here."
              : "No finished tasks yet."
        }
      >
        <div className="card tk-list" role="table" aria-label="Tasks">
          <div className="tk-list__head" role="row">
            <span role="columnheader">Task</span>
            <span role="columnheader">Client</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Due</span>
            <span role="columnheader" aria-label="Next step" />
          </div>
          {shown.map((t) => (
            <TaskRow key={t.id} t={t} onOpen={() => setOpenId(t.id)} />
          ))}
        </div>
      </LoadState>
      {opened && <TaskDetails t={opened} readOnly={readOnly} onClose={() => setOpenId("")} />}
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

/** One task in the list; clicking it opens the full details. */
function TaskRow({ t, onOpen }: { t: VaTaskOut; onOpen: () => void }) {
  const myId = useMyVaId();
  const overdue = isOverdue(t);
  return (
    <div
      className={cn("tk-row", `is-${t.status}`, (t.unreadCount ?? 0) > 0 && "has-unread")}
      role="row"
      tabIndex={0}
      aria-label={`${t.title}, ${PROJECT_STATUS[t.status].label}. Open details`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="tk-row__main" role="cell">
        <span className="tk-row__title">
          {t.title}
          {t.priority !== "normal" && (
            <span className={cn("tk-chip", toneClass(PRIORITY[t.priority].tone))}>
              <Icon name="bolt" size={11} /> {PRIORITY[t.priority].label}
            </span>
          )}
          {(t.unreadCount ?? 0) > 0 && <UnreadMark count={t.unreadCount ?? 0} />}
        </span>
        <span className="tk-row__sub">
          {t.details ? t.details.split("\n")[0] : "No details added"}
          {t.links.length > 0 && (
            <span className="tk-row__links">
              <Icon name="link" size={11} /> {t.links.length}
            </span>
          )}
          {(t.messageCount ?? 0) > 0 && (
            <span className="tk-row__msgs">
              <Icon name="message" size={11} /> {t.messageCount}
            </span>
          )}
        </span>
      </span>
      <span className="tk-row__client" role="cell">
        <Icon name="building" size={12} /> {t.clientName || "Your client"}
        {roleNote(t, myId) && <span className="tk-row__muted"> · {roleNote(t, myId)}</span>}
      </span>
      <span role="cell">
        <span className={cn("tk-status", toneClass(PROJECT_STATUS[t.status].tone))}>
          <span className="tk-status__dot" aria-hidden="true" />
          {PROJECT_STATUS[t.status].label}
        </span>
      </span>
      <span className={cn("tk-row__due", overdue && "is-late")} role="cell">
        {t.dueDate ? (overdue ? `Overdue · ${formatShort(t.dueDate)}` : formatShort(t.dueDate)) : "No due date"}
      </span>
      <span className="tk-row__action" role="cell">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Icon name="eye" size={12} /> Open task
        </Button>
        <Icon name="chevronRight" size={14} className="tk-row__chev" />
      </span>
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
