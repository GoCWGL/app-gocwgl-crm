"use client";

import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, Icon, type IconName } from "@/components/ui";
import { HIDDEN_TABS, TAB_MENU, type AdminTab } from "@/data/admin";
import { canUseMenu } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

/** One menu entry. Contacts and Clients are both the "clients" page, opened on a different view. */
type MenuItem = { key: string; tab: AdminTab; label: string; icon: IconName };

const item = (tab: AdminTab, label: string, icon: IconName, key: string = tab): MenuItem => ({ key, tab, label, icon });

/** The admin menu, by what each part of the work is for. */
const MENU: Array<{ title: string; items: MenuItem[] }> = [
  { title: "Overview", items: [item("dashboard", "Dashboard", "grid"), item("reporting", "Reports", "chart")] },
  {
    title: "Customers",
    items: [item("clients", "Contacts", "users", "contacts"), item("clients", "Clients", "user", "clients"), item("pipeline", "Pipeline", "pipeline")],
  },
  {
    title: "Delivery",
    items: [item("calendar", "Calendar", "calendar"), item("progress", "Build Progress", "rocket"), item("media", "Client Media", "folder")],
  },
  { title: "Revenue", items: [item("payments", "Invoices", "invoice"), item("affiliates", "Affiliates", "gift")] },
  {
    title: "Marketing",
    items: [
      item("email", "Email", "mail"),
      item("forms", "Forms", "form"),
      item("surveys", "Surveys", "survey"),
      item("automation", "Automation", "bolt"),
    ],
  },
];

const NavIcon = ({ icon }: { icon: IconName }) => <Icon name={icon} size={17} strokeWidth={1.8} className="nav-item__icon" />;

export function AdminSidebar() {
  const { state, goTo, openContacts } = useAdmin();
  const { tab, contactView } = state;
  const me = useMe().data;
  const name = me?.fullName || me?.email || "";
  // Settings › Team › Menus: only the menus this teammate may use are shown.
  const can = (t: AdminTab) => !HIDDEN_TABS.has(t) && canUseMenu(me, TAB_MENU[t]);
  const groups = MENU.map((g) => ({ ...g, items: g.items.filter((i) => can(i.tab)) })).filter((g) => g.items.length);

  const isActive = (i: MenuItem) =>
    i.key === "contacts" ? tab === "clients" && contactView === "all" : i.key === "clients" ? tab === "clients" && contactView !== "all" : tab === i.tab;
  const open = (i: MenuItem) =>
    i.key === "contacts" ? openContacts("all") : i.key === "clients" ? openContacts(isActive(i) ? contactView : "active") : goTo(i.tab);

  return (
    <Sidebar
      label="Main menu"
      className="sidebar--admin"
      brand={<Image src={logoWordmark} alt="GoCWGL" width={168} priority />}
      footer={
        <>
          {can("bugs") && (
            <SidebarGroup>
              <NavItem label="Report a bug" active={tab === "bugs"} onClick={() => goTo("bugs")} icon={<NavIcon icon="bug" />} />
            </SidebarGroup>
          )}
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
      {groups.map((g) => (
        <SidebarGroup key={g.title} title={g.title}>
          {g.items.map((i) => (
            <NavItem key={i.key} label={i.label} active={isActive(i)} onClick={() => open(i)} icon={<NavIcon icon={i.icon} />} />
          ))}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
