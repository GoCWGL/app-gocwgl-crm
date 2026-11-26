"use client";

import { useState } from "react";
import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import logoMark from "@/assets/images/logo-mark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup, useNavPanel } from "@/components/layout";
import { Icon, type IconName } from "@/components/ui";
import { MyAvatar } from "@/features/account/ProfilePhoto";
import { useSignOutConfirm } from "@/features/auth/components/SignOutConfirm";
import { cn } from "@/lib/utils";
import { ADMIN_ONLY_TABS, CRM_TABS, DASHBOARD_TABS, HIDDEN_TABS, SETTINGS_GROUPS, SETTINGS_TABS, SUPER_ADMIN_TABS, TAB_MENU, type AdminTab, type SettingsTab } from "@/data/admin";
import { canUseMenu, isStaffAdmin, isSuperAdmin } from "@/utils/auth/session";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";
import { useCrmRequests } from "@/utils/hooks/useDelivery";
import { useAdminFunnels } from "@/utils/hooks/usePortal";
import { openFunnelRequests } from "../sections/progress/FunnelRequestsPanel";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

/** One page entry; `tabs` lists every page it holds (it opens the first one the teammate may use). */
type MenuItem = { key: string; tab: AdminTab; label: string; icon: IconName; tabs?: AdminTab[] };

/** A menu entry that opens a second panel beside the sidebar, listing its pages (optionally under headings). */
type Flyout = {
  key: string;
  label: string;
  icon: IconName;
  /** One line under the panel title. */
  description?: string;
  groups: Array<{ title?: string; items: MenuItem[] }>;
};

type Entry = MenuItem | Flyout;

const isFlyout = (e: Entry): e is Flyout => "groups" in e;

const item = (tab: AdminTab, label: string, icon: IconName, key: string = tab): MenuItem => ({ key, tab, label, icon });

/** The admin menu, by what each part of the work is for. */
const MENU: Array<{ title: string; items: Entry[] }> = [
  {
    title: "Overview",
    items: [
      // Dashboard holds the Overview and Reports (tabs at the top of the page).
      { ...item("dashboard", "Dashboard", "grid"), tabs: DASHBOARD_TABS },
      // CRM Requests holds Build progress and Client media (tabs at the top of the page).
      { ...item("progress", "CRM Requests", "rocket", "crm"), tabs: CRM_TABS },
      item("funnels", "Funnel Requests", "funnel"),
      item("jobs", "Job Postings", "briefcase"),
    ],
  },
  {
    title: "People",
    items: [
      // Everyone who booked a call and isn't a client or a VA yet.
      item("leads", "Leads", "userPlus"),
      {
        key: "clients-menu",
        label: "Clients",
        icon: "user",
        description: "Your clients, who's online and what they learn",
        groups: [
          {
            title: "Clients",
            items: [
              item("clients", "Client directory", "users"),
              item("clientStatus", "Live status", "pulse"),
            ],
          },
          {
            title: "Enablement",
            items: [item("clientTraining", "Training", "graduation"), item("clientSops", "SOPs", "clipboard")],
          },
          {
            title: "Client care",
            items: [item("feedback", "VA rating", "star"), item("clientFeedback", "Client feedback", "message")],
          },
        ],
      },
      {
        key: "vas-menu",
        label: "VAs",
        icon: "briefcase",
        description: "Manage your virtual assistant team",
        groups: [
          {
            title: "Team",
            items: [
              item("vas", "VA directory", "users"),
              item("status", "Live status", "pulse"),
            ],
          },
          {
            title: "Enablement",
            items: [item("training", "Training", "graduation"), item("sops", "SOPs", "clipboard")],
          },
          {
            title: "Support",
            items: [item("support", "Support desk", "lifebuoy")],
          },
          {
            title: "Engagement",
            items: [item("surveys", "Surveys", "survey")],
          },
        ],
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        key: "finance",
        label: "Income & Billing",
        icon: "card",
        description: "Income, expenses and referral partners",
        groups: [
          { title: "Snapshot", items: [item("billingOverview", "Overview", "gauge")] },
          {
            title: "Revenue",
            items: [item("payments", "Billing & invoices", "invoice"), item("products", "Products", "tag")],
          },
          { title: "Spending", items: [item("expenses", "Expenses", "receipt")] },
          {
            title: "Referrals",
            items: [item("affiliates", "Affiliate partners", "gift"), item("bonuses", "Referral payouts", "dollar")],
          },
        ],
      },
      // Super admins only.
      {
        key: "shareholders-menu",
        label: "Shareholders",
        icon: "trendUp",
        description: "Investors, equity and reporting",
        groups: [
          { title: "Snapshot", items: [item("investorOverview", "Overview", "gauge")] },
          {
            title: "Ownership",
            items: [item("shareholders", "Shareholders", "users"), item("capTable", "Cap Table & Equity", "chart")],
          },
          { title: "Payouts", items: [item("distributions", "Declare Distribution", "receipt")] },
          {
            title: "Reporting",
            items: [item("investorUpdates", "Investor Updates & KPIs", "send")],
          },
          { title: "Compliance", items: [item("dataRoom", "Data Room & Governance", "folder")] },
        ],
      },
      {
        key: "marketing",
        label: "Marketing",
        icon: "mail",
        groups: [
          {
            items: [
              item("email", "Email", "mail"),
              item("forms", "Forms", "form"),
              item("automation", "Automation", "bolt"),
            ],
          },
        ],
      },
    ],
  },
];

