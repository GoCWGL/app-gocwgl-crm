"use client";

import type { CSSProperties, DragEvent } from "react";
import { Avatar, GripIcon, Icon, IconButton, IconTile, type IconName } from "@/components/ui";
import { PLAN_PRICE, type Contact, type CoreStage, type Pipeline, type PipelineStage } from "@/data/admin";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn, formatMoney } from "@/lib/utils";
import { callText, tagTone } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import type { DragState } from "./PipelineSection";

const SALES_ICONS: Record<CoreStage, IconName> = { lead: "userPlus", booked: "calendarCheck", paid: "dollar", lost: "circleX" };
/** Sales stages advance with a named action instead of "Move to …". */
const SALES_NEXT: Partial<Record<CoreStage, { to: CoreStage; label: string }>> = {
  lead: { to: "booked", label: "Book call" },
  booked: { to: "paid", label: "Mark as paid" },
  lost: { to: "lead", label: "Reopen lead" },
};

type PipelineColumnProps = {
  pipeline: Pipeline;
  stage: PipelineStage;
  nextStage?: PipelineStage;
  isLast: boolean;
  tone: Tone;
  total: number;
  share: string;
  cards: Contact[];
  drag: DragState;
  setDrag: (d: DragState) => void;
  onDrop: (e: DragEvent, stage: string, beforeId: number) => void;
  ageOf: (c: Contact) => string;
  onRemove: (contactId: number) => void;
  onAdvance: (contactId: number, toStage: string) => void;
};

export function PipelineColumn(props: PipelineColumnProps) {
  const { pipeline, stage, tone, total, share, cards, drag, setDrag, onDrop } = props;
  const isSales = !!pipeline.system;
  const isCore = isSales && stage.id in SALES_ICONS;
  const dropping = !!drag.dragId && drag.overStage === stage.id;

  const value = isSales
    ? stage.id === "paid"
      ? `${formatMoney(total * PLAN_PRICE)}/mo recurring`
      : stage.id === "lost"
        ? "Closed"
        : `${formatMoney(total * PLAN_PRICE)}/mo potential`
    : total === 1
      ? "1 contact"
      : `${total} contacts`;

  return (
    <section
      className={cn("board-column", toneClass(tone), dropping && "board-column--drop")}
      onDragOver={(e) => {
        e.preventDefault();
        if (drag.overStage !== stage.id || drag.overCard) setDrag({ ...drag, overStage: stage.id, overCard: 0 });
      }}
      onDrop={(e) => onDrop(e, stage.id, 0)}
    >
      <header className="board-column__header">
        <IconTile tone={tone} size="md">
          {isCore ? <Icon name={SALES_ICONS[stage.id as CoreStage]} /> : <span className="board-column__dot" />}
        </IconTile>
        <div className="stack stack--2 u-grow">
          <h2 className="board-column__title">{stage.name}</h2>
          <span className="text-small">{value}</span>
        </div>
        <span className="board-column__count">{total}</span>
      </header>
      <div className="progress progress--xs" style={{ "--progress": share } as CSSProperties}>
        <div className="progress__fill" />
      </div>

      {cards.map((c) => (
        <PipelineCard key={c.id} contact={c} {...props} />
      ))}
      {cards.length === 0 && <div className="board-column__empty">{isSales ? "No leads here" : "Drag a contact here"}</div>}
    </section>
  );
}

