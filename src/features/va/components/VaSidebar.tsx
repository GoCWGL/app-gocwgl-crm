"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import logoMark from "@/assets/images/logo-mark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup, useNavPanel } from "@/components/layout";
import { Avatar, Icon } from "@/components/ui";
import { MyAvatar } from "@/features/account/ProfilePhoto";
import { VA_CLIENT_NAV, VA_CLIENT_TABS, VA_NAV, type VaTab } from "@/data/va";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { useMe } from "@/utils/hooks/useUsers";
import { useMyAttendance } from "@/utils/hooks/useAttendance";
import { useMyClients } from "@/utils/hooks/useShifts";
import { useInactiveAsks, useMyAgreement, useOpenJobs, useVaTasks } from "@/utils/hooks/useVaPortal";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";
import { useInvoicesOverview } from "@/utils/hooks/useVaInvoices";
import { useVaAccess } from "../lib/access";
import { clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";
import { useAttendanceRange } from "./AttendanceDays";

const NavIcon = ({ icon }: { icon: Parameters<typeof Icon>[0]["name"] }) => (
  <Icon name={icon} size={17} strokeWidth={1.8} className="nav-item__icon" />
);

/**
 * VA portal menu, laid out like the admin's and the client portal's. "Active clients" lists each client the VA
 * works with now; clicking one opens that client's own sidebar (Client details, Daily work, Resources, Billing)
 * beside the main menu, which shrinks to its icons while it's open.
 */
export function VaSidebar() {
  const { tab, client, goTo } = useVa();
  const router = useRouter();
  const me = useMe().data;
  const name = me?.fullName || me?.email || "";
  const ready = useVaAccess().ready;
  const clients = (useMyClients(ready).data?.clients ?? []).filter((c) => c.active);
  // Clients they're clocked in for (Attendance) get a ticking clock, so with several clients they can see who they
  // still need to clock out from. Same request as the Attendance page (this week), so clocking in or out updates it.
  const week = useAttendanceRange();
  const attendance = useMyAttendance(week.start, week.end, ready).data?.clients ?? [];
  const clockedIn = new Set(attendance.filter((a) => a.today.clockedIn).map((a) => a.client.id));
  // How many jobs are open right now, so VAs notice new ones.
  const openJobs = useOpenJobs(ready).data?.length ?? 0;
  // Client tasks assigned to them and not started yet, per client.
  const toStart = new Map<string, number>();
  for (const t of useVaTasks(ready).data ?? []) if (t.status === "requested") toStart.set(t.contactId, (toStart.get(t.contactId) ?? 0) + 1);
  // Invoices sent and not marked paid yet, per client: on the client's Invoices item (and added to the client's count).
  const unpaid = new Map<string, number>();
  for (const i of useInvoicesOverview(ready).data?.invoices ?? [])
    if (i.status === "sent" && i.client) unpaid.set(i.client.id, (unpaid.get(i.client.id) ?? 0) + 1);
  const clientTodo = (id: string) => (toStart.get(id) ?? 0) + (unpaid.get(id) ?? 0);
  // Clients GoCWGL wants to move to inactive, waiting for this VA's approval.
  const asks = (useInactiveAsks(ready).data ?? []).filter((a) => !a.approvedAt).length;
  // Support, Training, SOPs, Feedback and Invoices come from the server (see menus API).
  const server = useMenuCounts("va", tab, ready);
  // 1 while the agreement (or a new client match) is waiting to be signed.
  const toSign = useMyAgreement(ready).data?.pending ? 1 : 0;
  const counts: Partial<Record<string, number>> = { ...server, jobs: openJobs, clients: asks, agreement: toSign };
  const badge = (n?: number) => (n ? { text: String(n), tone: "brand" as const } : undefined);

  // The client sidebar follows the page: on a client's page it shows that client; going to another page from the
  // main menu closes it. Clicking a client opens their Client details page (and their sidebar); clicking the open
  // client again hides the sidebar.
  const onClientPage = VA_CLIENT_TABS.has(tab);
  const [panel, setPanel] = useState({ tab, client, open: onClientPage ? client : "" });
  if (panel.tab !== tab || panel.client !== client) setPanel({ tab, client, open: onClientPage ? client : "" });
  const openClient = clients.find((c) => c.id === panel.open);
  // Whose sidebar shows: the open client's, or the one that's still sliding shut.
  const navPanel = useNavPanel(openClient?.id ?? "");
  const shownClient = clients.find((c) => c.id === navPanel.shown);
  const [expanded, setExpanded] = useState(false);
  const compact = !!openClient && !expanded;
  // Growing back from icons while the second sidebar slides shut: its text is revealed as it widens.
  const expanding = navPanel.closing && !openClient && !expanded;
  const pickClient = (id: string) => {
    setExpanded(false);
    if (panel.open === id) return setPanel({ ...panel, open: "" });
    // Open it here too: when you're already on this client's details (sidebar hidden), going there changes nothing.
    setPanel({ ...panel, open: id });
    goTo("client", id);
  };
  const hidePanel = () => setPanel({ ...panel, open: "" });

  return (
    <div className={cn("dual-nav", openClient && "dual-nav--open")}>
      <Sidebar
        label="VA menu"
        className={cn("sidebar--admin", compact && "sidebar--compact", expanding && "sidebar--expanding")}
        brand={
          <>
            <div className="stack stack--2 sidebar__wordmark">
              <Image src={logoWordmark} alt="GoCWGL" width={168} priority />
              <span className="text-tiny">VA portal</span>
            </div>
            <Image src={logoMark} alt="GoCWGL" width={36} height={36} className="sidebar__mark" />
            {openClient && (
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
            {me?.isStaff && (
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
              avatar={<MyAvatar name={name} brand ring />}
              name={name}
              subtitle="Profile & settings"
              active={tab === "account"}
              onClick={() => goTo("account")}
              trailing={<Icon name="settings" size={17} strokeWidth={1.9} className="profile-button__icon" />}
            />
          </>
        }
      >
        {VA_NAV.map((group, gi) => (
          <Fragment key={group.title}>
            <SidebarGroup title={group.title}>
              {group.items.map((item) => (
                <NavItem
                  key={item.tab}
                  label={item.label}
                  tooltip={compact ? item.label : undefined}
                  // While a client's sidebar is open, only that client is highlighted in the main menu.
                  active={tab === item.tab && !openClient}
                  onClick={() => goTo(item.tab)}
                  badge={badge(counts[item.tab])}
                  icon={<NavIcon icon={item.icon} />}
                />
              ))}
            </SidebarGroup>
            {gi === 0 && (
              <SidebarGroup title="Active clients">
                {clients.length ? (
                  clients.map((c) => {
                    const label = clientLabel(c);
                    const isOpen = panel.open === c.id;
                    const ticking = clockedIn.has(c.id);
                    return (
                      <NavItem
                        key={c.id}
                        label={label}
                        // Always: the name can be cut short, and it says when they're clocked in.
                        tooltip={ticking ? `${label} · clocked in` : label}
                        onClick={() => pickClient(c.id)}
                        expanded={isOpen}
                        highlighted={openClient ? isOpen : onClientPage && client === c.id}
                        badge={badge(clientTodo(c.id))}
                        icon={
                          <span className="nav-item__client">
                            <Avatar name={label} tone={avatarTone(c.id)} size="sm" className="nav-item__icon nav-item__avatar" />
                            {ticking && <ClockedIn corner />}
                          </span>
                        }
                        trailing={ticking && <ClockedIn />}
                      />
                    );
                  })
                ) : (
                  <span className="sidebar__note">No active clients yet</span>
                )}
              </SidebarGroup>
            )}
          </Fragment>
        ))}
      </Sidebar>

      {shownClient && (
        // Switching to another client slides this one shut, then opens the new one (useNavPanel).
        <nav key={shownClient.id} className={cn("nav-panel", navPanel.closing && "nav-panel--closing")} inert={navPanel.closing} id="va-nav-panel" aria-label={`${clientLabel(shownClient)} menu`} onKeyDown={(ev) => ev.key === "Escape" && hidePanel()}>
          <div className="nav-panel__inner">
            <div className="nav-panel__head">
              <Avatar name={clientLabel(shownClient)} tone={avatarTone(shownClient.id)} size="sm" className="nav-panel__icon" />
              <span className="nav-panel__heading">
                <span className="nav-panel__title">{clientLabel(shownClient)}</span>
                <span className="nav-panel__desc">
                  {shownClient.company && shownClient.name ? shownClient.name : "Your work for this client"}
                </span>
              </span>
              <button type="button" className="nav-panel__close" onClick={hidePanel} aria-label="Hide this menu" title="Hide this menu">
                <Icon name="close" size={15} strokeWidth={2.2} />
              </button>
            </div>
            <div className="nav-panel__nav">
              {clientNav(shownClient, clockedIn.has(shownClient.id)).map((group) => (
                <SidebarGroup key={group.title} title={group.title}>
                  {group.items.map((item) => (
                    <NavItem
                      key={item.tab}
                      label={item.label}
                      active={tab === item.tab && client === shownClient.id}
                      onClick={() => goTo(item.tab, shownClient.id)}
                      badge={
                        item.tab === "tasks" ? badge(toStart.get(shownClient.id)) : item.tab === "invoices" ? badge(unpaid.get(shownClient.id)) : undefined
                      }
                      icon={<NavIcon icon={item.icon} />}
                    />
                  ))}
                </SidebarGroup>
              ))}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

/**
 * This client's pages: Time tracker and Attendance only when the client turned them on in a VA request (off by
 * default). Attendance stays while they're clocked in for the client, so they can still clock out.
 */
function clientNav(c: { wantsTimeTracker?: boolean; wantsAttendance?: boolean }, clockedIn: boolean) {
  const hidden = new Set<VaTab>([...(c.wantsTimeTracker ? [] : ["time" as const]), ...(c.wantsAttendance || clockedIn ? [] : ["attendance" as const])]);
  return VA_CLIENT_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !hidden.has(i.tab)) })).filter((g) => g.items.length);
}

/** A clock with turning hands next to a client (on their avatar when the menu is icons only) while the VA is clocked in for them. Gone once they clock out. */
function ClockedIn({ corner = false }: { corner?: boolean }) {
  const size = corner ? 14 : 18;
  return (
    <span className={corner ? "nav-clock nav-clock--corner" : "nav-clock"} role="img" aria-label="Clocked in" title="Clocked in — remember to clock out">
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" className="nav-clock__face" />
        <line x1="8" y1="8" x2="8" y2="4.5" className="nav-clock__hand nav-clock__hand--hour" />
        <line x1="8" y1="8" x2="8" y2="3" className="nav-clock__hand nav-clock__hand--minute" />
      </svg>
    </span>
  );
}
