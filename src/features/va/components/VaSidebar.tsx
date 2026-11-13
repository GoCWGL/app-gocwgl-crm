"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { NavItem, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Avatar, Icon } from "@/components/ui";
import { VA_NAV } from "@/data/va";
import { useMe } from "@/utils/hooks/useUsers";
import { useInactiveAsks, useOpenJobs, useVaTasks } from "@/utils/hooks/useVaPortal";
import { useMenuCounts } from "@/utils/hooks/useMenuCounts";
import { useVaAccess } from "../lib/access";
import { useVa } from "../state/VaContext";

export function VaSidebar() {
  const { tab, goTo } = useVa();
  const router = useRouter();
  const me = useMe().data;
  const name = me?.fullName || me?.email || "";
  // How many jobs are open right now, so VAs notice new ones.
  const ready = useVaAccess().ready;
  const openJobs = useOpenJobs(ready).data?.length ?? 0;
  // Client tasks assigned to them and not started yet.
  const toStart = (useVaTasks(ready).data ?? []).filter((t) => t.status === "requested").length;
  // Clients GoCWGL wants to move to inactive, waiting for this VA's approval.
  const asks = (useInactiveAsks(ready).data ?? []).filter((a) => !a.approvedAt).length;
  // Support, Training, SOPs, Feedback and Invoices come from the server (see menus API).
  const server = useMenuCounts("va", tab, ready);
  const counts: Partial<Record<string, number>> = { ...server, jobs: openJobs, tasks: toStart, clients: asks };

  return (
    <Sidebar
      label="VA menu"
      className="sidebar--admin"
      brand={
        <div className="stack stack--2">
          <Image src={logoWordmark} alt="GoCWGL" width={168} priority />
          <span className="text-tiny">VA portal</span>
        </div>
      }
      footer={
        <>
          {me?.isStaff && (
            <SidebarGroup>
              <NavItem
                label="Back to admin"
                onClick={() => router.push("/admin?tab=settings&section=portals")}
                icon={<Icon name="arrowLeft" size={17} strokeWidth={1.8} className="nav-item__icon" />}
              />
            </SidebarGroup>
          )}
          <ProfileButton
            avatar={<Avatar name={name} brand ring />}
            name={name}
            subtitle="Profile & settings"
            active={tab === "account"}
            onClick={() => goTo("account")}
            trailing={<Icon name="settings" size={17} strokeWidth={1.9} className="profile-button__icon" />}
          />
        </>
      }
    >
      {VA_NAV.map((group) => (
        <SidebarGroup key={group.title} title={group.title}>
          {group.items.map((item) => (
            <NavItem
              key={item.tab}
              label={item.label}
              active={tab === item.tab}
              onClick={() => goTo(item.tab)}
              badge={counts[item.tab] ? { text: String(counts[item.tab]), tone: "brand" } : undefined}
              icon={<Icon name={item.icon} size={17} strokeWidth={1.8} className="nav-item__icon" />}
            />
          ))}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
