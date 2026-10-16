"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Badge, Button, Field, ProgressBar, TaskRow, Textarea, Timeline, TimelineItem } from "@/components/ui";
import { BUILD_DUE, type Todo } from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getBuildProgress } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

const PHASE_TONES = { Done: "green", "In progress": "brand", "Up next": "neutral" } as const;

export function BuildSection() {
  const { state, update } = usePortal();
  const [message, setMessage] = useState("");
  const build = getBuildProgress();
  const openCount = state.todos.filter((t) => !t.done).length;

  const markDone = (todo: Todo) =>
    update((s) => ({
      todos: s.todos.map((t) => (t.id === todo.id ? { ...t, done: true } : t)),
      toast: "Thanks! Your GoCWGL team has been notified.",
    }));

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage("");
    update((s) => ({
      updates: [{ who: "You", date: TODAY_SHORT, text }, ...s.updates],
      toast: "Sent to your GoCWGL team.",
    }));
  };

  return (
    <div className="split">
      <div className="split__main stack stack--16">
        <section className="build-hero">
          <div className="stack stack--2">
            <span className="kicker">REVENUE ENGINE SYSTEM</span>
            <span className="text-muted">
              Started Oct 6 · Target launch {BUILD_DUE} · Status: <strong className="u-green">On track</strong>
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
            <TimelineItem
              key={phase.name}
              state={phase.state}
              mark={phase.state === "done" ? "✓" : String(i + 1)}
              last={i === build.phases.length - 1}
            >
              <div className="cluster cluster--nowrap">
                <span className="text-strong u-grow">{phase.name}</span>
                <Badge tone={PHASE_TONES[phase.label]}>{phase.label}</Badge>
              </div>
              {phase.tasks.map((t) => (
                <TaskRow key={t.text} text={t.text} done={t.done} />
              ))}
            </TimelineItem>
          ))}
        </Timeline>
      </div>

      <div className="split__side stack stack--16">
        <section className="card card--waiting">
          <span className="kicker kicker--amber">WAITING ON YOU · {openCount}</span>
          {state.todos.map((todo) => (
            <div key={todo.id} className={cn("todo-card", todo.done && "todo-card--done")}>
              <div className="stack stack--2">
                <span className="text-strong todo-card__title">{todo.title}</span>
                <span className="text-small">{todo.desc}</span>
              </div>
              <span className="todo-card__meta">
                <span className="todo-card__docs">
                  {todo.docs.length} document{todo.docs.length === 1 ? "" : "s"}
                </span>
                {todo.changesRequested && !todo.done && <Badge tone="purple">Changes requested</Badge>}
              </span>
              <div className="cluster cluster--8 cluster--nowrap">
                <Button variant="outline" size="sm" className="u-grow" onClick={() => update({ openTodoId: todo.id })}>
                  View details
                </Button>
                {!todo.done && (
                  <Button variant="primary" size="sm" className="u-grow" onClick={() => markDone(todo)}>
                    {todo.action}
                  </Button>
                )}
              </div>
              {todo.done && <span className="todo-card__thanks">✓ Done — thanks!</span>}
            </div>
          ))}
        </section>

        <section className="card">
          <span className="kicker">UPDATES FROM YOUR TEAM</span>
          <div>
            {state.updates.map((u, i) => {
              const mine = u.who === "You";
              const style = { "--dot": mine ? "#7C3AED" : "#FF9900", "--who": mine ? "#6D28D9" : "#8A4500" } as CSSProperties;
              return (
                <div className="update-row" key={i} style={style}>
                  <span className="update-row__dot" aria-hidden="true" />
                  <div className="stack stack--2">
                    <span className="update-row__date">
                      {u.who} · {u.date}
                    </span>
                    <span className="update-row__text">{u.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="stack stack--8" onSubmit={sendMessage}>
            <Field label="Reply or give feedback" htmlFor="bd-msg">
              <Textarea
                id="bd-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Love the landing page! Can we change the headline color?"
              />
            </Field>
            <Button type="submit" variant="primary" className="u-self-end">
              Send
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
