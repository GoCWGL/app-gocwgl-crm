"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Badge, Button, Field, Icon, IconButton, IconTile, Input } from "@/components/ui";
import { TAG_COLORS } from "@/data/admin";
import { slugify } from "@/lib/utils";
import { tagTone } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

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
  const { state, update } = useAdmin();
  const { tags, contacts, contactTags } = state;
  const [name, setName] = useState("");
  const [color, setColor] = useState(3);

  const create = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((s) => ({ tags: [...s.tags, { id: `${slugify(trimmed)}-${Date.now()}`, name: trimmed, color }] }));
    setName("");
  };

  const remove = (id: string) =>
    update((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      contactTags: Object.fromEntries(Object.entries(s.contactTags).map(([cid, ids]) => [cid, ids.filter((x) => x !== id)])),
    }));

  return (
    <div className="page-stack">
      <form className="card tag-creator" onSubmit={create}>
        <Field label="New tag name" htmlFor="tag-name" strongLabel className="tag-creator__name">
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
        <Button type="submit" variant="primary" size="lg">
          + Create tag
        </Button>
      </form>

      <div className="tag-grid">
        {tags.map((t) => {
          const used = contacts.filter((c) => (contactTags[c.id] ?? []).includes(t.id)).length;
          return (
            <div className="card card--tight tag-card" key={t.id}>
              <IconTile tone={tagTone(t)} size="md">
                <Icon name="tag" size={16} strokeWidth={1.8} />
              </IconTile>
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{t.name}</span>
                <span className="text-small">Used on {used} contacts</span>
              </div>
              <IconButton label={`Delete tag ${t.name}`} size="lg" onClick={() => remove(t.id)}>
                <Icon name="trash" size={14} />
              </IconButton>
            </div>
          );
        })}
      </div>
      <p className="text-muted">Add these tags to a contact from its card in the Pipeline.</p>
    </div>
  );
}
