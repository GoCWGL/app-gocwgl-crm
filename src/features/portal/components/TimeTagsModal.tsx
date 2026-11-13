"use client";

import { useState, type FormEvent } from "react";
import { Button, ConfirmDialog, FormError, Icon, IconButton, Input, LoadState, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TAG_COLORS, type TagColor } from "@/features/va/components/EntryLabels";
import type { TimeTagOut } from "@/utils/api/models";
import { useAddTimeTag, useDeleteTimeTag, useTimeTags, useUpdateTimeTag } from "@/utils/hooks/useClientWork";

/** Client portal › VA tracker › Tags: the labels your VAs pick from on their time. */
export function TimeTagsModal({ onClose, readOnly }: { onClose: () => void; readOnly: boolean }) {
  const tags = useTimeTags();
  const add = useAddTimeTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [removing, setRemoving] = useState<TimeTagOut | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    add.mutate({ name: name.trim(), color }, { onSuccess: () => setName("") });
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="time-tags"
      kicker="VA TRACKER"
      title="Tags for your VAs’ time"
      subtitle="Your VAs pick from these when they track time for you, and can add new ones too."
      width={560}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="stack stack--16">
        {!readOnly && (
          <form className="tt-tags-add" onSubmit={submit}>
            <Input aria-label="New tag name" placeholder="New tag, e.g. Website" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
            <ColorPick value={color} onChange={setColor} />
            <Button type="submit" variant="primary" disabled={!name.trim() || add.isPending}>
              <Icon name="plus" size={14} /> Add tag
            </Button>
          </form>
        )}
        <FormError error={add.error} />

        <LoadState query={tags} loadingText="Loading your tags…" isEmpty={!tags.data?.length} empty="No tags yet. Add your first one above.">
          <ul className="tt-tags-list">
            {(tags.data ?? []).map((t) => (
              <TagRow key={t.id} tag={t} readOnly={readOnly} onRemove={() => setRemoving(t)} />
            ))}
          </ul>
        </LoadState>
        <p className="text-small">Renaming a tag renames it on time already logged. Deleting one keeps it on past time; VAs just can’t pick it any more.</p>
      </div>

      {removing && <RemoveTag tag={removing} onClose={() => setRemoving(null)} />}
    </Modal>
  );
}

function TagRow({ tag, readOnly, onRemove }: { tag: TimeTagOut; readOnly: boolean; onRemove: () => void }) {
  const save = useUpdateTimeTag();
  const [name, setName] = useState(tag.name);
  const rename = () => name.trim() && name.trim() !== tag.name && save.mutate({ id: tag.id, body: { name: name.trim() } });
  return (
    <li className="tt-tags-row">
      <span className={`tl-dot tl-dot--${tag.color}`} aria-hidden="true" />
      {readOnly ? (
        <>
          <strong className="u-grow">{tag.name}</strong>
          {tag.addedBy && <span className="tt-tags-row__by">Added by {tag.addedBy}</span>}
        </>
      ) : (
        <>
          <input
            className="tt-tags-row__name"
            aria-label={`Rename ${tag.name}`}
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), rename())}
          />
          {tag.addedBy && <span className="tt-tags-row__by">Added by {tag.addedBy}</span>}
          <ColorPick value={tag.color as TagColor} onChange={(c) => save.mutate({ id: tag.id, body: { color: c } })} small />
          <IconButton label={`Delete ${tag.name}`} size="sm" onClick={onRemove}>
            <Icon name="trash" size={14} />
          </IconButton>
        </>
      )}
      {save.error ? <FormError error={save.error} /> : null}
    </li>
  );
}

function RemoveTag({ tag, onClose }: { tag: TimeTagOut; onClose: () => void }) {
  const remove = useDeleteTimeTag();
  return (
    <ConfirmDialog
      title={`Delete “${tag.name}”?`}
      confirmLabel="Delete tag"
      icon="trash"
      pending={remove.isPending}
      error={remove.error}
      onConfirm={() => remove.mutate(tag.id, { onSuccess: onClose })}
      onClose={onClose}
    >
      Your VAs won’t be able to pick it any more. Time already tagged keeps the label.
    </ConfirmDialog>
  );
}

function ColorPick({ value, onChange, small = false }: { value: TagColor; onChange: (c: TagColor) => void; small?: boolean }) {
  return (
    <span className={cn("tt-swatches", small && "tt-swatches--sm")} role="radiogroup" aria-label="Tag color">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={cn("tt-swatch", `tl-dot--${c}`, value === c && "is-on")}
          onClick={() => onChange(c)}
        />
      ))}
    </span>
  );
}
