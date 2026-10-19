"use client";

import type { CSSProperties, DragEvent } from "react";
import { Avatar, GripIcon, Icon, IconButton, IconTile, type IconName } from "@/components/ui";
import { SOURCE_LABELS, type CoreStage, type LeadSource } from "@/data/admin";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ContactOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useTags, useUpdateContact } from "@/utils/hooks/useContacts";
import { callText, contactName, tagTone } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import type { DragState } from "./PipelineSection";

/** A board column: a sales stage key (lead / booked / paid / lost) or a custom stage id. */
export type BoardStage = { id: string; name: string; color: number; isCore?: boolean };

const SALES_ICONS: Record<CoreStage, IconName> = { lead: "userPlus", booked: "calendarCheck", paid: "dollar", lost: "circleX" };
/** Sales stages advance with a named action instead of "Move to …". */
const SALES_NEXT: Partial<Record<CoreStage, { to: CoreStage; label: string }>> = {
  lead: { to: "booked", label: "Book call" },
  booked: { to: "paid", label: "Mark as paid" },
  lost: { to: "lead", label: "Reopen lead" },
};

type PipelineColumnProps = {
  isSales: boolean;
  stage: BoardStage;
  nextStage?: BoardStage;
  isLast: boolean;
  tone: Tone;
  total: number;
  share: string;
  cards: ContactOut[];
  drag: DragState;
  setDrag: (d: DragState) => void;
  onDrop: (e: DragEvent, stage: string, beforeId: string) => void;
  canWrite: boolean;
  ageOf: (c: ContactOut) => string;
  onRemove: (contactId: string) => void;
  onAdvance: (contactId: string, toStage: string) => void;
};

export function PipelineColumn(props: PipelineColumnProps) {
  const { isSales, stage, tone, total, share, cards, drag, setDrag, onDrop } = props;
  const isCore = isSales && stage.id in SALES_ICONS;
  const dropping = !!drag.dragId && drag.overStage === stage.id;

  const value = isSales
    ? stage.id === "paid"
      ? `${total} paying ${total === 1 ? "client" : "clients"}`
      : stage.id === "lost"
        ? "Closed"
        : `${total} open ${total === 1 ? "lead" : "leads"}`
    : total === 1
      ? "1 contact"
      : `${total} contacts`;

  return (
    <section
      className={cn("board-column", toneClass(tone), dropping && "board-column--drop")}
      onDragOver={(e) => {
        e.preventDefault();
        if (drag.overStage !== stage.id || drag.overCard) setDrag({ ...drag, overStage: stage.id, overCard: "" });
      }}
      onDrop={(e) => onDrop(e, stage.id, "")}
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
  isSales,
  stage,
  nextStage,
  isLast,
  drag,
  setDrag,
  onDrop,
  canWrite,
  ageOf,
  onRemove,
  onAdvance,
}: PipelineColumnProps & { contact: ContactOut }) {
  const { emailContact } = useAdmin();
  const allTags = useTags().data ?? [];
  const updateContact = useUpdateContact();
  const name = contactName(c);
  const myTags = c.tags;
  const otherTags = allTags.filter((t) => !myTags.some((m) => m.id === t.id));
  const setTags = (ids: string[]) => updateContact.mutate({ id: c.id, body: { tagIds: ids } });

  // Primary action: named sales step, or "Move to <next stage>".
  const salesNext = isSales ? SALES_NEXT[stage.id as CoreStage] : undefined;
  const advance = salesNext
    ? { label: salesNext.label, run: () => onAdvance(c.id, salesNext.to) }
    : nextStage && !(isSales && stage.id === "paid")
      ? { label: `Move to ${nextStage.name}`, run: () => onAdvance(c.id, nextStage.id) }
      : null;
  const won = isSales ? stage.id === "paid" : isLast;

  const detail =
    isSales && stage.id === "booked"
      ? callText(c)
      : c.stage === "paid" && c.paidOn
        ? `Paid ${formatShort(c.paidOn)}`
        : `Signed up ${formatShort(c.createdAt)}`;

  const showDropLine = !!drag.dragId && drag.overCard === c.id && drag.dragId !== c.id;

  return (
    <article
      className={cn("deal-card", drag.dragId === c.id && "deal-card--dragging", showDropLine && "deal-card--drop-above")}
      draggable={canWrite}
      aria-roledescription="Draggable card"
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", c.id);
        setDrag({ dragId: c.id, overStage: "", overCard: "" });
      }}
      onDragEnd={() => setDrag({ dragId: "", overStage: "", overCard: "" })}
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
        <Avatar name={name} tone={avatarTone(c.id)} size="md" />
        <div className="stack stack--2 u-grow">
          <span className="text-strong u-truncate">{name}</span>
          <span className="text-small u-truncate">{c.email}</span>
        </div>
        <span className="deal-card__age">{ageOf(c)}</span>
        {canWrite && (
          <span className="deal-card__grip" title="Drag to move">
            <GripIcon />
          </span>
        )}
      </div>

      <div className="cluster cluster--6">
        {myTags.map((t) => (
          <span key={t.id} className={cn("tag-chip", toneClass(tagTone(t)))}>
            {t.name}
            {canWrite && (
              <button
                type="button"
                className="tag-chip__remove"
                aria-label={`Remove tag ${t.name}`}
                disabled={updateContact.isPending}
                onClick={() => setTags(myTags.filter((x) => x.id !== t.id).map((x) => x.id))}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {canWrite && otherTags.length > 0 && (
          <select
            className="tag-picker"
            aria-label={`Add a tag to ${name}`}
            value=""
            disabled={updateContact.isPending}
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
          {SOURCE_LABELS[c.source as LeadSource] ?? c.source}
        </span>
        <span className="deal-card__detail">
          <Icon name="calendar" size={14} />
          {detail}
        </span>
      </div>

      <div className="cluster cluster--8 cluster--nowrap">
        {advance && canWrite && (
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
        <IconButton label={`Email ${name}`} className="deal-card__icon u-sky" onClick={() => emailContact(c.id)}>
          <Icon name="mail" size={15} />
        </IconButton>
        {!isSales && canWrite && (
          <IconButton label={`Remove ${name} from this pipeline`} className="deal-card__icon" onClick={() => onRemove(c.id)}>
            <Icon name="close" size={14} strokeWidth={2.2} />
          </IconButton>
        )}
        {isSales && canWrite && stage.id !== "lost" && stage.id !== "paid" && (
          <IconButton label={`Mark ${name} as lost`} className="deal-card__icon" onClick={() => onAdvance(c.id, "lost")}>
            <Icon name="close" size={14} strokeWidth={2.2} />
          </IconButton>
        )}
      </div>
    </article>
  );
}
