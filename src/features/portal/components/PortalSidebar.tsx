"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, Icon, IconTile } from "@/components/ui";
import { PORTAL_NAV, type PortalTab } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { initials } from "@/lib/utils";
import { usePortalBilling } from "@/utils/hooks/useBilling";
import { useMyAffiliate } from "@/utils/hooks/useAffiliates";
import { usePortalTodos } from "@/utils/hooks/usePortal";
import { useSession } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { usePortal } from "../state/PortalContext";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";

type PortalSidebarProps = {
  /** Business shown at the top (from the API). */
  business: string;
  subtitle: string;
};

export function PortalSidebar({ business, subtitle }: PortalSidebarProps) {
  const { state, goTo } = usePortal();
  const openTodos = (usePortalTodos().data ?? []).filter((t) => !t.done).length;
  const invoices = usePortalBilling().data?.invoices ?? [];
  const openInvoices = invoices.filter((i) => i.status === "Sent" || i.status === "Overdue").length;
  const me = useMe().data;
  const router = useRouter();
  const { embedded } = useSession();
  // Staff who came from the admin menu (not the "View as client" iframe, which has its own bar).
  const staffHere = !!me?.isStaff && !embedded;
  // Affiliate opens once the client is a paid subscriber (greyed out until then, and while loading).
  const affiliateLocked = !useMyAffiliate().data?.unlocked;
  // In "View as client" the signed-in user is the staff member; show the business instead.
  const name = me?.isStaff ? business : me?.fullName || me?.email || "";

  // VAs, Live work, VA tracker, Tasks, Training, SOPs and Request support come from the server (see menus API).
  const server = useMenuCounts("portal", state.tab);
  const badges: Partial<Record<PortalTab, { text: string; tone: Tone }>> = {
    ...Object.fromEntries(Object.entries(server).filter(([, n]) => n > 0).map(([t, n]) => [t, { text: String(n), tone: (t === "live" ? "green" : "brand") as Tone }])),
    // Open to-dos on a build: Build progress is a tab on the CRM page.
    ...(openTodos && { crm: { text: String(openTodos), tone: "brand" } }),
    ...(openInvoices && { billing: { text: String(openInvoices), tone: "red" } }),
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
          {staffHere && (
            <SidebarGroup>
              <NavItem
                label="Back to admin"
                onClick={() => router.push("/admin?tab=settings&section=portals")}
                icon={<Icon name="arrowLeft" size={17} strokeWidth={1.8} className="nav-item__icon" />}
              />
            </SidebarGroup>
          )}
          <ProfileButton
            avatar={<Avatar name={name} tone="purple" ring />}
            name={name}
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
              locked={item.tab === "affiliate" && affiliateLocked}
              lockedHint="For paid subscribers"
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