function PipelineCard({
  contact: c,
  pipeline,
  stage,
  nextStage,
  isLast,
  drag,
  setDrag,
  onDrop,
  ageOf,
  onRemove,
  onAdvance,
}: PipelineColumnProps & { contact: Contact }) {
  const { state, update, setStage, emailContact } = useAdmin();
  const isSales = !!pipeline.system;
  const myTags = (state.contactTags[c.id] ?? []).map((id) => state.tags.find((t) => t.id === id)).filter((t) => !!t);
  const otherTags = state.tags.filter((t) => !myTags.some((m) => m.id === t.id));
  const setTags = (ids: string[]) => update((s) => ({ contactTags: { ...s.contactTags, [c.id]: ids } }));

  // Primary action: named sales step, or "Move to <next stage>".
  const salesNext = isSales ? SALES_NEXT[stage.id as CoreStage] : undefined;
  const advance = salesNext
    ? { label: salesNext.label, run: () => setStage(c.id, salesNext.to) }
    : nextStage && !(isSales && stage.id === "paid")
      ? { label: `Move to ${nextStage.name}`, run: () => onAdvance(c.id, nextStage.id) }
      : null;
  const won = isSales ? stage.id === "paid" : isLast;

  const detail =
    isSales && stage.id === "booked"
      ? callText(c)
      : c.stage === "paid"
        ? `${formatMoney(PLAN_PRICE)}/mo · paid ${c.paidOn}`
        : `Signed up ${c.signed}`;

  const showDropLine = !!drag.dragId && drag.overCard === c.id && drag.dragId !== c.id;

  return (
    <article
      className={cn("deal-card", drag.dragId === c.id && "deal-card--dragging", showDropLine && "deal-card--drop-above")}
      draggable
      aria-roledescription="Draggable card"
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(c.id));
        setDrag({ dragId: c.id, overStage: "", overCard: 0 });
      }}
      onDragEnd={() => setDrag({ dragId: 0, overStage: "", overCard: 0 })}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (drag.overCard !== c.id || drag.overStage !== stage.id) setDrag({ ...drag, overCard: c.id, overStage: stage.id });
      }}
      onDrop={(e) => {
        e.stopPropagation();
        onDrop(e, stage.id, c.id);
      }}
    >
      <div className="cluster cluster--nowrap">
        <Avatar name={c.name} tone={avatarTone(c.id)} size="md" />
        <div className="stack stack--2 u-grow">
          <span className="text-strong u-truncate">{c.name}</span>
          <span className="text-small u-truncate">{c.email}</span>
        </div>
        <span className="deal-card__age">{ageOf(c)}</span>
        <span className="deal-card__grip" title="Drag to move">
          <GripIcon />
        </span>
      </div>

      <div className="cluster cluster--6">
        {myTags.map((t) => (
          <span key={t.id} className={cn("tag-chip", toneClass(tagTone(t)))}>
            {t.name}
            <button
              type="button"
              className="tag-chip__remove"
              aria-label={`Remove tag ${t.name}`}
              onClick={() => setTags(myTags.filter((x) => x.id !== t.id).map((x) => x.id))}
            >
              ×
            </button>
          </span>
        ))}
        {otherTags.length > 0 && (
          <select
            className="tag-picker"
            aria-label={`Add a tag to ${c.name}`}
            value=""
            onChange={(e) => e.target.value && setTags([...myTags.map((t) => t.id), e.target.value])}
          >
            <option value="">+ Tag</option>
            {otherTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="deal-card__details">
        <span className="deal-card__detail">
          <Icon name="globe" size={14} />
          {c.source}
        </span>
        <span className="deal-card__detail">
          <Icon name="calendar" size={14} />
          {detail}
        </span>
      </div>

      <div className="cluster cluster--8 cluster--nowrap">
        {advance && (
          <button type="button" className="btn btn--cyan deal-card__advance" onClick={advance.run}>
            {advance.label}
            <Icon name="arrowRight" size={14} strokeWidth={2.4} />
          </button>
        )}
        {won && (
          <span className="deal-card__won">
            <Icon name="check" size={14} strokeWidth={2.4} />
            {isSales ? "Active client" : "Completed"}
          </span>
        )}
        <IconButton label={`Email ${c.name}`} className="deal-card__icon u-sky" onClick={() => emailContact(c.id)}>
          <Icon name="mail" size={15} />
        </IconButton>
        {!isSales && (
          <IconButton label={`Remove ${c.name} from this pipeline`} className="deal-card__icon" onClick={() => onRemove(c.id)}>
            <Icon name="close" size={14} strokeWidth={2.2} />
          </IconButton>
        )}
        {isSales && stage.id !== "lost" && stage.id !== "paid" && (
          <IconButton label={`Mark ${c.name} as lost`} className="deal-card__icon" onClick={() => setStage(c.id, "lost")}>
            <Icon name="close" size={14} strokeWidth={2.2} />
          </IconButton>
        )}
      </div>
    </article>
  );
}
