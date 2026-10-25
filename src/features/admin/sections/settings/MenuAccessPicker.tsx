"use client";

import { useState } from "react";
import { Button, Checkbox, FormError, Icon, IconTile, Modal } from "@/components/ui";
import { MENUS, type MenuKey } from "@/data/admin";
import type { MemberOut } from "@/utils/api/models";
import { useChangeMenuAccess } from "@/utils/hooks/useUsers";

/** null = every menu. */
export type MenuAccess = MenuKey[] | null;

/** "Every menu", "3 of 14 menus: Contacts, Pipeline, Calendar". */
export function menuAccessLabel(access: string[] | null | undefined): string {
  if (access == null) return "Every menu";
  const names = MENUS.filter((m) => access.includes(m.key)).map((m) => m.label);
  return `${names.length} of ${MENUS.length} menus: ${names.join(", ")}`;
}

/** Every menu, or just the ones ticked. Settings (their own profile) is always available. */
export function MenuAccessPicker({ value, onChange, idPrefix }: { value: MenuAccess; onChange: (next: MenuAccess) => void; idPrefix: string }) {
  const all = value === null;
  const chosen = new Set<MenuKey>(value ?? MENUS.map((m) => m.key));
  const toggle = (key: MenuKey) => {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(MENUS.filter((m) => next.has(m.key)).map((m) => m.key));
  };

  return (
    <fieldset className="menu-access">
      <legend className="field__label field__label--strong">Menu access</legend>
      <div className="cluster cluster--8">
        <Checkbox
          brand
          id={`${idPrefix}-all`}
          label="Every menu"
          checked={all}
          onChange={() => onChange(all ? MENUS.map((m) => m.key) : null)}
        />
        {!all && (
          <>
            <Button size="sm" variant="link" onClick={() => onChange(MENUS.map((m) => m.key))}>
              Tick all
            </Button>
            <Button size="sm" variant="link" onClick={() => onChange([])}>
              Clear
            </Button>
          </>
        )}
      </div>
      {!all && (
        <div className="menu-access__grid">
          {MENUS.map((m) => (
            <Checkbox key={m.key} id={`${idPrefix}-${m.key}`} label={m.label} checked={chosen.has(m.key)} onChange={() => toggle(m.key)} />
          ))}
        </div>
      )}
      <span className="field__hint">
        {all
          ? "They’ll see every menu their role allows. Untick to choose."
          : value && value.length === 0
            ? "Pick at least one menu."
            : "They’ll only see these menus; the others are hidden and locked for them. Settings (their profile) is always there."}
      </span>
    </fieldset>
  );
}

/** Change an existing teammate's menus. */
export function MenuAccessDialog({ member: m, onClose, onSaved }: { member: MemberOut; onClose: () => void; onSaved: (message: string) => void }) {
  const save = useChangeMenuAccess();
  const [access, setAccess] = useState<MenuAccess>((m.menuAccess as MenuKey[] | null | undefined) ?? null);
  const who = m.fullName || m.email;

  return (
    <Modal
      open
      width={560}
      onClose={onClose}
      titleId="menus-title"
      kicker="TEAM"
      title={`${who}’s menus`}
      subtitle="Changes apply straight away, on their next click."
      media={
        <IconTile brand size="lg">
          <Icon name="grid" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={save.isPending || (access !== null && access.length === 0)}
            onClick={() =>
              save.mutate(
                { userId: m.id, menuAccess: access },
                { onSuccess: () => onSaved(`${who} now has ${access === null ? "every menu" : `${access.length} menu${access.length === 1 ? "" : "s"}`}.`) },
              )
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <MenuAccessPicker value={access} onChange={setAccess} idPrefix={`menus-${m.id}`} />
      <FormError error={save.error} />
    </Modal>
  );
}
