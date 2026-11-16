"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ClientProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { isOpenProject, PRIORITY, PROJECT_FLOW, PROJECT_STATUS } from "../lib/projects";
import { TaskLinkList } from "./TaskLinks";

/** The fields of a client's task request that both the client and the VA see (the same record, so always in step). */
export type TaskFields = Pick<
  ClientProjectOut,
  "title" | "details" | "links" | "status" | "priority" | "dueDate" | "requestedByName" | "teamNote" | "createdAt" | "updatedAt" | "completedAt"
>;

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
    <ol className="rq-steps" aria-label="Progress">
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

/**
 * Everything about one task, laid out the same in the client portal and the VA portal: status and progress, the
 * actions for whoever's looking, the full details, every link, GoCWGL's note and the key facts and dates.
 */
export function TaskSheet({
  t,
  people,
  actions,
  emptyDetails,
  conversation,
}: {
  t: TaskFields;
  /** Who's on it, from this side: the client (VA portal) or the assigned VA (client portal). */
  people: { icon: IconName; label: string; value: ReactNode };
  /** Status change (VA) or VA pick and cancel (client). */
  actions?: ReactNode;
  emptyDetails: string;
  /** The task's conversation, shown beside the details (below them on narrow screens). */
  conversation?: ReactNode;
}) {
  const overdue = isTaskOverdue(t);
  const facts: Array<{ icon: IconName; label: string; value: ReactNode; late?: boolean }> = [
    people,
    { icon: "user", label: "Requested by", value: t.requestedByName || "The client" },
    { icon: "bolt", label: "Priority", value: PRIORITY[t.priority].label },
    { icon: "clock", label: overdue ? "Overdue since" : "Due date", value: t.dueDate ? formatShort(t.dueDate) : "No due date", late: overdue },
    { icon: "calendar", label: "Requested on", value: formatShort(t.createdAt) },
    { icon: t.completedAt ? "circleCheck" : "edit", label: t.completedAt ? "Completed" : "Last updated", value: formatShort(t.completedAt ?? t.updatedAt) },
  ];

  const sheet = (
    <div className="tk-sheet">
      <div className="tk-sheet__status">
        <TaskStatus status={t.status} />
        {t.priority !== "normal" && (
          <span className={cn("tk-chip", toneClass(PRIORITY[t.priority].tone))}>
            <Icon name="bolt" size={11} /> {PRIORITY[t.priority].label} priority
          </span>
        )}
        {overdue && (
          <span className="tk-chip tk-chip--late">
            <Icon name="clock" size={11} /> Overdue
          </span>
        )}
        <span className="u-spacer" />
        <span className="tk-sheet__by">
          Requested {formatShort(t.createdAt)}
          {t.requestedByName && ` by ${t.requestedByName}`}
        </span>
      </div>
      <TaskSteps status={t.status} />

      {actions && <div className="tk-sheet__actions">{actions}</div>}

      <section className="tk-sheet__section">
        <h4 className="tk-sheet__h">
          <Icon name="textLong" size={14} /> Task details
        </h4>
        {t.details ? <div className="tk-sheet__details">{t.details}</div> : <p className="tk-sheet__muted">{emptyDetails}</p>}
      </section>

      <section className="tk-sheet__section">
        <h4 className="tk-sheet__h">
          <Icon name="link" size={14} /> Links {t.links.length > 0 && <span className="tk-sheet__count">{t.links.length}</span>}
        </h4>
        <TaskLinkList links={t.links} />
      </section>

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
              <dd className={cn(f.late && "is-late")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
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
