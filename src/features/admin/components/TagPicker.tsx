"use client";

import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TagOut } from "@/utils/api/models";
import { tagTone } from "../lib/contacts";

type TagPickerProps = {
  tags: TagOut[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/** Toggle chips for choosing a contact's tags. */
export function TagPicker({ tags, selected, onChange, disabled }: TagPickerProps) {
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
            disabled={disabled}
            onClick={() => onChange(on ? selected.filter((x) => x !== t.id) : [...selected, t.id])}
          >
            <span aria-hidden="true">{on ? "✓" : "+"}</span>
            {t.name}
          </button>
        );
      })}
      {tags.length === 0 && <span className="text-small">No tags yet. Create them on the Tags page.</span>}
    </div>
  );
}
