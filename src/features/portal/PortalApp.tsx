"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Toast } from "@/components/ui";
import { HIDDEN_PORTAL_TABS, PORTAL_GROUP_OF, PORTAL_PAGES, VA_ONLY_TABS, type PortalTab } from "@/data/portal";
import { useHasTraining, useHasVaWork } from "./lib/vaAccess";
import { RequireClient, SessionSplash } from "@/utils/auth/guards";
import { setViewAs, useSession } from "@/utils/auth/session";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useOverview } from "@/utils/hooks/usePortal";
import { useSectionChangeSweep } from "@/utils/navigation";
import { EmbedCodeDialog } from "./components/EmbedCodeDialog";
import { FunnelRequestDrawer } from "./components/FunnelRequestDrawer";
import { PortalSidebar } from "./components/PortalSidebar";
import { TodoDrawer } from "./components/TodoDrawer";
import { AccountSection } from "./sections/AccountSection";
import { AffiliateSection } from "./sections/AffiliateSection";
import { BuildSection } from "./sections/BuildSection";
import { CrmSection } from "./sections/CrmSection";
import { DashboardSection } from "./sections/DashboardSection";
import { FunnelsSection } from "./sections/FunnelsSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { ClientSopsSection, ClientTrainingSection } from "./sections/LearnSections";
import { LiveWorkSection } from "./sections/LiveWorkSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { RatingsSection } from "./sections/RatingsSection";
import { SupportSection } from "./sections/SupportSection";
import { TeamSection } from "./sections/TeamSection";
import { VaTeamSection } from "./sections/VaTeamSection";
import { WorkJournalSection } from "./sections/WorkJournalSection";
import { StaffClientBar } from "./components/StaffClientBar";
import { PortalProvider, usePortal } from "./state/PortalContext";

const SECTIONS: Record<PortalTab, ComponentType> = {
  dashboard: DashboardSection,
  funnels: FunnelsSection,
  crm: CrmSection,
  live: LiveWorkSection,
  journal: WorkJournalSection,
  team: TeamSection,
  vateam: VaTeamSection,
  projects: ProjectsSection,
  ratings: RatingsSection,
  build: BuildSection,
  support: SupportSection,
  billing: InvoicesSection,
  training: ClientTrainingSection,
  sops: ClientSopsSection,
  affiliate: AffiliateSection,
  account: AccountSection,
};

/** Client portal: one page with a sidebar, switching sections in place. */
export function PortalApp() {
  return (
    <RequireClient>
      <StaffClientGate>
        <PortalProvider>
          <PortalLayout />
        </PortalProvider>
      </StaffClientGate>
    </RequireClient>
  );
}

/**
 * Staff opening /portal from the admin menu: `?as=<id>` → that client's portal; no client yet → the most recent
 * paid client (or any client), so the portal opens straight away.
 * (Inside the "View as client" iframe the client is already set, so this passes straight through.)
 */
function StaffClientGate({ children }: { children: ReactNode }) {
  const { user, embedded, viewAsClientId } = useSession();
  const as = useSearchParams()?.get("as") ?? "";
  const queryClient = useQueryClient();
  const staffHere = !!user?.isStaff && !embedded;

  useEffect(() => {
    if (!staffHere || as === (viewAsClientId ?? "")) return;
    // Portal data isn't keyed by client: drop it so one client's data never shows in another's portal.
    queryClient.removeQueries();
    setViewAs(as || null, false);
  }, [staffHere, as, viewAsClientId, queryClient]);

  // Leaving the portal (back to the admin) ends "View as client".
  useEffect(() => {
    if (!staffHere) return;
    return () => {
      setViewAs(null, false);
      queryClient.removeQueries();
    };
  }, [staffHere, queryClient]);

  if (!staffHere) return <>{children}</>;
  if (!as) return <OpenFirstClient />;
  if (as !== viewAsClientId) return <SessionSplash text="Opening the client's portal…" />;
  return <>{children}</>;
}

/** Staff with no client chosen: open a paid client's portal (any client if none are paid). */
function OpenFirstClient() {
  const router = useRouter();
  const paid = useContactsPage({ stage: "paid", limit: 1 });
  const any = useContactsPage({ limit: 1 });
  const first = paid.data?.items[0] ?? (paid.isSuccess ? any.data?.items[0] : undefined);
  const none = paid.isSuccess && any.isSuccess && !first;

  useEffect(() => {
    if (first) router.replace(`/portal?as=${encodeURIComponent(first.id)}`);
  }, [first, router]);

  if (paid.isError || any.isError || none) {
    return (
      <div className="session-splash">
        <div className="empty-state stack stack--10">
          <span>{none ? "No clients yet. Add one in the admin to see their portal." : "Couldn't load your clients."}</span>
          <span>
            <Button variant="outline" onClick={() => router.push("/admin?tab=settings&section=portals")}>
              Back to admin
            </Button>
          </span>
        </div>
      </div>
    );
  }
  return <SessionSplash text="Opening the client portal…" />;
}

function PortalLayout() {
  const { state, update, openSupport, readOnly } = usePortal();
  // The API decides whose portal this is (the client's own, or X-Client-Id in "View as client").
  const business = useOverview(30).data?.business || "Your business";
  const { user, viewAsClientId } = useSession();
  const subtitle = readOnly ? "Client portal · view only" : viewAsClientId && user?.isStaff ? "Client portal · acting as client" : "Client portal";

  // Pages of "My VA team" and "Learn & support" open once the client has an active VA; until then, the dashboard.
  const vaWork = useHasVaWork();
  // Training opens once GoCWGL assigns the client a training.
  const training = useHasTraining();
  const locked =
    HIDDEN_PORTAL_TABS.has(state.tab) ||
    (vaWork.known && !vaWork.has && VA_ONLY_TABS.has(state.tab)) ||
    (state.tab === "training" && training.known && !training.has);
  useEffect(() => {
    if (locked) update({ tab: "dashboard" });
  }, [locked, update]);

  // Start each section at the top of the page, with the top progress sweep.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);
  useSectionChangeSweep(state.tab);

  const tab = locked ? "dashboard" : state.tab;
  const page = PORTAL_PAGES[tab];
  const Section = SECTIONS[tab];

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
      <StaffClientBar />
      <PageHeader
        kicker={`${(PORTAL_GROUP_OF[tab] ?? "My account").toUpperCase()} // ${page.title.toUpperCase()}`}
        title={page.title}
        subtitle={page.subtitle}
        actions={
          // Only on Support, where requests live.
          !readOnly &&
          tab === "support" && (
            <Button variant="primary" size="lg" onClick={() => openSupport()}>
              + New request
            </Button>
          )
        }
      />
      <Toast message={state.toast} onClose={() => update({ toast: "" })} />
      <div className="page-enter" key={tab}>
        <Section />
      </div>
    </AppShell>
  );
}
