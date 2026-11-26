"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Avatar, Button, Field, FormError, Icon, Input, SegmentedControl, Textarea, type IconName } from "@/components/ui";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ClientProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import type { SubtaskActions } from "@/utils/hooks/useSubtasks";
import { isOpenProject, PRIORITY, PROJECT_FLOW, PROJECT_STATUS, type ProjectPriority } from "../lib/projects";
import { LinkInputs, TaskLinkList } from "./TaskLinks";
import { TaskSubtasks } from "./TaskSubtasks";

/** The fields of a client's task request that both the client and the VA see (the same record, so always in step). */
export type TaskFields = Pick<
  ClientProjectOut,
  | "id"
  | "title"
  | "details"
  | "links"
  | "status"
  | "priority"
  | "dueDate"
  | "requestedByName"
  | "teamNote"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
  | "subtasks"
>;

/** What the edit form changes (the client and the task's VAs both can). */
export type TaskEdits = { title: string; details: string; links: string[]; priority: ProjectPriority; dueDate: string | null };

export const isTaskOverdue = (t: Pick<TaskFields, "dueDate" | "status">) =>
  !!t.dueDate && isOpenProject(t as TaskFields) && t.dueDate < new Date().toLocaleDateString("en-CA");

/** Status as a colored pill. */
export function TaskStatus({ status }: { status: TaskFields["status"] }) {
  return (
    <span className={cn("tk-status", toneClass(PROJECT_STATUS[status].tone))}>
      <span className="tk-status__dot" aria-hidden="true" />
      {PROJECT_STATUS[status].label}
    </span>
  );
}

/** Moving a task from its status steps: which steps it can go to, and what happens on a click. */
export type StatusMove = {
  can: (to: TaskFields["status"]) => boolean;
  pick: (to: TaskFields["status"]) => void;
  pending?: boolean;
  /** A line under the steps, e.g. "Click a stage to move the task." */
  hint?: ReactNode;
};

/**
 * Requested → In progress → In review → Done, with the current stage marked. With `move`, each stage it can go to is a
 * button: the status and moving it are one control.
 */
