"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SubtaskOut } from "@/utils/api/models";
import { errorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import type { SubtaskActions } from "@/utils/hooks/useSubtasks";

/** The round check a subtask is ticked off with (Asana-style): an outline that fills green with a check. */
function CheckCircle({ done, label, disabled, onToggle }: { done: boolean; label: string; disabled?: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      className={cn("tk-check", done && "is-done")}
      disabled={disabled || !onToggle}
      onClick={onToggle}
    >
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path d="M3.5 8.4l2.9 2.9 6.1-6.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** One subtask: tick it off, click its name to rename it, or remove it. */
function SubtaskRow({ s, canEdit, actions, taskId }: { s: SubtaskOut; canEdit: boolean; actions: SubtaskActions; taskId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.title);
  const [justDone, setJustDone] = useState(false);
  const save = () => {
    setEditing(false);
    const title = draft.trim();
    if (title && title !== s.title) actions.update(taskId, s.id, { title }).catch(() => setDraft(s.title));
    else setDraft(s.title);
  };
  const toggle = () => {
    if (!s.done) {
      setJustDone(true);
      window.setTimeout(() => setJustDone(false), 600);
    }
    actions.update(taskId, s.id, { done: !s.done }).catch(() => undefined);
  };
  const meta = s.done
    ? `Done${s.doneByName ? ` by ${s.doneByName}` : ""}${s.doneAt ? ` · ${formatShort(s.doneAt)}` : ""}`
    : s.createdByName
      ? `Added by ${s.createdByName}`
      : "";
  return (
    <li className={cn("tk-subs__row", s.done && "is-done", justDone && "is-pop", editing && "is-editing")}>
      <CheckCircle done={s.done} label={s.done ? `Mark “${s.title}” not done` : `Mark “${s.title}” done`} onToggle={canEdit ? toggle : undefined} />
      {editing ? (
        <input
          className="tk-subs__input"
          value={draft}
          maxLength={300}
          aria-label="Subtask name"
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setDraft(s.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="tk-subs__title"
          disabled={!canEdit}
          title={canEdit ? "Click to rename" : undefined}
          onClick={() => (setDraft(s.title), setEditing(true))}
        >
          {s.title}
        </button>
      )}
      {!editing && meta && <span className="tk-subs__meta">{meta}</span>}
      {canEdit && !editing && (
        <button type="button" className="tk-subs__remove" aria-label={`Remove “${s.title}”`} title="Remove" onClick={() => actions.remove(taskId, s.id).catch(() => undefined)}>
          <Icon name="trash" size={13} />
        </button>
      )}
    </li>
  );
}

/**
 * A task's subtasks, like a checklist both the client and the task's VAs keep: round checks to tick each step off, a
 * progress bar, and "Add subtask" (Enter adds it and opens the next one, Escape stops).
 */
export function TaskSubtasks({
  taskId,
  subtasks,
  actions,
  canEdit,
  emptyHint,
  max = 50,
}: {
  taskId: string;
  subtasks: SubtaskOut[];
  actions: SubtaskActions;
  /** Off when read-only (staff viewing) or the task is cancelled. */
  canEdit: boolean;
  /** Shown while there are none yet, e.g. who else can tick them off. */
  emptyHint: string;
  max?: number;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = [...subtasks].sort((a, b) => a.position - b.position);
  const done = list.filter((s) => s.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setError("");
    actions.add(taskId, title).catch((err) => {
      setDraft(title);
      setError(errorMessage(err));
    });
    input.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setDraft("");
      setAdding(false);
    }
  };

  return (
    <section className="tk-subs" aria-label="Subtasks">
      <header className="tk-subs__head">
        <h4 className="tk-sheet__h">
          <Icon name="circleCheck" size={14} /> Subtasks
        </h4>
        {list.length > 0 && (
          <span className={cn("tk-subs__tally", done === list.length && "is-complete")}>
            {done} of {list.length} done
          </span>
        )}
      </header>
      {list.length > 0 && (
        <div className="tk-subs__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Subtasks done">
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
      {list.length > 0 && (
        <ul className="tk-subs__list">
          {list.map((s) => (
            <SubtaskRow key={s.id} s={s} canEdit={canEdit} actions={actions} taskId={taskId} />
          ))}
        </ul>
      )}
      {canEdit &&
        list.length < max &&
        (adding ? (
          <div className="tk-subs__row tk-subs__row--new">
            <CheckCircle done={false} label="New subtask" disabled />
            <input
              ref={input}
              className="tk-subs__input"
              value={draft}
              maxLength={300}
              autoFocus
              aria-label="New subtask"
              placeholder="Write a subtask, then press Enter"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => {
                if (draft.trim()) add();
                else setAdding(false);
              }}
            />
          </div>
        ) : (
          <button type="button" className="tk-subs__add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={13} /> Add subtask
          </button>
        ))}
      {!list.length && !canEdit && <p className="tk-sheet__muted">No subtasks on this task.</p>}
      {!list.length && canEdit && !adding && <p className="tk-subs__empty">{emptyHint}</p>}
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </section>
  );
}
