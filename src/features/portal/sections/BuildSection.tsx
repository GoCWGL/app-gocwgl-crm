"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, LoadState, ProgressBar, TaskRow, Textarea, Timeline, TimelineItem } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { usePortalBuild } from "@/utils/hooks/useDelivery";
import { useCompleteTodo, usePortalTodos } from "@/utils/hooks/usePortal";
import { useSendPortalMessage } from "@/utils/hooks/useSupport";
import { getBuildProgress } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

const PHASE_TONES = { Done: "green", "In progress": "brand", "Up next": "neutral" } as const;
const STATUS_CLASS: Record<string, string> = { "On track": "u-green", "At risk": "u-pink", "Waiting on client": "u-amber", Launched: "u-green" };

export function BuildSection() {
  const { update, readOnly } = usePortal();
  const buildQuery = usePortalBuild();
  const todosQuery = usePortalTodos();
  const complete = useCompleteTodo();
  const sendMessage = useSendPortalMessage();
  const [message, setMessage] = useState("");
  const todos = todosQuery.data ?? [];
  const openCount = todos.filter((t) => !t.done).length;
  const project = buildQuery.data;
  const build = project ? getBuildProgress(project) : null;

  // Feedback goes to the team as a portal message.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    sendMessage.mutate(text, {
      onSuccess: () => {
        setMessage("");
        update({ toast: "Sent to your GoCWGL team." });
      },
    });
  };

  return (
    <div className="split">
      <div className="split__main stack stack--16">
        <LoadState query={buildQuery} loadingText="Loading your build…">
          {!project || !build ? (
            <div className="empty-state">
              Your GoCWGL team hasn’t started your build yet. Once they do, every phase and task shows up here as it gets done.
            </div>
          ) : (
            <>
              <section className="build-hero">
                <div className="stack stack--2">
                  <span className="kicker">{project.package.toUpperCase()}</span>
                  <span className="text-muted">
                    Started {formatShort(project.startDate)}
                    {project.dueDate && ` · Target launch ${formatShort(project.dueDate)}`} · Status:{" "}
                    <strong className={STATUS_CLASS[project.status] ?? "u-ink"}>{project.status}</strong>
                  </span>
                </div>
                <div className="build-hero__progress">
                  <span className="build-hero__pct">{build.percent}%</span>
                  <div className="stack stack--6 u-grow">
                    <ProgressBar value={build.percent} variant="glow" size="lg" label="Build progress" />
                    <span className="text-small">{build.summary}</span>
                  </div>
                </div>
              </section>

              <Timeline>
                {build.phases.map((phase, i) => (
                  <TimelineItem key={`${i}-${phase.name}`} state={phase.state} mark={phase.state === "done" ? "✓" : String(i + 1)} last={i === build.phases.length - 1}>
                    <div className="cluster cluster--nowrap">
                      <span className="text-strong u-grow">{phase.name}</span>
                      <Badge tone={PHASE_TONES[phase.label]}>{phase.label}</Badge>
                    </div>
                    {phase.tasks.map((t, k) => (
                      <TaskRow key={`${k}-${t.text}`} text={t.text} done={t.done} />
                    ))}
                  </TimelineItem>
                ))}
              </Timeline>
            </>
          )}
        </LoadState>
      </div>

      <div className="split__side stack stack--16">
        <section className="card card--waiting">
          <span className="kicker kicker--amber">WAITING ON YOU · {openCount}</span>
          <FormError error={complete.error} />
          <LoadState query={todosQuery} inline isEmpty={!todos.length} empty="Nothing is waiting on you right now.">
            {todos.map((todo) => (
              <div key={todo.id} className={cn("todo-card", todo.done && "todo-card--done")}>
                <div className="stack stack--2">
                  <span className="text-strong todo-card__title">{todo.title}</span>
                  <span className="text-small">{todo.description}</span>
                </div>
                <span className="todo-card__meta">
                  <span className="todo-card__docs">
                    {todo.fileIds.length} document{todo.fileIds.length === 1 ? "" : "s"}
                  </span>
                  {todo.changesRequested && !todo.done && <Badge tone="purple">Changes requested</Badge>}
                </span>
                <div className="cluster cluster--8 cluster--nowrap">
                  <Button variant="outline" size="sm" className="u-grow" onClick={() => update({ openTodoId: todo.id })}>
                    View details
                  </Button>
                  {!todo.done && !readOnly && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="u-grow"
                      disabled={complete.isPending}
                      onClick={() => complete.mutate(todo.id, { onSuccess: () => update({ toast: "Thanks! Your GoCWGL team has been notified." }) })}
                    >
                      {todo.actionLabel}
                    </Button>
                  )}
                </div>
                {todo.done && <span className="todo-card__thanks">✓ Done — thanks!</span>}
              </div>
            ))}
          </LoadState>
        </section>

        <section className="card">
          <span className="kicker">UPDATES FROM YOUR TEAM</span>
          <div>
            {(project?.updates ?? []).length === 0 && <p className="text-muted">No updates yet.</p>}
            {project?.updates.map((u) => (
              <div className="update-row" key={u.id}>
                <span className="update-row__dot" aria-hidden="true" />
                <div className="stack stack--2">
                  <span className="update-row__date">
                    {u.author || "GoCWGL team"} · {formatShort(u.createdAt)}
                  </span>
                  <span className="update-row__text">{u.text}</span>
                </div>
              </div>
            ))}
          </div>
          {!readOnly && (
            <form className="stack stack--8" onSubmit={submit}>
              <Field label="Reply or give feedback" htmlFor="bd-msg">
                <Textarea
                  id="bd-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Love the landing page! Can we change the headline color?"
                />
              </Field>
              <FormError error={sendMessage.error} />
              <Button type="submit" variant="primary" className="u-self-end" disabled={sendMessage.isPending}>
                {sendMessage.isPending ? "Sending…" : "Send"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
