"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type CSSProperties, type DragEvent } from "react";
import { Button, Field, FormError, Icon, Input, LoadState, Select, StatGrid, type StatItem } from "@/components/ui";
import { percent } from "@/lib/utils";
import type { ContactOut, PipelineDetail, Stage } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { addDaysIso, getTimeZone, isoDateIn, todayIso } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { qk } from "@/utils/hooks/keys";
import {
  useAllContacts,
  useMovePipelineItem,
  useMoveSalesCard,
  usePipeline,
  usePipelines,
  useRemovePipelineItem,
  useSalesBoard,
} from "@/utils/hooks/useContacts";
import { useDashboard } from "@/utils/hooks/useReporting";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName, salesPipeline, stageTone } from "../../lib/contacts";
import { PipelineColumn, type BoardStage } from "./PipelineColumn";
import { PipelineEditor, draftOf, newStage, type PipelineDraft } from "./PipelineEditor";

/** Drag state shared by the columns and cards while a card is being dragged. */
export type DragState = { dragId: string; overStage: string; overCard: string };
const NO_DRAG: DragState = { dragId: "", overStage: "", overCard: "" };

/** "Today", "3d ago". */
function ageOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const today = todayIso();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : isoDateIn(new Date(iso), getTimeZone());
  let n = 0;
  while (n < 400 && addDaysIso(day, n) < today) n++;
  return n <= 0 ? "Today" : `${n}d ago`;
}

/** Move `id` in a list so it sits before `beforeId` (or at the end). */
function reorder<T extends { id: string }>(list: T[], id: string, beforeId: string, patch: Partial<T>): T[] {
  const item = list.find((x) => x.id === id);
  if (!item) return list;
  const next = list.filter((x) => x.id !== id);
  const at = beforeId ? next.findIndex((x) => x.id === beforeId) : -1;
  const moved = { ...item, ...patch };
  if (at === -1) next.push(moved);
  else next.splice(at, 0, moved);
  return next;
}

