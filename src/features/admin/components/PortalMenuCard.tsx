"use client";

import { FormError, Icon, Toggle } from "@/components/ui";
import type { ContactOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { useUpdateContact } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

/** Per-client switches for their portal menu: today, whether the CRM and Funnel packages ("Request CRM / Funnel") show. */
export function PortalMenuCard({ contact: c }: { contact: ContactOut }) {
  const { update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const save = useUpdateContact();
  const on = c.showPackages !== false;

  const toggle = (next: boolean) => {
    if (!canWrite || save.isPending) return;
    save.mutate(
      { id: c.id, body: { showPackages: next } },
      { onSuccess: () => update({ toast: next ? "Packages menu is on for this client." : "Packages menu is off for this client." }) },
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
          <span className="text-small u-strong">Show packages menu</span>
          <span className="text-tiny">
            {on
              ? "They see Request CRM and Request Funnel with the packages and prices."
              : "Hidden: they can’t see the packages or request a new CRM or funnel build."}
          </span>
        </span>
        <Toggle label="Show packages menu" checked={on} onChange={toggle} />
      </div>
      <FormError error={save.error} />
    </div>
  );
}
