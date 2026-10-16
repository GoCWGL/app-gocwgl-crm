"use client";

import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, Icon, IconTile } from "@/components/ui";
import { PORTAL_NAV, type PortalTab } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { initials } from "@/lib/utils";
import { getHealth } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

type PortalSidebarProps = {
  /** Business shown at the top (overridden by ?biz= when an admin views as client). */
  business: string;
  subtitle: string;
};

export function PortalSidebar({ business, subtitle }: PortalSidebarProps) {
  const { state, goTo } = usePortal();
  const health = getHealth(state);
  const openTodos = state.todos.filter((t) => !t.done).length;
  const hasOpenInvoice = state.invoices.some((i) => i.status === "Open");

  const badges: Partial<Record<PortalTab, { text: string; tone: Tone }>> = {
    ...(health.issues.length && { health: { text: String(health.issues.length), tone: "amber" } }),
    ...(openTodos && { build: { text: String(openTodos), tone: "brand" } }),
    ...(hasOpenInvoice && { billing: { text: "1", tone: "red" } }),
  };

  return (
    <Sidebar
      label="Portal menu"
      brand={
        <div className="portal-brand">
          <span className="portal-brand__mark" aria-hidden="true">
            {initials(business)}
          </span>
          <div className="stack stack--2 u-grow">
            <span className="portal-brand__name">{business}</span>
            <span className="text-tiny">{subtitle}</span>
          </div>
        </div>
      }
      footer={
        <>
          <ProfileButton
            avatar={<Avatar name={state.profile.name} tone="purple" ring />}
            name={state.profile.name}
            subtitle="Account & settings"
            active={state.tab === "account"}
            onClick={() => goTo("account")}
          />
          <div className="portal-powered">
            <span className="kicker kicker--sm kicker--muted">POWERED BY</span>
            <Image src={logoWordmark} alt="GoCWGL" width={92} />
          </div>
        </>
      }
    >
      {PORTAL_NAV.map((group) => (
        <SidebarGroup key={group.group} title={group.group}>
          {group.items.map((item) => (
            <NavItem
              key={item.tab}
              label={item.label}
              active={state.tab === item.tab}
              onClick={() => goTo(item.tab)}
              badge={badges[item.tab]}
              icon={
                <IconTile tone={item.tone} size="sm">
                  <Icon name={item.icon} size={14} strokeWidth={1.9} />
                </IconTile>
              }
            />
          ))}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