export function TaskSteps({ status, vertical, move }: { status: TaskFields["status"]; vertical?: boolean; move?: StatusMove }) {
  if (status === "cancelled") return null;
  const step = PROJECT_FLOW.indexOf(status);
  return (
    <ol className={cn("rq-steps tk-steps", vertical && "rq-steps--vertical", move && "is-movable")} aria-label="Status">
      {PROJECT_FLOW.map((s, i) => {
        const done = i < step || status === "done";
        const now = s === status;
        const inner = (
          <>
            <span className="rq-steps__dot" aria-hidden="true">
              {done && <Icon name="check" size={9} />}
            </span>
            <span className="rq-steps__label">{PROJECT_STATUS[s].label}</span>
            {now && <span className="rq-steps__now">Current</span>}
            {!now && move?.can(s) && (
              <span className="rq-steps__go" aria-hidden="true">
                Move here <Icon name="arrowRight" size={11} />
              </span>
            )}
          </>
        );
        return (
          <li key={s} className={cn(done && "is-done", now && status !== "done" && "is-now", now && "is-current")}>
            {move && !now && move.can(s) ? (
              <button type="button" className="rq-steps__btn" disabled={move.pending} onClick={() => move.pick(s)} aria-label={`Move to ${PROJECT_STATUS[s].label}`}>
                {inner}
              </button>
            ) : (
              <span className="rq-steps__btn" aria-current={now ? "step" : undefined}>
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The task's title, details, links, priority and due date as a form. */
function TaskEditForm({
  t,
  saving,
  error,
  onSave,
  onCancel,
}: {
  t: TaskFields;
  saving: boolean;
  error: unknown;
  onSave: (edits: TaskEdits) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(t.title);
  const [details, setDetails] = useState(t.details);
  const [links, setLinks] = useState<string[]>(t.links);
  const [priority, setPriority] = useState<ProjectPriority>(t.priority);
  const [dueDate, setDueDate] = useState(t.dueDate ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), details: details.trim(), links: links.map((l) => l.trim()).filter(Boolean), priority, dueDate: dueDate || null });
  };
  return (
    <form className="tk-edit" onSubmit={submit} autoComplete="off">
      <div className="tk-edit__head">
        <span className="tk-edit__badge">
          <Icon name="edit" size={13} />
        </span>
        <span className="stack stack--0">
          <strong>Edit task</strong>
          <span>Everyone on the task sees your changes right away.</span>
        </span>
      </div>
      <FormError error={error} />
      <Field label="Title" htmlFor="tk-edit-title" required>
        <Input id="tk-edit-title" value={title} maxLength={160} autoFocus onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description" htmlFor="tk-edit-details">
        <Textarea
          id="tk-edit-details"
          rows={6}
          value={details}
          maxLength={5000}
          placeholder="Steps, examples, what done looks like…"
          onChange={(e) => setDetails(e.target.value)}
        />
      </Field>
      <div className="tk-edit__grid">
        <Field label="Priority">
          <SegmentedControl
            label="Priority"
            size="sm"
            value={priority}
            onChange={setPriority}
            options={(["low", "normal", "high"] as const).map((v) => ({ value: v, label: PRIORITY[v].label }))}
          />
        </Field>
        <Field label="Deadline" htmlFor="tk-edit-due">
          <Input id="tk-edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Links">
        <LinkInputs value={links} onChange={setLinks} idPrefix="tk-edit-link" />
      </Field>
      <div className="tk-edit__foot">
        <Button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** A pop-up's two columns: the work on the left (description, subtasks, links, comments), its details on the right. */
export function DetailLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="tk-detail">
      <div className="tk-detail__main">{main}</div>
      <aside className="tk-detail__side" aria-label="Details">
        {side}
      </aside>
    </div>
  );
}

/** One card in the right column, with a small heading. */
export function SideCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("tk-side", className)}>
      <header className="tk-side__head">
        <h4>{title}</h4>
        {action}
      </header>
      {children}
    </section>
  );
}

export type SideFact = { icon: IconName; label: string; value: ReactNode; late?: boolean };

/** Label/value rows in a side card (client, deadline, priority, status, last update…). */
export function SideFacts({ facts }: { facts: SideFact[] }) {
  return (
    <dl className="tk-facts">
      {facts.map((f) => (
        <div key={f.label} className="tk-facts__row">
          <dt>
            <Icon name={f.icon} size={14} /> {f.label}
          </dt>
          <dd className={cn(f.late && "is-late")}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The people on it, as avatars with their part (main VA, backup…). */
export function PeopleList({ people, empty }: { people: Array<{ id: string; name: string; note?: string }>; empty: string }) {
  if (!people.length) return <p className="tk-people__empty">{empty}</p>;
  return (
    <ul className="tk-people">
      {people.map((p) => (
        <li key={p.id}>
          <Avatar name={p.name} tone={avatarTone(p.id)} size="sm" />
          <span className="stack stack--0">
            <strong>{p.name}</strong>
            {p.note && <span>{p.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A side card for who's on it, with "Change" opening the picker when this person can change it. */
export function PeopleCard({
  title,
  people,
  empty,
  change,
}: {
  title: string;
  people: Array<{ id: string; name: string; note?: string }>;
  empty: string;
  change?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SideCard
      title={title}
      action={
        change ? (
          <button type="button" className="tk-side__link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Done" : "Change"}
          </button>
        ) : undefined
      }
    >
      {open && change ? <div className="tk-side__picker">{change}</div> : <PeopleList people={people} empty={empty} />}
    </SideCard>
  );
}

/** The status and its progress as one: the steps with the current one marked (a cancelled task shows its pill). */
export function StatusProgress({ status, extra, move }: { status: TaskFields["status"]; extra?: ReactNode; move?: StatusMove }) {
  return (
    <>
      {(status === "cancelled" || extra) && (
        <div className="tk-sheet__status">
          {status === "cancelled" && <TaskStatus status={status} />}
          {extra}
        </div>
      )}
      <TaskSteps status={status} vertical move={move} />
      {move?.hint && status !== "cancelled" && <p className="tk-steps__hint">{move.hint}</p>}
    </>
  );
}

/**
 * Everything about one task, laid out the same in the client portal and the VA portal, like a Trello card: the
 * description, subtasks checklist, links and the comments and activity on the left; on the right its status and
 * progress, who's on it, the details (client, deadline, priority, status, last update), GoCWGL's note and the actions
 * for whoever's looking.
 */
export function TaskSheet({
  t,
  people,
  assignees,
  move,
  actions,
  emptyDetails,
  conversation,
  edit,
  subtasks,
}: {
  t: TaskFields;
  /** Who it's for or from, as a detail row: the client (VA portal) or who asked for it (client portal). */
  people: SideFact;
  /** The VAs on it, with the picker to change them when this person can. */
  assignees: { title: string; people: Array<{ id: string; name: string; note?: string }>; empty: string; change?: ReactNode };
  /** Moving it from the Status card's steps (left out: read only). */
  move?: StatusMove;
  /** Anything else this person can do (e.g. cancelling a request). */
  actions?: ReactNode;
  emptyDetails: string;
  /** The task's comments and activity, below the links. */
  conversation?: ReactNode;
  /** Editing the task, when this person can (left out: read only). */
  edit?: { save: (edits: TaskEdits, done: () => void) => void; saving: boolean; error: unknown; reset: () => void };
  /** The subtasks checklist's actions; canEdit off when read only or cancelled. */
  subtasks?: { actions: SubtaskActions; canEdit: boolean; emptyHint: string };
}) {
  const [editing, setEditing] = useState(false);
  const overdue = isTaskOverdue(t);
  const startEdit = edit ? () => (edit.reset(), setEditing(true)) : undefined;
  const facts: SideFact[] = [
    people,
    {
      icon: "clock",
      label: overdue ? "Overdue since" : "Deadline",
      value: t.dueDate ? formatShort(t.dueDate) : <span className="tk-props__none">No deadline</span>,
      late: overdue,
    },
    {
      icon: "bolt",
      label: "Priority",
      value: (
        <span className={cn("tk-chip", toneClass(PRIORITY[t.priority].tone))}>
          <Icon name="bolt" size={11} /> {PRIORITY[t.priority].label}
        </span>
      ),
    },
    { icon: "calendar", label: "Requested on", value: formatShort(t.createdAt) },
    { icon: t.completedAt ? "circleCheck" : "edit", label: t.completedAt ? "Completed" : "Last update", value: formatShort(t.completedAt ?? t.updatedAt) },
  ];

  const main = (
    <div className="tk-sheet">
      {editing && edit ? (
        <TaskEditForm
          t={t}
          saving={edit.saving}
          error={edit.error}
          onCancel={() => setEditing(false)}
          onSave={(edits) => edit.save(edits, () => setEditing(false))}
        />
      ) : (
        <section className="tk-sheet__section">
          <h4 className="tk-sheet__h">
            <Icon name="textLong" size={14} /> Description
            {startEdit && t.details && (
              <button type="button" className="tk-side__link tk-sheet__h-action" onClick={startEdit}>
                Edit
              </button>
            )}
          </h4>
          {t.details ? (
            <div className="tk-sheet__details">{t.details}</div>
          ) : startEdit ? (
            <button type="button" className="tk-sheet__add-details" onClick={startEdit}>
              <Icon name="plus" size={13} /> Add a more detailed description…
            </button>
          ) : (
            <p className="tk-sheet__muted">{emptyDetails}</p>
          )}
        </section>
      )}

      {subtasks && <TaskSubtasks taskId={t.id} subtasks={t.subtasks ?? []} actions={subtasks.actions} canEdit={subtasks.canEdit} emptyHint={subtasks.emptyHint} />}

      {!editing && (
        <section className="tk-sheet__section">
          <h4 className="tk-sheet__h">
            <Icon name="link" size={14} /> Links {t.links.length > 0 && <span className="tk-sheet__count">{t.links.length}</span>}
          </h4>
          <TaskLinkList links={t.links} />
        </section>
      )}

      {conversation}
    </div>
  );

  const side = (
    <>
      <SideCard title="Status" className="tk-side--status">
        <StatusProgress
          status={t.status}
          move={move}
          extra={
            overdue ? (
              <span className="tk-chip tk-chip--late">
                <Icon name="clock" size={11} /> Overdue
              </span>
            ) : undefined
          }
        />
        {startEdit && !editing && (
          <Button size="sm" className="tk-side__btn" onClick={startEdit}>
            <Icon name="edit" size={13} /> Edit task
          </Button>
        )}
      </SideCard>

      <PeopleCard {...assignees} />

      <SideCard title="Details">
        <SideFacts facts={facts} />
      </SideCard>

      {t.teamNote && (
        <section className="rd-important">
          <span className="rd-important__icon" aria-hidden="true">
            <Icon name="message" size={15} />
          </span>
          <span className="stack stack--2">
            <strong>Note from GoCWGL</strong>
            <span className="va-pre">{t.teamNote}</span>
          </span>
        </section>
      )}

      {actions && (
        <SideCard title="Actions" className="tk-side--actions">
          {actions}
        </SideCard>
      )}
    </>
  );

  return <DetailLayout main={main} side={side} />;
}
