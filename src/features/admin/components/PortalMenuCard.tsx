"use client";

import { FormError, Icon, Toggle } from "@/components/ui";
import type { ContactOut, ContactUpdate } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { useUpdateContact } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

type PackageKey = "showCrmPackages" | "showFunnelPackages" | "showVaPackages";

/** `fallback`: whether it shows before the team has set it (CRM and Funnel do; VA doesn't). */
const PACKAGES: Array<{ key: PackageKey; label: string; menu: string; on: string; off: string; fallback: boolean }> = [
  {
    key: "showCrmPackages",
    label: "CRM packages",
    menu: "Request CRM",
    on: "They see Request CRM with the CRM packages and prices.",
    off: "Hidden: they can’t see the CRM packages or request a new CRM build.",
    fallback: true,
  },
  {
    key: "showFunnelPackages",
    label: "Funnel packages",
    menu: "Request Funnel",
    on: "They see Request Funnel with the funnel packages and prices.",
    off: "Hidden: they can’t see the funnel packages or request a new funnel build.",
    fallback: true,
  },
  {
    key: "showVaPackages",
    label: "VA packages",
    menu: "Request VA",
    on: "They see Request VA and can ask GoCWGL for a VA.",
    off: "Hidden (the default): they can’t request a VA. Requests they already sent still show.",
    fallback: false,
  },
];

/** Per-client switches for their portal menu: which packages menus show (Request CRM, Request Funnel, Request VA). */
export function PortalMenuCard({ contact: c }: { contact: ContactOut }) {
  const { update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const save = useUpdateContact();

  const toggle = (key: PackageKey, menu: string, next: boolean) => {
    if (!canWrite || save.isPending) return;
    const body: ContactUpdate = { [key]: next };
    save.mutate(
      { id: c.id, body },
      { onSuccess: () => update({ toast: next ? `${menu} is on for this client.` : `${menu} is hidden for this client.` }) },
    );
  };

  return (
    <div className="inset portal-login">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-purple" aria-hidden="true">
          <Icon name="sparkle" size={14} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">PORTAL MENU</span>
          <span className="text-tiny">Choose which packages menus this client sees in their portal.</span>
        </span>
      </div>
      {PACKAGES.map((p) => {
        const on = c[p.key] ?? p.fallback;
        return (
          <div key={p.key} className="cluster cluster--nowrap portal-menu-row">
            <span className="stack stack--2 u-grow">
              <span className="text-small u-strong">{p.label}</span>
              <span className="text-tiny">{on ? p.on : p.off}</span>
            </span>
            <Toggle label={`Show ${p.label}`} checked={on} onChange={(next) => toggle(p.key, p.menu, next)} />
          </div>
        );
      })}
      <FormError error={save.error} />
    </div>
  );
}
