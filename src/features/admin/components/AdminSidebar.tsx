"use client";

import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, Icon, type IconName } from "@/components/ui";
import { CRM_TABS, DASHBOARD_TABS, HIDDEN_TABS, TAB_MENU, type AdminTab } from "@/data/admin";
import { canUseMenu } from "@/utils/auth/session";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";
import { useCrmRequests } from "@/utils/hooks/useDelivery";
import { useAdminFunnels } from "@/utils/hooks/usePortal";
import { openFunnelRequests } from "../sections/progress/FunnelRequestsPanel";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

/** One menu entry; `tabs` lists every page it holds (it opens the first one the teammate may use). */
type MenuItem = { key: string; tab: AdminTab; label: string; icon: IconName; tabs?: AdminTab[] };

const item = (tab: AdminTab, label: string, icon: IconName, key: string = tab): MenuItem => ({ key, tab, label, icon });

/** The admin menu, by what each part of the work is for. */
const MENU: Array<{ title: string; items: MenuItem[] }> = [
  // Dashboard holds the Overview and Reports (tabs at the top of the page).
  {
    title: "Overview",
    items: [
      { ...item("dashboard", "Dashboard", "grid"), tabs: DASHBOARD_TABS },
      // CRM Requests holds Build progress and Client media (tabs at the top of the page).
      { ...item("progress", "CRM Requests", "rocket", "crm"), tabs: CRM_TABS },
      item("funnels", "Funnel Requests", "funnel"),
      item("jobs", "Job Postings", "briefcase"),
    ],
  },
  {
    title: "People",
    items: [item("clients", "Clients", "user"), item("vas", "VAs", "briefcase")],
  },
  {
    title: "Engagement",
    items: [
      item("sops", "SOPs", "clipboard"),
      item("status", "Status", "pulse"),
      item("training", "Training", "graduation"),
      item("support", "Support", "lifebuoy"),
      item("feedback", "Feedback", "star"),
      item("surveys", "Survey", "survey"),
      item("pipeline", "Pipeline", "pipeline"),
    ],
  },
  {
    title: "Finance",
    items: [
      item("payments", "Billing", "card"),
      item("bonuses", "Referral bonus", "dollar"),
      item("affiliates", "Affiliates", "gift"),
    ],
  },
  {
    title: "Marketing",
    items: [
      item("email", "Email", "mail"),
      item("forms", "Forms", "form"),
      item("automation", "Automation", "bolt"),
    ],
  },
];

const NavIcon = ({ icon }: { icon: IconName }) => <Icon name={icon} size={17} strokeWidth={1.8} className="nav-item__icon" />;

export function AdminSidebar() {
  const { state, goTo, update, openContacts } = useAdmin();
  const { tab, contactView } = state;
  const me = useMe().data;
  const name = me?.fullName || me?.email || "";
  // Settings › Team › Menus: only the menus this teammate may use are shown.
  const can = (t: AdminTab) => !HIDDEN_TABS.has(t) && canUseMenu(me, TAB_MENU[t]);
  const groups = MENU.map((g) => ({
    ...g,
    items: g.items
      .map((i) => (i.tabs ? { ...i, tab: i.tabs.find(can) ?? i.tab } : i))
      .filter((i) => (i.tabs ? i.tabs.some(can) : can(i.tab))),
  })).filter((g) => g.items.length);


  // Support, Job Postings, Clients, VAs, Status, Feedback, Survey, Forms and Billing come from the server (see menus API).
  const server = useMenuCounts("admin", tab);
  // New CRM requests (CRM Requests) and funnel requests with no build yet (Funnel Requests).
  const newCrm = (useCrmRequests().data ?? []).filter((r) => r.status === "new").length;
  const newFunnels = openFunnelRequests(useAdminFunnels(undefined, can("funnels")).data ?? []).filter((f) => !f.projectId).length;
  const counts: Partial<Record<string, number>> = { ...server, crm: newCrm, funnels: newFunnels };

  const isActive = (i: MenuItem) => (i.tabs ? i.tabs.includes(tab) : tab === i.tab);
  // Clients opens on Active, or stays on the tab you're already viewing.
  const open = (i: MenuItem) => {
    if (i.tab === "clients") openContacts(isActive(i) && contactView !== "all" ? contactView : "active");
    // VAs always opens on the list (not a VA's full profile left open earlier).
    else if (i.tab === "vas") update({ tab: "vas", vaFullId: "" });
    // Job Postings always opens on the board (not a request left open earlier).
    else if (i.tab === "jobs") update({ tab: "jobs", jobRequestId: "" });
    // Grouped menus (Dashboard, CRM Requests) stay on the tab you're on, else open the first one you may use.
    else if (i.tabs && i.tabs.includes(tab)) return;
    else goTo(i.tab);
  };

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
            <NavItem
              key={i.key}
              label={i.label}
              active={isActive(i)}
              onClick={() => open(i)}
              badge={counts[i.key] ? { text: String(counts[i.key]), tone: "brand" } : undefined}
              icon={<NavIcon icon={i.icon} />}
            />
          ))}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
