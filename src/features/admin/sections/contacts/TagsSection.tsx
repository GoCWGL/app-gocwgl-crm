"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconButton, IconTile, Input, LoadState } from "@/components/ui";
import { TAG_COLORS } from "@/data/admin";
import { fieldErrors } from "@/utils/errors";
import { useCreateTag, useDeleteTag, useTags } from "@/utils/hooks/useContacts";
import { tagTone } from "../../lib/contacts";

/** Solid swatch colors for the tag color picker (match the tone foregrounds). */
const SWATCH_HEX: Record<string, string> = {
  red: "#B91C1C",
  orange: "#C2410C",
  purple: "#6D28D9",
  cyan: "#0E7490",
  teal: "#0F766E",
  green: "#15803D",
  pink: "#BE185D",
};

export function TagsSection() {
  const tagsQuery = useTags();
  const tags = tagsQuery.data ?? [];
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState(3);

  const create = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createTag.mutate({ name: trimmed, color }, { onSuccess: () => setName("") });
  };

  return (
    <div className="page-stack">
      <form className="card tag-creator" onSubmit={create}>
        <Field label="New tag name" htmlFor="tag-name" strongLabel className="tag-creator__name" error={fieldErrors(createTag.error).name}>
          <Input id="tag-name" placeholder="e.g. Webinar lead" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Color" strongLabel>
          <div className="cluster cluster--8" role="group" aria-label="Tag color">
            {TAG_COLORS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className="swatch"
                aria-label={c.name}
                aria-pressed={color === i}
                style={{ "--swatch": SWATCH_HEX[c.tone] } as CSSProperties}
                onClick={() => setColor(i)}
              />
            ))}
          </div>
        </Field>
        <Field label="Preview" strongLabel>
          <Badge tone={TAG_COLORS[color].tone} dot size="lg">
            {name.trim() || "Tag preview"}
          </Badge>
        </Field>
        <Button type="submit" variant="primary" size="lg" disabled={createTag.isPending}>
          + Create tag
        </Button>
        {!fieldErrors(createTag.error).name && <FormError error={createTag.error} />}
      </form>

      <FormError error={deleteTag.error} />
      <LoadState query={tagsQuery} isEmpty={!tags.length} empty="No tags yet. Create your first one above.">
      <div className="tag-grid">
        {tags.map((t) => {
          const used = t.contactCount ?? 0;
          return (
            <div className="card card--tight tag-card" key={t.id}>
              <IconTile tone={tagTone(t)} size="md">
                <Icon name="tag" size={16} strokeWidth={1.8} />
              </IconTile>
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{t.name}</span>
                <span className="text-small">Used on {used} {used === 1 ? "contact" : "contacts"}</span>
              </div>
              <IconButton label={`Delete tag ${t.name}`} size="lg" disabled={deleteTag.isPending} onClick={() => deleteTag.mutate(t.id)}>
                <Icon name="trash" size={14} />
              </IconButton>
            </div>
          );
        })}
      </div>
      </LoadState>
      <p className="text-muted">Add these tags to a contact from its card in the Pipeline.</p>
    </div>
  );
}
