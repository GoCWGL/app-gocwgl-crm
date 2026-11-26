"use client";

import { useRef, useState, type ReactNode } from "react";
import { ConfirmDialog, Icon, type IconName } from "@/components/ui";
import type { ProjectStatus } from "../lib/projects";
import { PROJECT_STATUS } from "../lib/projects";
import { TaskStatus } from "./TaskSheet";

/** The answer was Cancel (not a failed save): nothing to report. */
export class NotMoved extends Error {}

type Ask = { title: string; from: ProjectStatus; to: ProjectStatus; note?: ReactNode; icon?: IconName };

/**
 * Asks before a task changes status from a board drop. `ask` waits for the answer: it resolves on "Yes" and rejects
 * on Cancel, so the board puts the card back. Render `dialog` beside the board.
 */
export function useConfirmMove() {
  const [asking, setAsking] = useState<Ask | null>(null);
  const answer = useRef<{ yes: () => void; no: () => void } | null>(null);
  const ask = (a: Ask) =>
    new Promise<void>((yes, no) => {
      answer.current?.no();
      answer.current = { yes, no: () => no(new NotMoved("Not moved.")) };
      setAsking(a);
    });
  const close = (ok: boolean) => {
    if (ok) answer.current?.yes();
    else answer.current?.no();
    answer.current = null;
    setAsking(null);
  };
  const dialog = asking && (
    <ConfirmDialog
      title={`Move this task to ${PROJECT_STATUS[asking.to].label}?`}
      confirmLabel={`Yes, move to ${PROJECT_STATUS[asking.to].label}`}
      icon={asking.icon ?? "arrowRight"}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
    >
      <div className="tk-confirm">
        <p className="tk-confirm__task">“{asking.title}”</p>
        <div className="tk-confirm__move">
          <TaskStatus status={asking.from} />
          <Icon name="arrowRight" size={14} />
          <TaskStatus status={asking.to} />
        </div>
        {asking.note}
      </div>
    </ConfirmDialog>
  );
  return [ask, dialog] as const;
}
