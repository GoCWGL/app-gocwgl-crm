"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Button, FormError, Icon, Input, LoadState, Modal, SegmentedControl, Select, StatGrid, type IconName } from "@/components/ui";
import { TaskLinkChips } from "@/features/portal/components/TaskLinks";
import { isOpenProject, PRIORITY, PROJECT_FLOW, PROJECT_STATUS } from "@/features/portal/lib/projects";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaTaskOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useUpdateVaTask, useVaTasks } from "@/utils/hooks/useVaPortal";
import { useVaAccess } from "../lib/access";
import { useVa } from "../state/VaContext";

type View = "open" | "done" | "all";
type RangeKey = "any" | "week" | "month" | "next30" | "custom";
type DateField = "created" | "due";
type Sort = "due" | "newest";

/** The next step a VA can take on a task, by its status. */
const NEXT: Partial<Record<VaTaskOut["status"], { to: "in_progress" | "review" | "done"; label: string }>> = {
  requested: { to: "in_progress", label: "Start task" },
  in_progress: { to: "review", label: "Ready for review" },
  review: { to: "done", label: "Mark done" },
};

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
  const all = useMemo(() => query.data ?? [], [query.data]);
  const { goTo } = useVa();
  const [timerNote, setTimerNote] = useState("");

  // Date range: on the requested date or the due date (tasks with no due date only match "Any date").
  const span = range === "custom" ? ([from, to] as [string, string]) : presetRange(range);
  const inRange = (t: VaTaskOut) => {
    if (!span) return true;
    const d = field === "due" ? t.dueDate : t.createdAt.slice(0, 10);
    return !!d && d >= span[0] && d <= span[1];
  };
  const dated = all.filter(inRange);
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

      <div className="card card--flat tk-toolbar">
        <div className="tk-toolbar__row">
          <SegmentedControl
            label="Tasks"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "open", label: "Open", count: open.length },
              { value: "done", label: "Done", count: done.length },
              { value: "all", label: "All", count: dated.length },
            ]}
          />
          <span className="u-spacer" />
          <label className="tk-toolbar__field">
            <span>Sort</span>
            <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} options={[{ value: "due", label: "Due soonest" }, { value: "newest", label: "Newest first" }]} />
          </label>
        </div>
        <div className="tk-toolbar__row">
          <label className="tk-toolbar__field">
            <span>Dates by</span>
            <Select size="sm" value={field} onChange={(e) => setField(e.target.value as DateField)} options={[{ value: "due", label: "Due date" }, { value: "created", label: "Requested date" }]} />
          </label>
          <SegmentedControl label="Date range" size="sm" value={range} onChange={setRange} options={RANGES} />
          {range === "custom" ? (
            <span className="cp-toolbar__dates">
              <Input type="date" size="sm" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              <span aria-hidden="true">–</span>
              <Input type="date" size="sm" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </span>
          ) : (
            span && (
              <span className="cp-toolbar__range">
                <Icon name="calendar" size={14} /> {formatShort(span[0])} – {formatShort(span[1])}
              </span>
            )
          )}
        </div>
      </div>

      <LoadState
        query={query}
        loadingText="Loading your tasks…"
        isEmpty={!shown.length}
        empty={
          span
            ? "No tasks in these dates. Try another range."
            : view === "open"
              ? "No open tasks. When a client requests a task and picks you, it shows up here."
              : "No finished tasks yet."
        }
      >
        <div className="tk-grid">
          {shown.map((t) => (
            <TaskCard key={t.id} t={t} readOnly={readOnly} />
          ))}
        </div>
      </LoadState>
    </div>
    </TimerNotice.Provider>
  );
}

