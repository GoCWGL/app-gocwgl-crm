"use client";

import { useEffect, type ComponentType } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Toast } from "@/components/ui";
import { PORTAL_PAGES, type PortalTab } from "@/data/portal";
import { RequireClient } from "@/utils/auth/guards";
import { useOverview, usePortalHealth } from "@/utils/hooks/usePortal";
import { EmbedCodeDialog } from "./components/EmbedCodeDialog";
import { FunnelRequestDrawer } from "./components/FunnelRequestDrawer";
import { PortalSidebar } from "./components/PortalSidebar";
import { TodoDrawer } from "./components/TodoDrawer";
import { getHealth } from "./lib/selectors";
import { AccountSection } from "./sections/AccountSection";
import { AssetsSection } from "./sections/AssetsSection";
import { BillingSection } from "./sections/BillingSection";
import { BuildSection } from "./sections/BuildSection";
import { FunnelsSection } from "./sections/FunnelsSection";
import { HealthSection } from "./sections/HealthSection";
import { OverviewSection } from "./sections/OverviewSection";
import { ReportsSection } from "./sections/ReportsSection";
import { SupportSection } from "./sections/SupportSection";
import { PortalProvider, usePortal } from "./state/PortalContext";

const SECTIONS: Record<PortalTab, ComponentType> = {
  overview: OverviewSection,
  funnels: FunnelsSection,
  reports: ReportsSection,
  health: HealthSection,
  build: BuildSection,
  assets: AssetsSection,
  support: SupportSection,
  billing: BillingSection,
  account: AccountSection,
};

/** Client portal: one page with a sidebar, switching sections in place. */
export function PortalApp() {
  return (
    <RequireClient>
      <PortalProvider>
        <PortalLayout />
      </PortalProvider>
    </RequireClient>
  );
}

function PortalLayout() {
  const { state, update, openSupport, readOnly } = usePortal();
  // The API decides whose portal this is (the client's own, or X-Client-Id in "View as client").
  const business = useOverview(30).data?.business || "Your business";
  const subtitle = readOnly ? "Client portal · view only" : "Client portal";

  // Start each section at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);

  const page = PORTAL_PAGES[state.tab];
  const Section = SECTIONS[state.tab];
  const health = getHealth(usePortalHealth().data);

  return (
    <AppShell
      sidebar={<PortalSidebar business={business} subtitle={subtitle} />}
      overlays={
        <>
          <TodoDrawer />
          <FunnelRequestDrawer />
          <EmbedCodeDialog />
        </>
      }
    >
      <PageHeader
        kicker={`MY SYSTEM // ${page.title.toUpperCase()}`}
        title={page.title}
        subtitle={page.subtitle}
        dotTone={health.ok ? "green" : "amber"}
        actions={
          !readOnly && (
            <Button variant="primary" size="lg" onClick={() => openSupport()}>
              + New request
            </Button>
          )
        }
      />
      <Toast message={state.toast} onClose={() => update({ toast: "" })} />
      <Section />
    </AppShell>
  );
}
