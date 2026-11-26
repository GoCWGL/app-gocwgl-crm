"use client";

import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { GripIcon, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { PRIORITY, PROJECT_STATUS, type ProjectPriority, type ProjectStatus } from "../lib/projects";

/** One card on the board: a task (everyday work for a VA on the team) or a project (one-time work, moved by GoCWGL). */
export type BoardCard = {
  /** Unique on the board ("task:…" / "project:…"). */
  id: string;
  kind: "task" | "project";
  /** The column it sits in. */
  column: ProjectStatus;
  /** Its place in the column (lower = higher up), shared by the client and the VAs. */
  position: number;
  title: string;
  details?: string;
  priority?: ProjectPriority;
  dueDate?: string | null;
  /** A project's own stage when it says more than its column (e.g. "Finding your VA"). */
  stage?: string;
  links?: number;
  messages?: number;
  unread?: number;
  /** Who's on it, from this side: the VAs (client portal) or the client (VA portal). */
  who: ReactNode;
};

const DRAG_TYPE = "application/x-gocwgl-task";

/** Each column's icon, beside its name. */
const COLUMN_ICON: Record<ProjectStatus, IconName> = {
  requested: "send",
  in_progress: "play",
  review: "eye",
  done: "circleCheck",
  cancelled: "circleX",
};

/** How long a card that just moved plays its landing bounce (matches the CSS). */
const LAND_MS = 700;

/** "YYYY-MM-DD" for today and a few days on, local time. */
const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};

/** Where a card dropped between `before` and `after` goes: halfway, or one step past the end it's at. */
function positionBetween(before?: number, after?: number): number {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + 1;
  if (after !== undefined) return after - 1;
  return Date.now() / 1000;
}

/**
 * Tasks and projects as a Trello-style board (client portal and VA portal): a column per stage, a card for each.
 * Drag a card to another column (it goes where it's dropped, or to the bottom), or up and down its own column to
 * reorder it when the board is in its own order (`manual`). The card shows in its new place right away and goes back
 * if the save fails. Clicking a card opens its full details.
 */
