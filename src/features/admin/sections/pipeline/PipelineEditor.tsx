"use client";

import { useState } from "react";
import { Badge, Button, Field, FormError, Icon, IconButton, Input, Select } from "@/components/ui";
import { STAGE_COLORS } from "@/data/admin";
import { toneClass } from "@/lib/tones";
import { cn, moveItem } from "@/lib/utils";
import type { PipelineOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useCreatePipeline, useDeletePipeline, useUpdatePipeline } from "@/utils/hooks/useContacts";
import { stageTone } from "../../lib/contacts";

/** A stage being edited. `id` is the API id (missing for stages added here); `key` keeps React lists stable. */
export type StageDraft = { key: string; id?: string; name: string; color: number; isCore?: boolean };
export type PipelineDraft = { id: string; name: string; isSystem: boolean; stages: StageDraft[] };

let localKey = 0;
export const newStage = (name: string, color: number): StageDraft => ({ key: `new-${++localKey}`, name, color });

export function draftOf(p: PipelineOut): PipelineDraft {
  return {
    id: p.id,
    name: p.name,
    isSystem: p.isSystem,
    stages: [...p.stages].sort((a, b) => a.position - b.position).map((s) => ({ key: s.id, id: s.id, name: s.name, color: s.color, isCore: s.isCore })),
  };
}

type PipelineEditorProps = {
  draft: PipelineDraft;
  isNew: boolean;
  onChange: (draft: PipelineDraft) => void;
  onCancel: () => void;
  /** Called with the id of the saved (or new) pipeline, or "" after a delete. */
  onSaved: (id: string) => void;
};

/** Rename, recolor, reorder, add and delete the stages of a pipeline. */
export function PipelineEditor({ draft, isNew, onChange, onCancel, onSaved }: PipelineEditorProps) {
  const [error, setError] = useState("");
  const create = useCreatePipeline();
  const update = useUpdatePipeline();
  const remove = useDeletePipeline();
  const pending = create.isPending || update.isPending || remove.isPending;

  const setStages = (stages: StageDraft[]) => {
    onChange({ ...draft, stages });
    setError("");
  };
  const patchStage = (i: number, patch: Partial<StageDraft>) => setStages(draft.stages.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));

  const save = () => {
    if (!draft.name.trim()) return setError("Give the pipeline a name.");
    if (!draft.stages.length) return setError("Add at least one stage.");
    if (draft.stages.some((s) => !s.name.trim())) return setError("Every stage needs a name.");
    const stages = draft.stages.map((s) => ({ ...(s.id && { id: s.id }), name: s.name.trim(), color: s.color }));
    if (isNew) create.mutate({ name: draft.name.trim(), stages }, { onSuccess: (p) => onSaved(p.id), onError });
    // The API moves contacts in a deleted stage to the first stage.
    else update.mutate({ id: draft.id, body: { name: draft.name.trim(), stages } }, { onSuccess: () => onSaved(draft.id), onError });
  };

  return (
    <section className="card card--glow pipeline-editor" aria-label="Edit pipeline">
      <span className="kicker">{isNew ? "NEW PIPELINE" : "EDIT PIPELINE"}</span>
      <Field label="Pipeline name" htmlFor="pl-name" className="pipeline-editor__name">
        <Input
          id="pl-name"
          className="u-strong"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="e.g. Client onboarding"
        />
      </Field>

      <div className="stack stack--8">
        <span className="field__label">Stages (left to right on the board)</span>
        {draft.stages.map((st, i) => (
          <div className="inset stage-row" key={st.key}>
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
            {st.isCore && (
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
            {!st.isCore && (
              <IconButton label="Delete stage" danger onClick={() => setStages(draft.stages.filter((_, k) => k !== i))}>
                <Icon name="trash" size={12} />
              </IconButton>
            )}
          </div>
        ))}
        {!draft.isSystem && (
          <Button variant="dashed" onClick={() => setStages([...draft.stages, newStage("New stage", draft.stages.length % STAGE_COLORS.length)])}>
            + Add stage
          </Button>
        )}
        {draft.isSystem && (
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
      <FormError error={remove.error} />

      <div className="cluster pipeline-editor__footer">
        {!draft.isSystem && !isNew && (
          <Button variant="danger" disabled={pending} onClick={() => remove.mutate(draft.id, { onSuccess: () => onSaved("") })}>
            Delete pipeline
          </Button>
        )}
        <span className="u-spacer" />
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save pipeline"}
        </Button>
      </div>
    </section>
  );
}
