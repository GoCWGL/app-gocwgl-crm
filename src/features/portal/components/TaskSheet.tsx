"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, FormError, Icon, Input, SegmentedControl, Textarea, type IconName } from "@/components/ui";
import { toneClass } from "@/lib/tones";
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

/** Requested → In progress → In review → Done. */
export function TaskSteps({ status }: { status: TaskFields["status"] }) {
  if (status === "cancelled") return null;
  const step = PROJECT_FLOW.indexOf(status);
  return (
    <ol className="rq-steps tk-steps" aria-label="Progress">
      {PROJECT_FLOW.map((s, i) => {
        const done = i < step || status === "done";
        return (
          <li key={s} className={cn(done && "is-done", i === step && status !== "done" && "is-now")}>
            <span className="rq-steps__dot" aria-hidden="true">
              {done && <Icon name="check" size={9} />}
            </span>
            <span className="rq-steps__label">{PROJECT_STATUS[s].label}</span>
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
      <Field label="Details" htmlFor="tk-edit-details">
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
        <Field label="Due date" htmlFor="tk-edit-due">
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

/**
 * Everything about one task, laid out the same in the client portal and the VA portal: status and progress, the key
 * fields, the details (editable by the client and the task's VAs while it's open), the subtasks checklist, every link,
 * GoCWGL's note and the actions for whoever's looking, with the conversation beside it.
 */
export function TaskSheet({
  t,
  people,
  actions,
  emptyDetails,
  conversation,
  edit,
  subtasks,
}: {
  t: TaskFields;
  /** Who's on it, from this side: the client (VA portal) or the assigned VA (client portal). */
  people: { icon: IconName; label: string; value: ReactNode };
  /** Status change (VA) or VA pick and cancel (client). */
  actions?: ReactNode;
  emptyDetails: string;
  /** The task's conversation, shown beside the details (below them on narrow screens). */
  conversation?: ReactNode;
  /** Editing the task, when this person can (left out: read only). */
  edit?: { save: (edits: TaskEdits, done: () => void) => void; saving: boolean; error: unknown; reset: () => void };
  /** The subtasks checklist's actions; canEdit off when read only or cancelled. */
  subtasks?: { actions: SubtaskActions; canEdit: boolean; emptyHint: string };
}) {
  const [editing, setEditing] = useState(false);
  const overdue = isTaskOverdue(t);
  const facts: Array<{ icon: IconName; label: string; value: ReactNode; late?: boolean }> = [
    people,
    {
      icon: "clock",
      label: overdue ? "Overdue since" : "Due date",
      value: t.dueDate ? formatShort(t.dueDate) : <span className="tk-props__none">No due date</span>,
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
    { icon: "user", label: "Requested by", value: t.requestedByName || "The client" },
    { icon: "calendar", label: "Requested on", value: formatShort(t.createdAt) },
    { icon: t.completedAt ? "circleCheck" : "edit", label: t.completedAt ? "Completed" : "Last updated", value: formatShort(t.completedAt ?? t.updatedAt) },
  ];

  const sheet = (
    <div className="tk-sheet">
      <div className="tk-sheet__top">
        <div className="tk-sheet__status">
          <TaskStatus status={t.status} />
          {overdue && (
            <span className="tk-chip tk-chip--late">
              <Icon name="clock" size={11} /> Overdue
            </span>
          )}
          <span className="u-spacer" />
          {edit && !editing && (
            <Button size="sm" onClick={() => (edit.reset(), setEditing(true))}>
              <Icon name="edit" size={13} /> Edit task
            </Button>
          )}
        </div>
        <TaskSteps status={t.status} />
      </div>

      {editing && edit ? (
        <TaskEditForm
          t={t}
          saving={edit.saving}
          error={edit.error}
          onCancel={() => setEditing(false)}
          onSave={(edits) => edit.save(edits, () => setEditing(false))}
        />
      ) : (
        <>
          <dl className="tk-props">
            {facts.map((f) => (
              <div key={f.label} className="tk-props__row">
                <dt>
                  <Icon name={f.icon} size={14} /> {f.label}
                </dt>
                <dd className={cn(f.late && "is-late")}>{f.value}</dd>
              </div>
            ))}
          </dl>

          <section className="tk-sheet__section">
            <h4 className="tk-sheet__h">
              <Icon name="textLong" size={14} /> Description
            </h4>
            {t.details ? (
              <div className="tk-sheet__details">{t.details}</div>
            ) : edit ? (
              <button type="button" className="tk-sheet__add-details" onClick={() => (edit.reset(), setEditing(true))}>
                <Icon name="plus" size={13} /> Add details about this task
              </button>
            ) : (
              <p className="tk-sheet__muted">{emptyDetails}</p>
            )}
          </section>
        </>
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

      {actions && <div className="tk-sheet__actions">{actions}</div>}
    </div>
  );
  if (!conversation) return sheet;
  return (
    <div className="tk-sheet-wrap">
      <div className="tk-sheet-wrap__main">{sheet}</div>
      <div className="tk-sheet-wrap__side">{conversation}</div>
    </div>
  );
}
