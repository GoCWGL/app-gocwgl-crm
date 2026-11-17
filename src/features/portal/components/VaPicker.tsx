"use client";

import { Avatar, Field, Icon, Select } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TeamVa } from "@/utils/api/models";

export type VaAssignment = { main: string | null; backups: string[] };

/**
 * Who's on a task: the main VA who does it, then backup VAs who cover for them. They share the task: one status and
 * one conversation. No main VA = GoCWGL chooses (and there are no backups).
 */
export function VaAssign({
  team,
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  team: TeamVa[];
  value: VaAssignment;
  onChange: (next: VaAssignment) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const others = team.filter((v) => v.vaId !== value.main);
  const setMain = (main: string) =>
    // The new main VA can't also be a backup; no main VA takes the backups off too.
    onChange({ main: main || null, backups: main ? value.backups.filter((b) => b !== main) : [] });
  const toggle = (id: string) =>
    onChange({ ...value, backups: value.backups.includes(id) ? value.backups.filter((b) => b !== id) : [...value.backups, id] });

  return (
    <div className="va-assign">
      <Field label="Main VA" htmlFor={`${idPrefix}-main`} hint="The VA who does this task.">
        <Select
          id={`${idPrefix}-main`}
          value={value.main ?? ""}
          disabled={disabled}
          onChange={(e) => setMain(e.target.value)}
          options={[{ value: "", label: "Let GoCWGL choose" }, ...team.map((v) => ({ value: v.vaId, label: v.name + (v.headline ? ` — ${v.headline}` : "") }))]}
        />
      </Field>

      {others.length > 0 && (
        <Field label="Backup VAs (optional)" hint={value.main ? "They cover for the main VA and can work on it too." : "Pick the main VA first."}>
          <div className="va-pick__list" role="group" aria-label="Backup VAs">
            {others.map((v) => {
              const on = value.backups.includes(v.vaId);
              return (
                <button
                  key={v.vaId}
                  type="button"
                  className={cn("va-pick__chip", on && "is-on")}
                  aria-pressed={on}
                  disabled={disabled || !value.main}
                  onClick={() => toggle(v.vaId)}
                >
                  <Avatar name={v.name} tone={avatarTone(v.vaId)} size="sm" />
                  <span className="va-pick__name">
                    <strong>{v.name}</strong>
                    {v.headline && <span>{v.headline}</span>}
                  </span>
                  <span className="va-pick__check" aria-hidden="true">
                    {on && <Icon name="check" size={12} strokeWidth={2.6} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      )}
    </div>
  );
}

/** A task's VAs as the picker's value. */
export const assignmentOf = (vas: Array<{ id: string; role?: string }>): VaAssignment => ({
  main: vas.find((v) => v.role !== "backup")?.id ?? null,
  backups: vas.filter((v) => v.role === "backup").map((v) => v.id),
});
