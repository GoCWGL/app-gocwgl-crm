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
    label: "CRM packages",
    menu: "Request CRM",
    on: "They see Request CRM with the CRM packages and prices.",
    off: "Hidden: they can’t see the CRM packages or request a new CRM build.",
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
    label: "VA packages",
    menu: "Request VA",
    on: "They see Request VA (the default) and can ask GoCWGL for a VA.",
    off: "Hidden: they can’t request a VA. Requests they already sent still show.",
    fallback: true,
  },
];

/** Per-client switches for their portal menu: Request CRM, the whole Funnel menu, and Request VA. */
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

  // Beta tester asks first: the switch opens a confirmation, and only "Yes" saves it.
  const [confirmBeta, setConfirmBeta] = useState<boolean | null>(null);
  const saveBeta = (next: boolean) => {
    if (!canWrite || save.isPending) return;
    save.mutate(
      { id: c.id, body: { betaTester: next } },
      {
        onSuccess: () => {
          setConfirmBeta(null);
          update({ toast: next ? "This client is now a beta tester." : "This client is no longer a beta tester." });
        },
      },
    );
  };
  const beta = c.betaTester ?? false;
  const who = c.company || c.name || c.email;

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
            <Toggle label={`Show ${p.label}`} checked={on} onChange={(next) => toggle(p.key, p.menu, next)} />
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
          onChange={(next) => {
            if (!canWrite || save.isPending) return;
            save.reset();
            setConfirmBeta(next);
          }}
        />
      </div>
      {confirmBeta !== null && (
        <ConfirmDialog
          title={confirmBeta ? `Make ${who} a beta tester?` : `Remove ${who} as a beta tester?`}
          confirmLabel={confirmBeta ? "Yes, make them a beta tester" : "Yes, remove"}
          icon="sparkle"
          pending={save.isPending}
          error={save.error}
          onConfirm={() => saveBeta(confirmBeta)}
          onClose={() => setConfirmBeta(null)}
        >
          {confirmBeta
            ? "Their portal shows a Beta tester card at the top of every page and a label under the logo. You can turn it off any time."
            : "The Beta tester card and label disappear from their portal."}
        </ConfirmDialog>
      )}
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
      <FormError error={save.error} />
    </div>
  );
}