/** The profile button at the bottom opens Settings' own second sidebar. */
const SETTINGS_PANEL = { key: "settings", label: "Settings", icon: "settings" as IconName, description: "Your profile, business and preferences" };

const pagesOf = (i: MenuItem) => i.tabs ?? [i.tab];
const flyoutItems = (f: Flyout) => f.groups.flatMap((g) => g.items);

const NavIcon = ({ icon }: { icon: IconName }) => <Icon name={icon} size={17} strokeWidth={1.8} className="nav-item__icon" />;

export function AdminSidebar() {
  const { state, goTo, update, openContacts } = useAdmin();
  const { tab, contactView, settingsTab } = state;
  const signOut = useSignOutConfirm();
  const me = useMe().data;
  const name = me?.fullName || me?.email || "";
  // Settings › Team › Menus: only the menus this teammate may use are shown.
  const can = (t: AdminTab) => !HIDDEN_TABS.has(t) && canUseMenu(me, TAB_MENU[t]) && (!SUPER_ADMIN_TABS.has(t) || isSuperAdmin(me)) && (!ADMIN_ONLY_TABS.has(t) || isStaffAdmin(me));
  const allowItems = (items: MenuItem[]) =>
    items
      .map((i) => (i.tabs ? { ...i, tab: i.tabs.find(can) ?? i.tab } : i))
      .filter((i) => (i.tabs ? i.tabs.some(can) : can(i.tab)));
  const groups = MENU.map((g) => ({
    ...g,
    items: g.items
      .map((e): Entry | null => {
        if (!isFlyout(e)) return allowItems([e])[0] ?? null;
        const fg = e.groups.map((x) => ({ ...x, items: allowItems(x.items) })).filter((x) => x.items.length);
        return fg.length ? { ...e, groups: fg } : null;
      })
      .filter((e): e is Entry => e !== null),
  })).filter((g) => g.items.length);
  const flyouts = groups.flatMap((g) => g.items.filter(isFlyout));

  // Leads (new bookers since you last opened Leads), Support, Job Postings, Clients, VAs, Status, Feedback, Survey, Forms and Billing come from the server (see menus API).
  const server = useMenuCounts("admin", tab);
  // New CRM requests (CRM Requests) and funnel requests with no build yet (Funnel Requests).
  const newCrm = (useCrmRequests().data ?? []).filter((r) => r.status === "new").length;
  const newFunnels = openFunnelRequests(useAdminFunnels(undefined, can("funnels")).data ?? []).filter((f) => !f.projectId).length;
  const counts: Partial<Record<string, number>> = { ...server, crm: newCrm, funnels: newFunnels };
  const countOf = (e: Entry) => (isFlyout(e) ? flyoutItems(e).reduce((n, i) => n + (counts[i.key] ?? 0), 0) : counts[e.key] ?? 0);

  const isActive = (i: MenuItem) => pagesOf(i).includes(tab);
  const holds = (f: Flyout, t: AdminTab) => flyoutItems(f).some((i) => pagesOf(i).includes(t));

  // Tags belong to the Contacts menu and Calendar to its own: hidden for teammates without them.
  const canSettings = (t: SettingsTab) =>
    (t !== "tags" || canUseMenu(me, "contacts")) && (t !== "calendar" || canUseMenu(me, "calendar"));
  const settingsGroups = SETTINGS_GROUPS.map((g) => ({
    title: g.title,
    items: g.tabs.filter(canSettings).map((id) => SETTINGS_TABS.find((t) => t.id === id)!),
  })).filter((g) => g.items.length);

  // Clicking Clients, VAs, Income & Billing, Shareholders, Marketing or your profile opens that menu's own sidebar next to the main one, and the main
  // menu shrinks to its icons. It stays while you move between its pages; hiding it (or going to a page
  // outside it) brings the full main menu back. "Expand" shows the full main menu beside it.
  // Going to Settings any other way (a link, a notification) opens its sidebar too: its pages are only listed there.
  const [panel, setPanel] = useState<{ tab: AdminTab; key: string | null }>({ tab, key: tab === "settings" ? SETTINGS_PANEL.key : null });
  if (panel.tab !== tab) {
    const f = flyouts.find((x) => x.key === panel.key);
    setPanel({ tab, key: tab === "settings" ? SETTINGS_PANEL.key : f && holds(f, tab) ? f.key : null });
  }
  const openFlyout = flyouts.find((f) => f.key === panel.key);
  const settingsOpen = panel.key === SETTINGS_PANEL.key;
  const openPanel = settingsOpen ? SETTINGS_PANEL : openFlyout;
  // What the second sidebar shows: the open menu, or the one that's still sliding shut.
  const navPanel = useNavPanel(openPanel?.key ?? "");
  const shownFlyout = flyouts.find((f) => f.key === navPanel.shown);
  const shownSettings = navPanel.shown === SETTINGS_PANEL.key;
  const shownPanel = shownSettings ? SETTINGS_PANEL : shownFlyout;
  const [expanded, setExpanded] = useState(false);
  const compact = !!openPanel && !expanded;
  // Growing back from icons while the second sidebar slides shut: its text is revealed as it widens.
  const expanding = navPanel.closing && !openPanel && !expanded;
  const togglePanel = (key: string) => {
    setPanel({ tab, key: panel.key === key ? null : key });
    setExpanded(false);
  };
  const hidePanel = () => setPanel({ tab, key: null });

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

  // While a second sidebar is open, only its menu is highlighted in the main menu (not also the page you're on).
  return (
    <div className={cn("dual-nav", openPanel && "dual-nav--open")}>
      <Sidebar
        label="Main menu"
        className={cn("sidebar--admin", compact && "sidebar--compact", expanding && "sidebar--expanding")}
        brand={
          <>
            <Image src={logoWordmark} alt="GoCWGL" width={168} priority className="sidebar__wordmark" />
            <Image src={logoMark} alt="GoCWGL" width={36} height={36} className="sidebar__mark" />
            {openPanel && (
              <button
                type="button"
                className="sidebar__toggle"
                onClick={() => setExpanded(!expanded)}
                aria-label={compact ? "Show the full main menu" : "Shrink the main menu to icons"}
                title={compact ? "Show the full main menu" : "Shrink to icons"}
              >
                <Icon name={compact ? "chevronRight" : "chevronLeft"} size={15} strokeWidth={2.2} />
              </button>
            )}
          </>
        }
        footer={
          <>
            {can("bugs") && (
              <SidebarGroup>
                <NavItem
                  label="Report a bug"
                  tooltip={compact ? "Report a bug" : undefined}
                  active={tab === "bugs" && !openPanel}
                  onClick={() => goTo("bugs")}
                  icon={<NavIcon icon="bug" />}
                />
              </SidebarGroup>
            )}
            <ProfileButton
              avatar={<MyAvatar name={name} brand ring />}
              name={name}
              subtitle="Profile & settings"
              active={tab === "settings" && (!openPanel || settingsOpen)}
              onClick={() => togglePanel(SETTINGS_PANEL.key)}
              expanded={settingsOpen}
              highlighted={settingsOpen}
              trailing={<Icon name="settings" size={17} strokeWidth={1.9} className="profile-button__icon" />}
            />
          </>
        }
      >
        {groups.map((g) => (
          <SidebarGroup key={g.title} title={g.title}>
            {g.items.map((e) => {
              const count = countOf(e);
              const badge = count ? { text: String(count), tone: "brand" as const } : undefined;
              const tooltip = compact ? e.label : undefined;
              if (!isFlyout(e))
                return (
                  <NavItem key={e.key} label={e.label} tooltip={tooltip} active={isActive(e) && !openPanel} onClick={() => open(e)} badge={badge} icon={<NavIcon icon={e.icon} />} />
                );
              const isOpen = panel.key === e.key;
              return (
                <NavItem
                  key={e.key}
                  label={e.label}
                  tooltip={tooltip}
                  onClick={() => togglePanel(e.key)}
                  expanded={isOpen}
                  highlighted={openPanel ? isOpen : holds(e, tab)}
                  badge={badge}
                  icon={<NavIcon icon={e.icon} />}
                />
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      {shownPanel && (
        // Switching to another menu slides this one shut, then opens the new one (useNavPanel).
        <nav
          key={shownPanel.key}
          className={cn("nav-panel", navPanel.closing && "nav-panel--closing")}
          inert={navPanel.closing}
          id="admin-nav-panel"
          aria-label={`${shownPanel.label} menu`}
          onKeyDown={(ev) => ev.key === "Escape" && hidePanel()}
        >
          <div className="nav-panel__inner">
            <div className="nav-panel__head">
              <Icon name={shownPanel.icon} size={18} strokeWidth={1.9} className="nav-panel__icon" />
              <span className="nav-panel__heading">
                <span className="nav-panel__title">{shownPanel.label}</span>
                {shownPanel.description && <span className="nav-panel__desc">{shownPanel.description}</span>}
              </span>
              <button type="button" className="nav-panel__close" onClick={hidePanel} aria-label="Hide this menu" title="Hide this menu">
                <Icon name="close" size={15} strokeWidth={2.2} />
              </button>
            </div>
            <div className="nav-panel__nav">
              {shownSettings && (
                <>
                  {settingsGroups.map((g) => (
                    <SidebarGroup key={g.title} title={g.title}>
                      {g.items.map((t) => (
                        <NavItem
                          key={t.id}
                          label={t.label}
                          active={tab === "settings" && settingsTab === t.id}
                          onClick={() => update({ tab: "settings", settingsTab: t.id })}
                          icon={<NavIcon icon={t.icon} />}
                        />
                      ))}
                    </SidebarGroup>
                  ))}
                  <SidebarGroup className="nav-panel__signout">
                    <NavItem
                      label={signOut.pending ? "Signing out…" : "Sign out"}
                      onClick={() => !signOut.pending && signOut.ask()}
                      icon={<NavIcon icon="arrowLeft" />}
                    />
                  </SidebarGroup>
                </>
              )}
              {shownFlyout?.groups.map((fg, gi) => (
                <SidebarGroup key={fg.title ?? gi} title={fg.title}>
                  {fg.items.map((i) => (
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
            </div>
          </div>
        </nav>
      )}
      {signOut.dialog}
    </div>
  );
}
