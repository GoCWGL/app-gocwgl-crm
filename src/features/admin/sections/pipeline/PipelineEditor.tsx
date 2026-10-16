"use client";

import { useState } from "react";
import { Badge, Button, Field, Icon, IconButton, Input, Select } from "@/components/ui";
import { STAGE_COLORS, type CoreStage, type Pipeline, type PipelineStage } from "@/data/admin";
import { toneClass } from "@/lib/tones";
import { cn, moveItem } from "@/lib/utils";
import { stageTone } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

type PipelineEditorProps = {
  draft: Pipeline;
  isNew: boolean;
  onChange: (draft: Pipeline) => void;
  onCancel: () => void;
  /** Called with the id of the saved (or new) pipeline. */
  onSaved: (id: string) => void;
};

/** Rename, recolor, reorder, add and delete the stages of a pipeline. */
export function PipelineEditor({ draft, isNew, onChange, onCancel, onSaved }: PipelineEditorProps) {
  const { update } = useAdmin();
  const [error, setError] = useState("");

  const setStages = (stages: PipelineStage[]) => {
    onChange({ ...draft, stages });
    setError("");
  };
  const patchStage = (i: number, patch: Partial<PipelineStage>) =>
    setStages(draft.stages.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const save = () => {
    if (!draft.name.trim()) return setError("Give the pipeline a name.");
    if (!draft.stages.length) return setError("Add at least one stage.");
    if (draft.stages.some((s) => !s.name.trim())) return setError("Every stage needs a name.");

    if (isNew) {
      const id = `p${Date.now()}`;
      update((s) => ({ pipelines: [...s.pipelines, { ...draft, id, name: draft.name.trim() }] }));
      onSaved(id);
      return;
    }

    // Contacts in a deleted stage move to the first stage.
    const ids = draft.stages.map((s) => s.id);
    const items: Record<number, string> = {};
    Object.entries(draft.items ?? {}).forEach(([cid, st]) => (items[Number(cid)] = ids.includes(st) ? st : ids[0]));
    const saved = { ...draft, name: draft.name.trim(), items };

    update((s) => ({
      pipelines: s.pipelines.map((p) => (p.id === draft.id ? saved : p)),
      ...(draft.system && {
        contacts: s.contacts.map((c) => (ids.includes(c.stage) ? c : { ...c, stage: "lead" as CoreStage })),
      }),
    }));
    onSaved(draft.id);
  };

  const remove = () => {
    update((s) => ({ pipelines: s.pipelines.filter((p) => p.id !== draft.id) }));
    onSaved("sales");
  };

  return (
    <section className="card card--glow pipeline-editor" aria-label="Edit pipeline">
      <span className="kicker">{isNew ? "NEW PIPELINE" : "EDIT PIPELINE"}</span>
      <Field label="Pipeline name" htmlFor="pl-name" className="pipeline-editor__name">
        <Input id="pl-name" className="u-strong" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="e.g. Client onboarding" />
      </Field>

      <div className="stack stack--8">
        <span className="field__label">Stages (left to right on the board)</span>
        {draft.stages.map((st, i) => (
          <div className="inset stage-row" key={st.id}>
            <span className="stage-row__index">{i + 1}</span>
            <span className={cn("stage-row__swatch", toneClass(stageTone(st.color)))} aria-hidden="true" />
            <Input size="sm" className="stage-row__name" aria-label="Stage name" value={st.name} onChange={(e) => patchStage(i, { name: e.target.value })} />
            <Select
              size="sm"
              className="input--auto"
              aria-label="Stage color"
              value={String(st.color)}
              options={STAGE_COLORS.map((c, k) => ({ value: String(k), label: c.name }))}
              onChange={(e) => patchStage(i, { color: Number(e.target.value) })}
            />
            {st.core && (
              <span title="Built-in stage used across the CRM">
                <Badge tone="cyan" mono size="xs">
                  CORE
                </Badge>
              </span>
            )}
            <IconButton label="Move stage left" disabled={i === 0} onClick={() => setStages(moveItem(draft.stages, i, i - 1))}>
              <Icon name="chevronLeft" size={12} strokeWidth={2.4} />
            </IconButton>
            <IconButton label="Move stage right" disabled={i === draft.stages.length - 1} onClick={() => setStages(moveItem(draft.stages, i, i + 1))}>
              <Icon name="chevronRight" size={12} strokeWidth={2.4} />
            </IconButton>
            {!st.core && (
              <IconButton label="Delete stage" danger onClick={() => setStages(draft.stages.filter((_, k) => k !== i))}>
                <Icon name="trash" size={12} />
              </IconButton>
            )}
          </div>
        ))}
        <Button
          variant="dashed"
          onClick={() => setStages([...draft.stages, { id: `st${Date.now()}`, name: "New stage", color: draft.stages.length % STAGE_COLORS.length }])}
        >
          + Add stage
        </Button>
        {draft.system && (
          <span className="text-small">
            Core stages can be renamed, recolored and reordered but not deleted, because the Dashboard, Clients and Payments use them.
          </span>
        )}
      </div>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}

      <div className="cluster pipeline-editor__footer">
        {!draft.system && !isNew && (
          <Button variant="danger" onClick={remove}>
            Delete pipeline
          </Button>
        )}
        <span className="u-spacer" />
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Save pipeline
        </Button>
      </div>
    </section>
  );
}
