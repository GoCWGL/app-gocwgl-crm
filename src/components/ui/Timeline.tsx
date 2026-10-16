import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PhaseState = "done" | "current" | "upcoming";

type TimelineItemProps = {
  state: PhaseState;
  /** Text inside the node, e.g. "3" or "✓". */
  mark: string;
  /** Hide the connecting line under the last node. */
  last?: boolean;
  children: ReactNode;
};

/** One phase in a vertical build timeline (node + line + card). */
export function TimelineItem({ state, mark, last, children }: TimelineItemProps) {
  return (
    <div className="timeline__item">
      <div className="timeline__rail" aria-hidden="true">
        <span className={cn("timeline__node", state !== "upcoming" && `timeline__node--${state}`)}>{mark}</span>
        {!last && <span className={cn("timeline__line", state === "done" && "timeline__line--done")} />}
      </div>
      <div className={cn("timeline__card", state === "current" && "timeline__card--current")}>{children}</div>
    </div>
  );
}

export function Timeline({ children }: { children: ReactNode }) {
  return <div className="timeline">{children}</div>;
}

/** Read-only task line with a check box. */
export function TaskRow({ text, done }: { text: string; done: boolean }) {
  return (
    <div className={cn("task-row", done && "task-row--done")}>
      <span className={cn("task-row__check", done && "task-row__check--done")} aria-hidden="true">
        {done ? "✓" : ""}
      </span>
      <span className="task-row__text">{text}</span>
    </div>
  );
}
