"use client";

import { useState } from "react";
import { Button, FormError, Icon, IconTile, Modal, Toggle, type IconName } from "@/components/ui";
import { MENUS, type MenuKey } from "@/data/admin";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
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

/** Each menu's sidebar icon and colour, so the picker reads like the menu itself. */
const MENU_LOOK: Record<MenuKey, { icon: IconName; tone: Tone }> = {
  dashboard: { icon: "grid", tone: "cyan" },
  contacts: { icon: "users", tone: "purple" },
  pipeline: { icon: "pipeline", tone: "pink" },
  calendar: { icon: "calendar", tone: "orange" },
  payments: { icon: "invoice", tone: "green" },
  affiliates: { icon: "gift", tone: "amber" },
  progress: { icon: "rocket", tone: "brand" },
  media: { icon: "folder", tone: "indigo" },
  email: { icon: "mail", tone: "sky" },
  forms: { icon: "form", tone: "indigo" },
  surveys: { icon: "survey", tone: "purple" },
  automation: { icon: "bolt", tone: "amber" },
  reporting: { icon: "chart", tone: "teal" },
  bugs: { icon: "bug", tone: "red" },
};

/**
 * Every menu (a switch), or just the ones picked from a grid of menu tiles. Each tile is a real checkbox underneath,
 * so it works with the keyboard and screen readers. Settings (their own profile) is always available.
 */
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
      <div className="menu-access__head">
        <legend className="field__label field__label--strong">Menu access</legend>
        <span className="menu-access__count">{all ? "All menus" : `${chosen.size} of ${MENUS.length}`}</span>
      </div>

      <div className={cn("menu-access__all", all && "menu-access__all--on")}>
        <span className="stack stack--2 u-grow">
          <span className="text-strong">Every menu</span>
          <span className="text-small">Turn off to choose exactly which pages they can open.</span>
        </span>
        <Toggle label="Every menu" checked={all} onChange={(on) => onChange(on ? null : MENUS.map((m) => m.key))} />
      </div>

      {!all && (
        <>
          <div className="cluster cluster--8 menu-access__tools">
            <Button size="sm" variant="link" onClick={() => onChange(MENUS.map((m) => m.key))}>
              Select all
            </Button>
            <Button size="sm" variant="link" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
          <div className="menu-access__grid" role="group" aria-label="Menus they can use">
            {MENUS.map((m) => {
              const on = chosen.has(m.key);
              const look = MENU_LOOK[m.key];
              return (
                <label key={m.key} className={cn("menu-tile", on && "menu-tile--on")} htmlFor={`${idPrefix}-${m.key}`}>
                  <input
                    id={`${idPrefix}-${m.key}`}
                    type="checkbox"
                    className="menu-tile__input"
                    checked={on}
                    onChange={() => toggle(m.key)}
                  />
                  <IconTile tone={look.tone} size="sm">
                    <Icon name={look.icon} size={14} strokeWidth={1.9} />
                  </IconTile>
                  <span className="menu-tile__label">{m.label}</span>
                  <span className="menu-tile__check" aria-hidden="true">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
      <span className={cn("field__hint", !all && value?.length === 0 && "field__hint--warn")}>
        {all
          ? "They’ll see every menu their role allows."
          : value && value.length === 0
            ? "Pick at least one menu."
            : "They’ll only see the menus picked here; the others are hidden and locked for them. Settings (their profile) is always there."}
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
      width={640}
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