function Steps({ t }: { t: VaTaskOut }) {
  if (t.status === "cancelled") return null;
  const step = PROJECT_FLOW.indexOf(t.status);
  return (
    <ol className="rq-steps tk-card__steps" aria-label="Progress">
      {PROJECT_FLOW.map((s, i) => {
        const doneStep = i < step || t.status === "done";
        return (
          <li key={s} className={cn(doneStep && "is-done", i === step && t.status !== "done" && "is-now")}>
            <span className="rq-steps__dot" aria-hidden="true">
              {doneStep && <Icon name="check" size={9} />}
            </span>
            <span className="rq-steps__label">{PROJECT_STATUS[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The one-click step forward (or Reopen on a finished task). */
/** The one-click step forward (or Reopen on a finished task). Start task also starts their timer for the client. */
function NextButton({ t, size, onDone }: { t: VaTaskOut; size?: "sm"; onDone?: () => void }) {
  const update = useUpdateVaTask();
  const onTimer = useTimerNotice();
  const next = NEXT[t.status];
  if (t.status === "done") {
    return (
      <Button size={size} variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: t.id, status: "in_progress" })}>
        Reopen
      </Button>
    );
  }
  if (!next) return null;
  return (
    <Button
      size={size}
      variant="primary"
      disabled={update.isPending}
      title={t.status === "requested" ? `Also starts your timer for ${t.clientName || "this client"}` : undefined}
      onClick={() =>
        update.mutate(
          { id: t.id, status: next.to },
          {
            onSuccess: (res) => {
              if (res.timerStarted) onTimer(`Timer started for ${res.clientName || "your client"}: “${res.title}”.`);
              onDone?.();
            },
          },
        )
      }
    >
      {t.status === "requested" && <Icon name="play" size={12} />}
      {next.label} <Icon name="arrowRight" size={12} />
    </Button>
  );
}

function TaskCard({ t, readOnly }: { t: VaTaskOut; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(t);

  return (
    <article className={cn("tk-card", `is-${t.status}`)}>
      <header className="tk-card__head">
        <span className={cn("tk-status", toneClass(PROJECT_STATUS[t.status].tone))}>
          <span className="tk-status__dot" aria-hidden="true" />
          {PROJECT_STATUS[t.status].label}
        </span>
        {t.priority !== "normal" && (
          <span className={cn("tk-chip", toneClass(PRIORITY[t.priority].tone))}>
            <Icon name="bolt" size={11} /> {PRIORITY[t.priority].label}
          </span>
        )}
        <span className="u-spacer" />
        <span className="tk-client">
          <Icon name="building" size={12} /> {t.clientName || "Your client"}
        </span>
      </header>

      <h3 className="tk-card__title">{t.title}</h3>

      <dl className="tk-dates">
        <div>
          <dt>Requested</dt>
          <dd>{formatShort(t.createdAt)}</dd>
        </div>
        <div className={cn(overdue && "is-late")}>
          <dt>{overdue ? "Overdue" : "Due"}</dt>
          <dd>{t.dueDate ? formatShort(t.dueDate) : "—"}</dd>
        </div>
        <div>
          <dt>{t.completedAt ? "Done" : "Updated"}</dt>
          <dd>{formatShort(t.completedAt ?? t.updatedAt)}</dd>
        </div>
      </dl>

      <Steps t={t} />

      {t.details && <p className="tk-card__desc vr-clamp">{t.details}</p>}
      <TaskLinkChips links={t.links} max={3} />

      <footer className="tk-card__foot">
        <button type="button" className="rq-link" onClick={() => setOpen(true)}>
          <Icon name="eye" size={13} /> View details
        </button>
        {!readOnly && <NextButton t={t} size="sm" />}
      </footer>
      {open && <TaskDrawer t={t} readOnly={readOnly} onClose={() => setOpen(false)} />}
    </article>
  );
}

/** Everything about one task: who asked, when, how urgent, the full details, links and GoCWGL's note. */
function TaskDrawer({ t, readOnly, onClose }: { t: VaTaskOut; readOnly: boolean; onClose: () => void }) {
  const update = useUpdateVaTask();
  const overdue = isOverdue(t);
  const facts: Array<{ icon: IconName; label: string; value: string; late?: boolean }> = [
    { icon: "building", label: "Client", value: t.clientName || "Your client" },
    { icon: "user", label: "Requested by", value: t.requestedByName || "The client" },
    { icon: "bolt", label: "Priority", value: PRIORITY[t.priority].label },
    { icon: "clock", label: overdue ? "Overdue since" : "Due", value: t.dueDate ? formatShort(t.dueDate) : "No due date", late: overdue },
  ];
  const timeline: Array<{ label: string; at: string | null | undefined }> = [
    { label: "Requested", at: t.createdAt },
    { label: "Last updated", at: t.updatedAt },
    { label: "Done", at: t.completedAt },
  ];

  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      titleId="va-task"
      kicker={`TASK · ${(t.clientName || "CLIENT").toUpperCase()}`}
      title={t.title}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
          {!readOnly && <NextButton t={t} onDone={onClose} />}
        </>
      }
    >
      <div className="stack stack--20 tk-drawer">
        <FormError error={update.error} />
        <div className="tk-drawer__status">
          <span className={cn("tk-status", toneClass(PROJECT_STATUS[t.status].tone))}>
            <span className="tk-status__dot" aria-hidden="true" />
            {PROJECT_STATUS[t.status].label}
          </span>
          {t.priority !== "normal" && (
            <span className={cn("tk-chip", toneClass(PRIORITY[t.priority].tone))}>
              <Icon name="bolt" size={11} /> {PRIORITY[t.priority].label} priority
            </span>
          )}
        </div>
        <Steps t={t} />

        <div className="rd-facts">
          {facts.map((f) => (
            <div key={f.label} className="rd-fact">
              <span className="rd-fact__icon" aria-hidden="true">
                <Icon name={f.icon} size={15} />
              </span>
              <span className="stack stack--0">
                <span className="rd-fact__label">{f.label}</span>
                <span className={cn("rd-fact__value", f.late && "cp-overdue")}>{f.value}</span>
              </span>
            </div>
          ))}
        </div>

        <section className="rd-block">
          <h4 className="rd-block__title">
            <Icon name="textLong" size={14} /> Details
          </h4>
          <p className="rd-block__text">{t.details || "The client didn’t add details. Ask GoCWGL from Request Support if anything’s unclear."}</p>
        </section>

        {t.links.length > 0 && (
          <section className="rd-block">
            <h4 className="rd-block__title">
              <Icon name="link" size={14} /> Links from the client
            </h4>
            <TaskLinkChips links={t.links} />
          </section>
        )}

        {t.teamNote && (
          <section className="rd-important">
            <span className="rd-important__icon" aria-hidden="true">
              <Icon name="message" size={15} />
            </span>
            <span className="stack stack--2">
              <strong>Note from GoCWGL</strong>
              <span>{t.teamNote}</span>
            </span>
          </section>
        )}

        <section className="rd-block">
          <h4 className="rd-block__title">
            <Icon name="calendar" size={14} /> Timeline
          </h4>
          <ul className="jr-timeline">
            {timeline
              .filter((x) => x.at)
              .map((x) => (
                <li key={x.label}>
                  <b>{x.label}</b> {formatShort(x.at as string)}
                </li>
              ))}
            {t.dueDate && (
              <li className={cn(overdue && "cp-overdue")}>
                <b>Due</b> {formatShort(t.dueDate)}
              </li>
            )}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