export function TaskBoard({
  cards,
  columns,
  manual,
  onOpen,
  canMove,
  canReorder,
  onMove,
}: {
  cards: BoardCard[];
  columns: Array<{ status: ProjectStatus; hint: string }>;
  /** The board's own order (by position), so cards can be reordered; otherwise cards keep the order given. */
  manual: boolean;
  onOpen: (card: BoardCard) => void;
  /** Whether this card may be dropped in another column. */
  canMove: (card: BoardCard, to: ProjectStatus) => boolean;
  /** Whether this card may be moved up and down its own column. */
  canReorder: (card: BoardCard) => boolean;
  /** Save the move (to a column, at a position); resolves once the list has refreshed, rejects when it failed. */
  onMove: (card: BoardCard, to: ProjectStatus, position: number) => Promise<unknown>;
}) {
  // Moves being saved: shown in their new place until the refreshed list has them there.
  const [moving, setMoving] = useState<Record<string, { column: ProjectStatus; position: number }>>({});
  const [dragId, setDragId] = useState("");
  // The dragged card folds away in its column a moment after it's picked up (not during dragstart, which would
  // cancel the drag), leaving a gap where it will land.
  const [lifted, setLifted] = useState(false);
  const [over, setOver] = useState<{ column: ProjectStatus; index: number } | null>(null);
  const columnOf = (c: BoardCard) => moving[c.id]?.column ?? c.column;
  const positionOf = (c: BoardCard) => moving[c.id]?.position ?? c.position;
  const dragged = cards.find((c) => c.id === dragId) ?? null;
  const inColumn = (status: ProjectStatus) => {
    const list = cards.filter((c) => columnOf(c) === status);
    return manual ? list.sort((a, b) => positionOf(a) - positionOf(b)) : list;
  };
  const accepts = (to: ProjectStatus) =>
    !!dragged && (columnOf(dragged) === to ? manual && canReorder(dragged) : canMove(dragged, to));

  // Cards that just moved (dragged, moved in the pop-up, or by the other side) bounce in where they land.
  const [landed, setLanded] = useState<Record<string, number>>({});
  const lastPlace = useRef<Map<string, string>>(new Map());
  const placement = cards.map((c) => `${c.id}=${columnOf(c)}@${positionOf(c)}`).join("|");
  useEffect(() => {
    const now = new Map(placement ? placement.split("|").map((p) => p.split("=") as [string, string]) : []);
    const moved = [...now].filter(([id, at]) => lastPlace.current.has(id) && lastPlace.current.get(id) !== at).map(([id]) => id);
    lastPlace.current = now;
    if (!moved.length) return;
    const stamp = Date.now();
    const frame = requestAnimationFrame(() => setLanded((l) => ({ ...l, ...Object.fromEntries(moved.map((id) => [id, stamp])) })));
    const done = setTimeout(
      () =>
        setLanded((l) => {
          const next = { ...l };
          for (const id of moved) if (next[id] === stamp) delete next[id];
          return next;
        }),
      LAND_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [placement]);

  const move = (c: BoardCard, to: ProjectStatus, position: number) => {
    setMoving((m) => ({ ...m, [c.id]: { column: to, position } }));
    onMove(c, to, position)
      .catch(() => undefined)
      .finally(() =>
        setMoving((m) => {
          const next = { ...m };
          delete next[c.id];
          return next;
        }),
      );
  };

  const endDrag = () => {
    setDragId("");
    setLifted(false);
    setOver(null);
  };

  return (
    <div className="kb" role="list" aria-label="Task board" style={{ "--kb-cols": columns.length } as CSSProperties}>
      {columns.map((col) => {
        const list = inColumn(col.status);
        const others = list.filter((c) => c.id !== dragId);
        const droppable = accepts(col.status);
        // Where in this column the dragged card would go: above the first card whose middle is below the pointer.
        // In someone else's order (a sort), only at the bottom.
        const slotAt = (e: DragEvent) => {
          if (!manual) return others.length;
          const els = [...e.currentTarget.querySelectorAll<HTMLElement>(".kb-card:not(.is-dragging)")];
          const i = els.findIndex((el) => {
            const r = el.getBoundingClientRect();
            return e.clientY < r.top + r.height / 2;
          });
          return i === -1 ? others.length : i;
        };
        const onDragOver = (e: DragEvent) => {
          if (!droppable) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const index = slotAt(e);
          if (over?.column !== col.status || over.index !== index) setOver({ column: col.status, index });
        };
        const slot = over?.column === col.status && droppable ? over.index : -1;
        const items: ReactNode[] = [];
        let n = 0;
        for (const c of list) {
          const isDragged = c.id === dragId;
          if (!isDragged && n === slot) items.push(<div key="slot" className="kb-col__slot" aria-hidden="true" />);
          if (!isDragged) n += 1;
          items.push(
            <Card
              key={c.id}
              c={c}
              column={columnOf(c)}
              saving={!!moving[c.id]}
              draggable={!moving[c.id] && ((manual && canReorder(c)) || columns.some((o) => o.status !== columnOf(c) && canMove(c, o.status)))}
              dragging={isDragged}
              lifted={isDragged && lifted}
              landed={!!landed[c.id]}
              onOpen={() => onOpen(c)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(DRAG_TYPE, c.id);
                e.dataTransfer.setData("text/plain", c.title);
                setDragId(c.id);
                setTimeout(() => setLifted(true), 0);
              }}
              onDragEnd={endDrag}
            />,
          );
        }
        if (slot >= n && slot !== -1) items.push(<div key="slot" className="kb-col__slot" aria-hidden="true" />);

        return (
          <section
            key={col.status}
            role="listitem"
            aria-label={`${PROJECT_STATUS[col.status].label}, ${list.length} item${list.length === 1 ? "" : "s"}`}
            className={cn("kb-col", `is-${col.status}`, dragged && (droppable ? "can-drop" : "no-drop"), slot !== -1 && "is-over")}
            onDragOver={onDragOver}
            onDragEnter={onDragOver}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null) && over?.column === col.status) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged && droppable) {
                const index = slotAt(e);
                const same = columnOf(dragged) === col.status;
                const before = others[index - 1];
                const after = others[index];
                const at = list.indexOf(dragged);
                // Dropped back where it was: nothing to save.
                const stays = same && list[at - 1] === before && list[at + 1] === after;
                if (!stays) {
                  // Another column without its own order: the bottom, after every card in it.
                  const position = manual
                    ? positionBetween(before && positionOf(before), after && positionOf(after))
                    : positionBetween(list.length ? Math.max(...list.map(positionOf)) : undefined, undefined);
                  move(dragged, col.status, position);
                }
              }
              endDrag();
            }}
          >
            <header className="kb-col__head">
              <span className="kb-col__icon" aria-hidden="true">
                <Icon name={COLUMN_ICON[col.status]} size={14} strokeWidth={2.2} />
              </span>
              <span className="kb-col__name">
                <h3 className="kb-col__title">{PROJECT_STATUS[col.status].label}</h3>
                <span className="kb-col__hint">{col.hint}</span>
              </span>
              {/* Keyed by the number, so it pops when a card arrives or leaves. */}
              <span key={list.length} className="kb-col__count">
                {list.length}
              </span>
            </header>
            <div className="kb-col__cards">
              {items}
              {!others.length && slot === -1 && (
                <div className="kb-col__empty">
                  <Icon name={droppable ? "download" : COLUMN_ICON[col.status]} size={16} />
                  {droppable ? "Drop here" : "Nothing here yet"}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** One card: kind and priority, title, the start of its details, then who's on it, due date and counts. */
function Card({
  c,
  column,
  saving,
  draggable,
  dragging,
  lifted,
  landed,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  c: BoardCard;
  column: ProjectStatus;
  saving: boolean;
  draggable: boolean;
  dragging: boolean;
  lifted: boolean;
  landed: boolean;
  onOpen: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const open = column !== "done" && column !== "cancelled";
  const overdue = !!c.dueDate && open && c.dueDate < day();
  const soon = !!c.dueDate && open && !overdue && c.dueDate <= day(2);
  const unread = c.unread ?? 0;
  const kind = c.kind === "project" ? "Project" : "Task";
  return (
    <article
      className={cn(
        "kb-card",
        `is-${column}`,
        `is-${c.kind}`,
        unread > 0 && "has-unread",
        draggable && "is-draggable",
        dragging && "is-dragging",
        lifted && "is-lifted",
        saving && "is-saving",
        landed && "is-landed",
      )}
      tabIndex={0}
      draggable={draggable}
      aria-label={`${kind}: ${c.title}, ${PROJECT_STATUS[column].label}. Open details`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="kb-card__top">
        <span className={cn("kb-card__kind", `is-${c.kind}`)}>
          <Icon name={c.kind === "project" ? "briefcase" : "clipboard"} size={12} strokeWidth={2.1} />
          {kind}
        </span>
        {c.priority && c.priority !== "normal" && (
          <span className={cn("kb-card__priority", `is-${c.priority}`)} title={`${PRIORITY[c.priority].label} priority`}>
            <Icon name="bolt" size={11} strokeWidth={2.2} />
            {PRIORITY[c.priority].label}
          </span>
        )}
        {c.stage && <span className="kb-card__stage">{c.stage}</span>}
        <span className="u-spacer" />
        {unread > 0 && (
          <span className="kb-card__unread" title={`${unread} unread message${unread === 1 ? "" : "s"}`}>
            {unread}
          </span>
        )}
        {draggable && (
          <span className="kb-card__grip" title="Drag to move" aria-hidden="true">
            <GripIcon size={14} />
          </span>
        )}
      </div>

      <h4 className="kb-card__title">{c.title}</h4>
      {c.details && <p className="kb-card__details">{c.details}</p>}

      <div className="kb-card__foot">
        <span className="kb-card__who">{c.who}</span>
        <span className="kb-card__meta">
          {(c.links ?? 0) > 0 && (
            <span className="kb-card__count" title={`${c.links} link${c.links === 1 ? "" : "s"}`}>
              <Icon name="link" size={12} /> {c.links}
            </span>
          )}
          {(c.messages ?? 0) > 0 && (
            <span className="kb-card__count" title={`${c.messages} message${c.messages === 1 ? "" : "s"}`}>
              <Icon name="message" size={12} /> {c.messages}
            </span>
          )}
          {saving ? (
            <span className="kb-card__saving">Saving…</span>
          ) : (
            c.dueDate && (
              <span className={cn("kb-card__due", overdue && "is-late", soon && "is-soon")} title={overdue ? "Overdue" : "Due date"}>
                <Icon name="calendar" size={12} />
                {formatShort(c.dueDate)}
              </span>
            )
          )}
        </span>
      </div>
    </article>
  );
}
