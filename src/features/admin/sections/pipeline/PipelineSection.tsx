"use client";

import { useState, type CSSProperties, type DragEvent } from "react";
import { Button, Field, Icon, Input, Select, StatGrid, type StatItem } from "@/components/ui";
import { PLAN_PRICE, type Contact, type Pipeline } from "@/data/admin";
import { dayNumber } from "@/lib/dates";
import { formatMoney, percent } from "@/lib/utils";
import { stageTone } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineEditor } from "./PipelineEditor";

const TODAY = 14;

/** Drag state shared by the columns and cards while a card is being dragged. */
export type DragState = { dragId: number; overStage: string; overCard: number };

export function PipelineSection() {
  const { state, update, moveSalesCard, movePipelineItem } = useAdmin();
  const { pipelines, contacts } = state;

  const [pipelineId, setPipelineId] = useState("sales");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [drag, setDrag] = useState<DragState>({ dragId: 0, overStage: "", overCard: 0 });

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const isSales = !!pipeline.system;
  const stages = pipeline.stages;

  const inPipeline = (c: Contact) => isSales || !!pipeline.items?.[c.id];
  const stageOf = (c: Contact) => (isSales ? c.stage : pipeline.items?.[c.id]);
  const members = contacts.filter(inPipeline);
  const order = isSales ? state.pipeOrder : (pipeline.order ?? []);

  const move = (id: number, stage: string, beforeId: number) => {
    if (isSales) moveSalesCard(id, stage, beforeId);
    else movePipelineItem(pipeline.id, id, stage, beforeId);
    setDrag({ dragId: 0, overStage: "", overCard: 0 });
  };

  const onDrop = (e: DragEvent, stage: string, beforeId: number) => {
    e.preventDefault();
    const id = drag.dragId || Number(e.dataTransfer.getData("text/plain"));
    if (id && id !== beforeId) move(id, stage, beforeId);
    else setDrag({ dragId: 0, overStage: "", overCard: 0 });
  };

  const count = (stage: string) => contacts.filter((c) => c.stage === stage).length;
  const openLeads = count("lead") + count("booked");

  const stats: StatItem[] = isSales
    ? [
        { label: "Open leads", value: openLeads, glyph: "#", tone: "cyan" },
        { label: "Potential MRR", value: formatMoney(openLeads * PLAN_PRICE) + "/mo", glyph: "$", tone: "orange" },
        { label: "Won (active clients)", value: formatMoney(count("paid") * PLAN_PRICE) + "/mo", glyph: "✓", tone: "green" },
        { label: "Win rate", value: percent(count("paid"), count("paid") + count("lost")), glyph: "%", tone: "teal" },
      ]
    : [
        { label: "Contacts in pipeline", value: members.length, glyph: "#", tone: "cyan" },
        { label: "Stages", value: stages.length, glyph: "≡", tone: "purple" },
        { label: "In first stage", value: members.filter((c) => stages.length && stageOf(c) === stages[0].id).length, glyph: "→", tone: "orange" },
        { label: "Completed", value: members.filter((c) => stageOf(c) === stages.at(-1)?.id).length, glyph: "✓", tone: "green" },
      ];

  const q = query.trim().toLowerCase();
  const position = (id: number) => {
    const i = order.indexOf(id);
    return i === -1 ? 999 + id : i;
  };

  const openEditor = (draft: Pipeline, creating: boolean) => {
    setEditing(structuredClone(draft));
    setIsNew(creating);
  };

  return (
    <div className="page-stack">
      <div className="toolbar toolbar--card">
        <span className="icon-tile icon-tile--md icon-tile--brand" aria-hidden="true">
          <Icon name="pipeline" />
        </span>
        <Field label={<span className="kicker">PIPELINE</span>} htmlFor="pipe-pick">
          <Select
            id="pipe-pick"
            size="sm"
            className="pipeline-picker"
            value={pipeline.id}
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
        {!isSales && (
          <Select
            className="select--dashed input--auto"
            aria-label="Add a contact to this pipeline"
            value=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id && stages.length) movePipelineItem(pipeline.id, id, stages[0].id, 0);
            }}
          >
            <option value="">+ Add contact</option>
            {contacts
              .filter((c) => !inPipeline(c))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        )}
        <Button onClick={() => openEditor(pipeline, false)}>
          <Icon name="edit" size={14} />
          Edit stages
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            openEditor(
              {
                id: "",
                name: "",
                stages: [
                  { id: `st${Date.now()}`, name: "New", color: 0 },
                  { id: `st${Date.now() + 1}`, name: "In progress", color: 1 },
                  { id: `st${Date.now() + 2}`, name: "Done", color: 2 },
                ],
                items: {},
                order: [],
              },
              true,
            )
          }
        >
          <Icon name="plus" size={14} strokeWidth={2.4} />
          New pipeline
        </Button>
      </div>

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

      <div className="board-scroll">
        <div
          className="board"
          style={{ "--columns": Math.max(1, stages.length), "--board-min": `${Math.max(1, stages.length) * 276}px` } as CSSProperties}
        >
          {stages.map((stage, i) => {
            const all = members.filter((c) => stageOf(c) === stage.id);
            const cards = all
              .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
              .sort((a, b) => position(a.id) - position(b.id));
            return (
              <PipelineColumn
                key={stage.id}
                pipeline={pipeline}
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
                ageOf={(c) => {
                  const n = TODAY - dayNumber(c.stage === "paid" ? c.paidOn : c.signed);
                  return n <= 0 ? "Today" : `${n}d ago`;
                }}
                onRemove={(id) =>
                  update((s) => ({
                    pipelines: s.pipelines.map((p) => {
                      if (p.id !== pipeline.id) return p;
                      const items = { ...p.items };
                      delete items[id];
                      return { ...p, items, order: (p.order ?? []).filter((x) => x !== id) };
                    }),
                  }))
                }
                onAdvance={(id, to) => move(id, to, 0)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
