"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logoMark from "@/assets/images/logo-mark.png";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup, useNavPanel } from "@/components/layout";
import { Icon, type IconName } from "@/components/ui";
import { MyAvatar } from "@/features/account/ProfilePhoto";
import {
  HIDDEN_PORTAL_TABS,
  PORTAL_MENU,
  isPortalFlyout,
  type PortalFlyout,
  type PortalMenuEntry,
  type PortalMenuItem,
  type PortalTab,
} from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { usePortalBilling } from "@/utils/hooks/useBilling";
import { useMyAffiliate } from "@/utils/hooks/useAffiliates";
import { usePortalTodos } from "@/utils/hooks/usePortal";
import { useSession } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { useVaRequests } from "@/utils/hooks/useClientWork";
import { usePortal } from "../state/PortalContext";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";
import { useHasTraining, useHasVaWork, useShowPackages, useVaTools } from "../lib/vaAccess";
import { useCrmLaunched } from "../sections/CrmAfterLaunch";
import { useCrmTab } from "../sections/CrmSection";
import { useFunnelTab } from "../sections/FunnelsSection";

type PortalSidebarProps = {
  /** Business shown in the profile button at the bottom (from the API). */
  business: string;
  subtitle: string;
};

type Badge = { text: string; tone: Tone };

const flyoutItems = (f: PortalFlyout) => f.groups.flatMap((g) => g.items);

const NavIcon = ({ icon }: { icon: IconName }) => <Icon name={icon} size={17} strokeWidth={1.8} className="nav-item__icon" />;

/**
 * Client portal menu, laid out like the admin's: CRM, Funnel and VA each open their own sidebar beside the main
 * menu, which shrinks to its icons while it's open.
 */
