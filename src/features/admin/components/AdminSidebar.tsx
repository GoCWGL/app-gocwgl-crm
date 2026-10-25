"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, CountChip, Icon, IconTile, type IconName } from "@/components/ui";
import { TAB_MENU, type AdminTab, type ContactView } from "@/data/admin";
import type { Tone } from "@/lib/tones";
import { useSubscriptions } from "@/utils/hooks/useBilling";
import { canUseMenu } from "@/utils/auth/session";
import { useSignOut } from "@/utils/hooks/useAuth";
import { useAllContacts, useTags } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { isActiveClient, isInactiveClient } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

type NavLink = { tab: AdminTab; label: string; icon: IconName; tone: Tone };

const link = (tab: AdminTab, label: string, icon: IconName, tone: Tone): NavLink => ({ tab, label, icon, tone });

const SALES: NavLink[] = [
  link("pipeline", "Pipeline", "pipeline", "pink"),
  link("calendar", "Calendar", "calendar", "orange"),
  link("payments", "Transactions", "invoice", "green"),
  link("affiliates", "Affiliates", "gift", "amber"),
];

const GROUPS: Array<{ title: string; links: NavLink[] }> = [
  { title: "Delivery", links: [link("progress", "Build Progress", "rocket", "brand"), link("media", "Client Media", "folder", "indigo")] },
  {
    title: "Marketing",
    links: [
      link("email", "Email", "mail", "sky"),
      link("forms", "Forms", "form", "indigo"),
      link("surveys", "Surveys", "survey", "purple"),
      link("automation", "Automation", "bolt", "amber"),
    ],
  },
  { title: "Insights", links: [link("reporting", "Reporting", "chart", "teal")] },
];

function NavIcon({ icon, tone }: { icon: IconName; tone: Tone }) {
  return (
    <IconTile tone={tone} size="sm">
      <Icon name={icon} size={15} strokeWidth={1.8} />
    </IconTile>
  );
}

export function AdminSidebar() {
  const router = useRouter();
  const { state, goTo, openContacts } = useAdmin();
  const { tab } = state;
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const subscriptions = useSubscriptions().data;
  const tags = useTags().data ?? [];
  const me = useMe().data;
  const signOut = useSignOut();
  const [contactsOpen, setContactsOpen] = useState(true);
  const name = me?.fullName || me?.email || "";
  // Settings › Team › Menus: only the menus this teammate may use are shown.
  const can = (t: AdminTab) => canUseMenu(me, TAB_MENU[t]);
  const sales = SALES.filter((l) => can(l.tab));
  const groups = GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => can(l.tab)) })).filter((g) => g.links.length);

  const inContacts = tab === "clients" || tab === "tags";
  const subnavOpen = contactsOpen || inContacts;

  const contactLinks: Array<{ view: ContactView | "tags"; label: string; count: number }> = [
    { view: "all", label: "Contacts", count: contacts.length },
    { view: "active", label: "Clients", count: contacts.filter((c) => isActiveClient(c, subscriptions)).length },
    { view: "inactive", label: "Inactive", count: contacts.filter((c) => isInactiveClient(c, subscriptions)).length + archived.length },
    { view: "tags", label: "Tags", count: tags.length },
  ];

  const renderLink = (l: NavLink) => (
    <NavItem
      key={l.tab}
      label={l.label}
      active={tab === l.tab}
      onClick={() => goTo(l.tab)}
      icon={<NavIcon icon={l.icon} tone={l.tone} />}
    />
  );

  return (
    <Sidebar
      label="Main menu"
      brand={<Image src={logoWordmark} alt="GoCWGL" width={168} priority />}
      footer={
        <>
          <SidebarGroup title="Support">
            {can("bugs") && (
              <NavItem label="Report Bugs" active={tab === "bugs"} onClick={() => goTo("bugs")} icon={<NavIcon icon="bug" tone="red" />} />
            )}
            <NavItem
              label={signOut.isPending ? "Signing out…" : "Sign out"}
              onClick={() => signOut.mutate(undefined, { onSettled: () => router.replace("/login") })}
              icon={<NavIcon icon="arrowLeft" tone="slate" />}
            />
          </SidebarGroup>
          <ProfileButton
            avatar={<Avatar name={name} brand ring />}
            name={name}
            subtitle="Profile & settings"
            active={tab === "settings"}
            onClick={() => goTo("settings")}
            trailing={<Icon name="settings" size={17} strokeWidth={1.9} className="profile-button__icon" />}
          />
        </>
      }
    >
      {can("dashboard") && (
        <SidebarGroup>
          <NavItem
            label="Dashboard"
            active={tab === "dashboard"}
            onClick={() => goTo("dashboard")}
            icon={<NavIcon icon="grid" tone="cyan" />}
          />
        </SidebarGroup>
      )}

      {(can("clients") || sales.length > 0) && (
        <SidebarGroup title="Sales">
          {can("clients") && (
            <NavItem
              label="Contacts"
              highlighted={inContacts}
              expanded={subnavOpen}
              onClick={() => setContactsOpen(inContacts ? true : !contactsOpen)}
              icon={<NavIcon icon="users" tone="purple" />}
            />
          )}
          {can("clients") && subnavOpen && (
            <div className="subnav" role="group" aria-label="Contacts">
              {contactLinks.map((l, i) => {
                const active = l.view === "tags" ? tab === "tags" : tab === "clients" && state.contactView === l.view;
                return (
                  <button
                    key={l.view}
                    type="button"
                    className="subnav__item"
                    aria-current={active ? "page" : undefined}
                    onClick={() => (l.view === "tags" ? goTo("tags") : openContacts(l.view))}
                  >
                    <span className="subnav__node" aria-hidden="true" />
                    <span className="subnav__index">0{i + 1}</span>
                    <span className="u-grow">{l.label}</span>
                    <CountChip>{l.count}</CountChip>
                  </button>
                );
              })}
            </div>
          )}
          {sales.map(renderLink)}
        </SidebarGroup>
      )}

      {groups.map((g) => (
        <SidebarGroup key={g.title} title={g.title}>
          {g.links.map(renderLink)}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