export function PipelineSection() {
  const qc = useQueryClient();
  const canWrite = canWriteCrm(useMe().data);
  const pipelinesQuery = usePipelines();
  const pipelines = pipelinesQuery.data ?? [];
  const sales = salesPipeline(pipelines);

  const [pipelineId, setPipelineId] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PipelineDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [drag, setDrag] = useState<DragState>(NO_DRAG);

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? sales ?? pipelines[0];
  const isSales = !!pipeline?.isSystem;
  const board = useSalesBoard();
  const detail = usePipeline(!isSales && pipeline ? pipeline.id : "");
  const everyone = useAllContacts();
  const dashboard = useDashboard(30);
  const moveSales = useMoveSalesCard();
  const moveItem = useMovePipelineItem();
  const removeItem = useRemovePipelineItem();

  const stagesSorted = [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position);
  // Sales columns are keyed by stage key (lead / booked / paid / lost); custom ones by stage id.
  const stages: BoardStage[] = stagesSorted.map((s) => ({ id: isSales ? s.key : s.id, name: s.name, color: s.color, isCore: s.isCore }));

  const contactsById = new Map((everyone.data ?? []).map((c) => [c.id, c]));
  const items = [...(detail.data?.items ?? [])].sort((a, b) => a.position - b.position);
  const members: ContactOut[] = isSales
    ? (board.data ?? [])
    : (items.map((i) => contactsById.get(i.contactId)).filter(Boolean) as ContactOut[]);
  const stageIdOf = (c: ContactOut) => (isSales ? c.stage : items.find((i) => i.contactId === c.id)?.stageId);

  const move = (id: string, stage: string, beforeId: string) => {
    setDrag(NO_DRAG);
    if (!pipeline) return;
    // Show the move right away; the refetch after the request confirms it.
    if (isSales) {
      qc.setQueryData<ContactOut[]>(qk.salesBoard, (list) => (list ? reorder(list, id, beforeId, { stage } as Partial<ContactOut>) : list));
      moveSales.mutate({ contactId: id, stage: stage as Stage, beforeId: beforeId || null });
    } else {
      qc.setQueryData<PipelineDetail>(qk.pipeline(pipeline.id), (p) => {
        if (!p) return p;
        const list = (p.items ?? []).map((i) => ({ ...i, id: i.contactId }));
        const next = reorder(list, id, beforeId, { stageId: stage } as Partial<(typeof list)[number]>);
        return { ...p, items: next.map((i, position) => ({ contactId: i.contactId, stageId: i.stageId, position })) };
      });
      moveItem.mutate({ pipelineId: pipeline.id, contactId: id, stageId: stage, beforeId: beforeId || null });
    }
  };

  const onDrop = (e: DragEvent, stage: string, beforeId: string) => {
    e.preventDefault();
    const id = drag.dragId || e.dataTransfer.getData("text/plain");
    if (canWrite && id && id !== beforeId) move(id, stage, beforeId);
    else setDrag(NO_DRAG);
  };

  const count = (stage: string) => members.filter((c) => c.stage === stage).length;
  const openLeads = count("lead") + count("booked");

  const stats: StatItem[] = isSales
    ? [
        { label: "Open leads", value: openLeads, glyph: "#", tone: "cyan" },
        { label: "Calls booked", value: count("booked"), glyph: "☎", tone: "orange" },
        { label: "Won (MRR)", value: dashboard.data ? formatCents(dashboard.data.mrr_cents) + "/mo" : "—", glyph: "✓", tone: "green" },
        { label: "Win rate", value: percent(count("paid"), count("paid") + count("lost")), glyph: "%", tone: "teal" },
      ]
    : [
        { label: "Contacts in pipeline", value: members.length, glyph: "#", tone: "cyan" },
        { label: "Stages", value: stages.length, glyph: "≡", tone: "purple" },
        { label: "In first stage", value: members.filter((c) => stages.length && stageIdOf(c) === stages[0].id).length, glyph: "→", tone: "orange" },
        { label: "Completed", value: members.filter((c) => stageIdOf(c) === stages.at(-1)?.id).length, glyph: "✓", tone: "green" },
      ];

  const q = query.trim().toLowerCase();
  const memberIds = new Set(members.map((m) => m.id));

  const openEditor = (draft: PipelineDraft, creating: boolean) => {
    setEditing(draft);
    setIsNew(creating);
  };

  const loading = isSales ? board : detail;

  return (
    <div className="page-stack">
      <LoadState query={pipelinesQuery} loadingText="Loading pipelines…">
        <div className="toolbar toolbar--card">
          <span className="icon-tile icon-tile--md icon-tile--brand" aria-hidden="true">
            <Icon name="pipeline" />
          </span>
          <Field label={<span className="kicker">PIPELINE</span>} htmlFor="pipe-pick">
            <Select
              id="pipe-pick"
              size="sm"
              className="pipeline-picker"
              value={pipeline?.id ?? ""}
              options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(e) => {
                setPipelineId(e.target.value);
                setEditing(null);
              }}
            />
          </Field>
          <span className="text-small">
            {stages.length} stages · {members.length} contacts
          </span>
          <span className="u-spacer" />
          {!isSales && canWrite && (
            <Select
              className="select--dashed input--auto"
              aria-label="Add a contact to this pipeline"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && stages.length && pipeline) moveItem.mutate({ pipelineId: pipeline.id, contactId: id, stageId: stages[0].id });
              }}
            >
              <option value="">+ Add contact</option>
              {(everyone.data ?? [])
                .filter((c) => !memberIds.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactName(c)}
                  </option>
                ))}
            </Select>
          )}
          {canWrite && pipeline && (
            <Button onClick={() => openEditor(draftOf(pipeline), false)}>
              <Icon name="edit" size={14} />
              Edit stages
            </Button>
          )}
          {canWrite && (
            <Button
              variant="primary"
              onClick={() =>
                openEditor({ id: "", name: "", isSystem: false, stages: [newStage("New", 0), newStage("In progress", 1), newStage("Done", 2)] }, true)
              }
            >
              <Icon name="plus" size={14} strokeWidth={2.4} />
              New pipeline
            </Button>
          )}
        </div>
      </LoadState>

      {editing && (
        <PipelineEditor
          draft={editing}
          isNew={isNew}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setPipelineId(id);
          }}
        />
      )}

      <StatGrid wide items={stats} />

      <div className="section-head">
        <div className="search-input">
          <Icon name="search" className="search-input__icon" />
          <label className="sr-only" htmlFor="pipe-search">
            Search pipeline
          </label>
          <Input id="pipe-search" type="search" placeholder="Search leads in pipeline" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="text-muted">Drag cards between stages or up and down to reorder, or use the button on each card</span>
      </div>
      <FormError error={moveSales.error ?? moveItem.error ?? removeItem.error} />

      <LoadState query={loading} loadingText="Loading board…">
        <div className="board-scroll">
          <div
            className="board"
            style={{ "--columns": Math.max(1, stages.length), "--board-min": `${Math.max(1, stages.length) * 276}px` } as CSSProperties}
          >
            {pipeline &&
              stages.map((stage, i) => {
                const all = members.filter((c) => stageIdOf(c) === stage.id);
                const cards = all.filter((c) => !q || contactName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
                return (
                  <PipelineColumn
                    key={stage.id}
                    isSales={isSales}
                    stage={stage}
                    nextStage={stages[i + 1]}
                    isLast={i === stages.length - 1}
                    tone={stageTone(stage.color)}
                    total={all.length}
                    share={percent(all.length, members.length)}
                    cards={cards}
                    drag={drag}
                    setDrag={setDrag}
                    onDrop={onDrop}
                    canWrite={canWrite}
                    ageOf={(c) => ageOf(c.stage === "paid" ? c.paidOn : c.createdAt)}
                    onRemove={(id) => pipeline && removeItem.mutate({ pipelineId: pipeline.id, contactId: id })}
                    onAdvance={(id, to) => move(id, to, "")}
                  />
                );
              })}
          </div>
        </div>
      </LoadState>
    </div>
  );
}