export function PortalSidebar({ business, subtitle }: PortalSidebarProps) {
  const { state, update } = usePortal();
  const { tab } = state;
  const openTodos = (usePortalTodos().data ?? []).filter((t) => !t.done).length;
  const invoices = usePortalBilling().data?.invoices ?? [];
  const openInvoices = invoices.filter((i) => i.status === "Sent" || i.status === "Overdue").length;
  const me = useMe().data;
  const router = useRouter();
  const { embedded } = useSession();
  // Staff who came from the admin menu (not the "View as client" iframe, which has its own bar).
  const staffHere = !!me?.isStaff && !embedded;
  // Affiliate is for every client, unless the team removed them from the program.
  const affiliate = useMyAffiliate().data;
  const affiliateLocked = !!affiliate && !affiliate.unlocked;
  // In "View as client" the signed-in user is the staff member; show the business instead.
  const name = me?.isStaff ? business : me?.fullName || me?.email || "";

  // "My VA team" pages (VA Team, Tasks, VA tracker, Live work, ratings, Training, SOPs, Request support) appear once
  // the client has an active VA.
  const vaWork = useHasVaWork();
  // Training appears once GoCWGL assigns the client a training.
  const training = useHasTraining();
  // Request CRM shows unless the team turned it off for this client. The whole Funnel menu (Request Funnel, builds and
  // Build progress) is hidden until the team turns it on in the client's profile.
  const showCrmPackages = useShowPackages("crm");
  const showFunnelPackages = useShowPackages("funnels");
  // Request VA shows unless the team turned the VA packages off, or while they have requests to follow.
  const showVaPackages = useShowPackages("va");
  const vaRequests = useVaRequests().data ?? [];
  const hasVaRequests = vaRequests.some((r) => r.status !== "cancelled");
  // Projects shows with Request VA, or while the client has project requests to follow.
  const hasProjects = vaRequests.some((r) => r.engagement === "project");
  // Time & activity (VA tracker and Attendance) is hidden until a VA request turns on the time tracker or Attendance.
  const tools = useVaTools();
  // Revisions and New features (CRM menu) open once a CRM build is launched.
  const crmLaunched = useCrmLaunched();
  const shown = (i: PortalMenuItem, needsVa?: boolean) =>
    !HIDDEN_PORTAL_TABS.has(i.tab) &&
    // Projects sits under "Your team" but also shows before the first VA, so a client can follow a project request.
    (!(needsVa || i.needsVa) || vaWork.has || i.tab === "vaprojects") &&
    (i.tab !== "training" || training.has) &&
    (i.tab !== "funnels" || showFunnelPackages) &&
    ((i.view !== "revisions" && i.view !== "features") || crmLaunched) &&
    (i.view !== "packages" || i.tab !== "crm" || showCrmPackages) &&
    (i.tab !== "team" || showVaPackages || hasVaRequests) &&
    (i.tab !== "vaprojects" || showVaPackages || hasProjects) &&
    (i.tab !== "journal" || tools.timeTracker) &&
    (i.tab !== "attendance" || tools.attendance);
  const groups = PORTAL_MENU.map((g) => ({
    ...g,
    items: g.items
      .map((e): PortalMenuEntry | null => {
        if (!isPortalFlyout(e)) return shown(e) ? e : null;
        const fg = e.groups.map((x) => ({ ...x, items: x.items.filter((i) => shown(i, x.needsVa)) })).filter((x) => x.items.length);
        return fg.length ? { ...e, groups: fg } : null;
      })
      .filter((e): e is PortalMenuEntry => e !== null),
  })).filter((g) => g.items.length);
  const flyouts = groups.flatMap((g) => g.items.filter(isPortalFlyout));

  // VAs, Live work, VA tracker, Tasks, Training, SOPs and Request support come from the server (see menus API).
  const server = useMenuCounts("portal", tab);
  const badges: Partial<Record<string, Badge>> = {
    ...Object.fromEntries(Object.entries(server).filter(([, n]) => n > 0).map(([t, n]) => [t, { text: String(n), tone: (t === "live" ? "green" : "brand") as Tone }])),
    // Open to-dos on a build: they're on the CRM page's Build progress tab.
    ...(openTodos && { "crm-progress": { text: String(openTodos), tone: "brand" } }),
    ...(openInvoices && { billing: { text: String(openInvoices), tone: "red" } }),
  };
  const countOf = (e: PortalMenuEntry) =>
    isPortalFlyout(e) ? flyoutItems(e).reduce((n, i) => n + Number(badges[i.key]?.text ?? 0), 0) : Number(badges[e.key]?.text ?? 0);

  // The tab showing on pages that have tabs, so the right entry is marked.
  const crmTab = useCrmTab().tab;
  const funnelTab = useFunnelTab().tab;
  const viewOf: Partial<Record<PortalTab, string>> = { crm: crmTab, funnels: funnelTab };
  const isActive = (i: PortalMenuItem) => i.tab === tab && (!i.view || viewOf[tab] === i.view);
  const holds = (f: PortalFlyout, t: PortalTab) => flyoutItems(f).some((i) => i.tab === t);

  // Clicking CRM, Funnel or VA opens that menu's own sidebar next to the main one, and the main menu shrinks to
  // its icons. It stays while you move between its pages; hiding it (or going to a page outside it) brings the
  // full main menu back. "Expand" shows the full main menu beside it.
  const [panel, setPanel] = useState<{ tab: PortalTab; key: string | null }>({ tab, key: null });
  if (panel.tab !== tab) {
    const f = flyouts.find((x) => x.key === panel.key);
    setPanel({ tab, key: f && holds(f, tab) ? f.key : null });
  }
  const openFlyout = flyouts.find((f) => f.key === panel.key);
  // What the second sidebar shows: the open menu, or the one that's still sliding shut.
  const navPanel = useNavPanel(openFlyout?.key ?? "");
  const shownFlyout = flyouts.find((f) => f.key === navPanel.shown);
  const [expanded, setExpanded] = useState(false);
  const compact = !!openFlyout && !expanded;
  // Growing back from icons while the second sidebar slides shut: its text is revealed as it widens.
  const expanding = navPanel.closing && !openFlyout && !expanded;
  const togglePanel = (key: string) => {
    setPanel({ tab, key: panel.key === key ? null : key });
    setExpanded(false);
  };
  const hidePanel = () => setPanel({ tab, key: null });

  const open = (i: PortalMenuItem) => {
    if (i.tab === "crm") update({ tab: "crm", crmView: i.view ?? "builds" });
    else if (i.tab === "funnels") update({ tab: "funnels", funnelView: i.view as "builds" | "packages" | "progress" });
    else update({ tab: i.tab });
  };

  // While a second sidebar is open, only its category is highlighted in the main menu (not also the page you're on).
  const navItem = (i: PortalMenuItem, tooltip?: string, inMainMenu = false) => (
    <NavItem
      key={i.key}
      label={i.label}
      tooltip={tooltip}
      active={isActive(i) && !(inMainMenu && openFlyout)}
      onClick={() => open(i)}
      badge={badges[i.key]}
      locked={i.tab === "affiliate" && affiliateLocked}
      lockedHint="Not available"
      className={i.highlight ? "nav-item--cta" : undefined}
      icon={<NavIcon icon={i.icon} />}
    />
  );

  return (
    <div className={cn("dual-nav", openFlyout && "dual-nav--open")}>
      <Sidebar
        label="Portal menu"
        className={cn("sidebar--admin sidebar--portal", compact && "sidebar--compact", expanding && "sidebar--expanding")}
        brand={
          <>
            <Image src={logoWordmark} alt="GoCWGL" width={168} priority className="sidebar__wordmark" />
            <Image src={logoMark} alt="GoCWGL" width={36} height={36} className="sidebar__mark" />
            {openFlyout && (
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
            {staffHere && (
              <SidebarGroup>
                <NavItem
                  label="Back to admin"
                  tooltip={compact ? "Back to admin" : undefined}
                  onClick={() => router.push("/admin?tab=settings&section=portals")}
                  icon={<NavIcon icon="arrowLeft" />}
                />
              </SidebarGroup>
            )}
            <ProfileButton
              avatar={<MyAvatar name={name} tone="purple" ring />}
              name={name}
              subtitle={name === business ? undefined : business}
              detail={subtitle}
              tooltip={compact ? `${business} · Account & settings` : "Account & settings"}
              active={tab === "account"}
              onClick={() => update({ tab: "account" })}
              trailing={<Icon name="settings" size={17} strokeWidth={1.9} className="profile-button__icon" />}
            />
            <div className="portal-powered">
              <span className="kicker kicker--sm kicker--muted">POWERED BY</span>
              <Image src={logoWordmark} alt="GoCWGL" width={92} />
            </div>
          </>
        }
      >
        {groups.map((g) => (
          <SidebarGroup key={g.title} title={g.title}>
            {g.items.map((e) => {
              const tooltip = compact ? e.label : undefined;
              if (!isPortalFlyout(e)) return navItem(e, tooltip, true);
              const count = countOf(e);
              const isOpen = panel.key === e.key;
              return (
                <NavItem
                  key={e.key}
                  label={e.label}
                  tooltip={tooltip}
                  onClick={() => togglePanel(e.key)}
                  expanded={isOpen}
                  highlighted={openFlyout ? isOpen : holds(e, tab)}
                  badge={count ? { text: String(count), tone: "brand" } : undefined}
                  icon={<NavIcon icon={e.icon} />}
                />
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      {shownFlyout && (
        // Switching to another menu slides this one shut, then opens the new one (useNavPanel).
        <nav
          key={shownFlyout.key}
          className={cn("nav-panel", navPanel.closing && "nav-panel--closing")}
          inert={navPanel.closing}
          id="portal-nav-panel"
          aria-label={`${shownFlyout.label} menu`}
          onKeyDown={(ev) => ev.key === "Escape" && hidePanel()}
        >
          <div className="nav-panel__inner">
            <div className="nav-panel__head">
              <Icon name={shownFlyout.icon} size={18} strokeWidth={1.9} className="nav-panel__icon" />
              <span className="nav-panel__heading">
                <span className="nav-panel__title">{shownFlyout.label}</span>
                <span className="nav-panel__desc">{shownFlyout.description}</span>
              </span>
              <button type="button" className="nav-panel__close" onClick={hidePanel} aria-label="Hide this menu" title="Hide this menu">
                <Icon name="close" size={15} strokeWidth={2.2} />
              </button>
            </div>
            <div className="nav-panel__nav">
              {shownFlyout.groups.map((fg, gi) => (
                // The VA headings slide in when they first appear (when the client gets an active VA).
                <SidebarGroup key={fg.title ?? gi} title={fg.title} className={fg.needsVa ? "sidebar__group--reveal" : undefined}>
                  {fg.items.map((i) => navItem(i))}
                </SidebarGroup>
              ))}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
