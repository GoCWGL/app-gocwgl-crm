"use client";

import { Avatar, Icon } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; headline: string };

/**
 * Pick who can see something (an asset, an SOP): the client's VAs, or a VA's teammates. "Select all" picks everyone.
 * With nobody to pick from, shows `nobody` instead.
 */
export function VaSharePicker({
  vas,
  value,
  onChange,
  label,
  people,
  onlyYou,
  nobody,
}: {
  vas: Person[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Accessible name of the group ("Who can see this"). */
  label: string;
  /** Count line: "2 of 3 VAs". */
  people: string;
  /** Nobody picked yet. */
  onlyYou: string;
  /** No one to pick from. */
  nobody: string;
}) {
  if (!vas.length) return <p className="text-small ast-share__none">{nobody}</p>;
  const allOn = vas.every((v) => value.includes(v.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="ast-share">
      <div className="ast-share__head">
        <span className="text-small">{value.length ? `${value.length} of ${vas.length} ${people}` : onlyYou}</span>
        <button type="button" className="btn btn--link" onClick={() => onChange(allOn ? [] : vas.map((v) => v.id))}>
          {allOn ? "Clear" : "Select all"}
        </button>
      </div>
      <div className="ast-share__list" role="group" aria-label={label}>
        {vas.map((v) => {
          const on = value.includes(v.id);
          return (
            <button key={v.id} type="button" className={cn("ast-va-pick", on && "is-on")} aria-pressed={on} onClick={() => toggle(v.id)}>
              <Avatar name={v.name} tone={avatarTone(v.id)} size="sm" />
              <span className="ast-va-pick__text">
                <strong>{v.name}</strong>
                {v.headline && <span>{v.headline}</span>}
              </span>
              <span className="ast-va-pick__check" aria-hidden="true">
                {on && <Icon name="check" size={12} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
