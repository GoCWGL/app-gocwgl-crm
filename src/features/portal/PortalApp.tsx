"use client";

import { useEffect, type ComponentType } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Toast } from "@/components/ui";
import { PORTAL_PAGES, type PortalTab } from "@/data/portal";
import { RequireClient } from "@/utils/auth/guards";
import { useOverview } from "@/utils/hooks/usePortal";
import { useSectionChangeSweep } from "@/utils/navigation";
import { EmbedCodeDialog } from "./components/EmbedCodeDialog";
import { FunnelRequestDrawer } from "./components/FunnelRequestDrawer";
import { PortalSidebar } from "./components/PortalSidebar";
import { TodoDrawer } from "./components/TodoDrawer";
import { AccountSection } from "./sections/AccountSection";
import { AssetsSection } from "./sections/AssetsSection";
import { BillingSection } from "./sections/BillingSection";
import { BuildSection } from "./sections/BuildSection";
import { CrmSection } from "./sections/CrmSection";
import { FunnelsSection } from "./sections/FunnelsSection";
import { SupportSection } from "./sections/SupportSection";
import { PortalProvider, usePortal } from "./state/PortalContext";

const SECTIONS: Record<PortalTab, ComponentType> = {
  funnels: FunnelsSection,
  crm: CrmSection,
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

  // Start each section at the top of the page, with the top progress sweep.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);
  useSectionChangeSweep(state.tab);

  const page = PORTAL_PAGES[state.tab];
  const Section = SECTIONS[state.tab];

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
        actions={
          !readOnly && (
            <Button variant="primary" size="lg" onClick={() => openSupport()}>
              + New request
            </Button>
          )
        }
      />
      <Toast message={state.toast} onClose={() => update({ toast: "" })} />
      <div className="page-enter" key={state.tab}>
        <Section />
      </div>
    </AppShell>
  );
}
