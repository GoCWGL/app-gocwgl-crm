"use client";

import type { Tag } from "@/data/admin";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { tagTone } from "../lib/contacts";

type TagPickerProps = {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

/** Toggle chips for choosing a contact's tags. */
export function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  return (
    <div className="cluster cluster--6" role="group" aria-label="Tags">
      {tags.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={cn("chip chip--sm", toneClass(tagTone(t)))}
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== t.id) : [...selected, t.id])}
          >
            <span aria-hidden="true">{on ? "✓" : "+"}</span>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
