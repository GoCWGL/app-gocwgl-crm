"use client";

import { useState } from "react";
import { Badge, ConfirmDialog, FormError, Icon, Toggle } from "@/components/ui";
import { formatShort } from "@/utils/format/dates";
import type { ContactOut, ContactUpdate } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { useUpdateContact } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

type PackageKey = "showCrmPackages" | "showFunnelPackages" | "showVaPackages";

/** `fallback`: whether it shows before the team has set it (CRM and VA do; Funnel doesn't). */
const PACKAGES: Array<{ key: PackageKey; label: string; menu: string; on: string; off: string; fallback: boolean }> = [
  {
    key: "showCrmPackages",
    label: "CRM service",
    menu: "The CRM menu",
    on: "They see the CRM menu with Request CRM, the packages and prices. On when they signed up for a Custom CRM.",
    off: "Hidden: no CRM menu and no new CRM builds; CRM builds or requests they already have still show. Off when they signed up for a VA.",
    fallback: true,
  },
  {
    key: "showFunnelPackages",
    label: "Funnel menu",
    menu: "The Funnel menu",
    on: "They see the Funnel menu: Request Funnel with the packages and prices, their funnel builds and Build progress.",
    off: "Hidden (the default): no Funnel menu in their portal, so no funnel packages, funnel builds or funnel requests.",
    fallback: false,
  },
  {
    key: "showVaPackages",
    label: "VA service",
    menu: "The VA menu",
    on: "They see the VA menu with Request VA and can ask GoCWGL for a VA. On when they signed up for a VA.",
    off: "Hidden: no VA menu and no VA requests; requests they already sent and their VA team still show. Off when they signed up for a Custom CRM.",
    fallback: true,
  },
];

/** Per-client switches for their portal: the CRM menu, the Funnel menu, the VA menu and Beta tester. Sign-up sets CRM and VA from what the client picked. Each asks to confirm. */
export function PortalMenuCard({ contact: c }: { contact: ContactOut }) {
  const { update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const save = useUpdateContact();

  // Every switch asks first: it opens a confirmation, and only "Yes" saves it.
  const [pending, setPending] = useState<{ key: PackageKey | "betaTester"; next: boolean } | null>(null);
  const ask = (key: PackageKey | "betaTester", next: boolean) => {
    if (!canWrite || save.isPending) return;
    save.reset();
    setPending({ key, next });
  };
  const beta = c.betaTester ?? false;
  const who = c.company || c.name || c.email;

  const confirm = (() => {
    if (!pending) return null;
    const { key, next } = pending;
    if (key === "betaTester") {
      return {
        title: next ? `Make ${who} a beta tester?` : `Remove ${who} as a beta tester?`,
        label: next ? "Yes, make them a beta tester" : "Yes, remove",
        body: next
          ? "Their portal shows a Beta tester card at the top of every page and a label under the logo. You can turn it off any time."
          : "The Beta tester card and label disappear from their portal.",
        toast: next ? "This client is now a beta tester." : "This client is no longer a beta tester.",
      };
    }
    const p = PACKAGES.find((x) => x.key === key)!;
    return {
      title: next ? `Show ${p.label} to ${who}?` : `Hide ${p.label} from ${who}?`,
      label: next ? "Yes, show it" : "Yes, hide it",
      body: next ? p.on : p.off,
      toast: next ? `${p.menu} is on for this client.` : `${p.menu} is hidden for this client.`,
    };
  })();

  const saveSwitch = () => {
    if (!pending || !confirm || !canWrite || save.isPending) return;
    const body: ContactUpdate = { [pending.key]: pending.next };
    save.mutate(
      { id: c.id, body },
      {
        onSuccess: () => {
          setPending(null);
          update({ toast: confirm.toast });
        },
      },
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
          <span className="text-tiny">Choose which menus this client sees in their portal.</span>
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
            <Toggle label={`Show ${p.label}`} checked={on} onChange={(next) => ask(p.key, next)} />
          </div>
        );
      })}
      {/* Beta tester: their portal shows a Beta tester card at the top of every page (and a label under the logo). */}
      <div className="cluster cluster--nowrap portal-menu-row">
        <span className="stack stack--2 u-grow">
          <span className="text-small u-strong">Beta tester</span>
          <span className="text-tiny">
            {beta ? "Their portal shows a Beta tester card at the top of every page." : "Off (the default). Turn on to show a Beta tester card in their portal."}
          </span>
        </span>
        <Toggle
          label="Beta tester"
          checked={beta}
          onChange={(next) => ask("betaTester", next)}
        />
      </div>
      {/* The VA agreement: the client ticks that they understand it (VA › Agreement) before their first VA request. */}
      <div className="cluster cluster--nowrap portal-menu-row">
        <span className="stack stack--2 u-grow">
          <span className="text-small u-strong">VA agreement</span>
          <span className="text-tiny">
            {c.vaAgreementAcceptedAt
              ? `Confirmed ${formatShort(c.vaAgreementAcceptedAt)}. They can request a VA while VA packages is on.`
              : "Not confirmed yet. They confirm it on VA › Agreement before their first VA request."}
          </span>
        </span>
        <Badge tone={c.vaAgreementAcceptedAt ? "green" : "slate"}>{c.vaAgreementAcceptedAt ? "Confirmed" : "Pending"}</Badge>
      </div>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          confirmLabel={confirm.label}
          icon="sparkle"
          pending={save.isPending}
          error={save.error}
          onConfirm={saveSwitch}
          onClose={() => setPending(null)}
        >
          {confirm.body}
        </ConfirmDialog>
      )}
      {!pending && <FormError error={save.error} />}
    </div>
  );
}
