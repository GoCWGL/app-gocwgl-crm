"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Toast } from "@/components/ui";
import { HIDDEN_PORTAL_TABS, PORTAL_GROUP_OF, PORTAL_PAGES, VA_ONLY_TABS, type PortalTab } from "@/data/portal";
import { useFunnelMenu, useHasTraining, useHasVaWork, useVaTools } from "./lib/vaAccess";
import { RequireClient, SessionSplash } from "@/utils/auth/guards";
import { setViewAs, useSession } from "@/utils/auth/session";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useOverview } from "@/utils/hooks/usePortal";
import { usePresenceHeartbeat } from "@/utils/hooks/useUsers";
import { useSectionChangeSweep } from "@/utils/navigation";
import { EmbedCodeDialog } from "./components/EmbedCodeDialog";
import { FunnelRequestDrawer } from "./components/FunnelRequestDrawer";
import { PortalSidebar } from "./components/PortalSidebar";
import { TodoDrawer } from "./components/TodoDrawer";
import { AccountSection } from "./sections/AccountSection";
import { AgreementSection } from "./sections/AgreementSection";
import { AffiliateSection } from "./sections/AffiliateSection";
import { AttendanceSection } from "./sections/AttendanceSection";
import { VaAssetsSection } from "./sections/VaAssetsSection";
import { BuildSection } from "./sections/BuildSection";
import { CrmSection } from "./sections/CrmSection";
import { DashboardSection } from "./sections/DashboardSection";
import { FunnelsSection } from "./sections/FunnelsSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { ClientSopsSection, ClientTrainingSection } from "./sections/LearnSections";
import { RatingsSection } from "./sections/RatingsSection";
import { SupportSection } from "./sections/SupportSection";
import { TeamSection } from "./sections/TeamSection";
import { VaTeamSection } from "./sections/VaTeamSection";
import { WorkJournalSection } from "./sections/WorkJournalSection";
import { useWorkTabs, WorkSection } from "./sections/WorkSection";
import { PageGuide } from "./components/PageGuide";
import { BetaTesterBanner } from "./components/BetaTesterBanner";
import { StaffClientBar } from "./components/StaffClientBar";
import { PortalProvider, usePortal } from "./state/PortalContext";

const SECTIONS: Record<PortalTab, ComponentType> = {
  dashboard: DashboardSection,
  funnels: FunnelsSection,
  crm: CrmSection,
  attendance: AttendanceSection,
  assets: VaAssetsSection,
  journal: WorkJournalSection,
  team: TeamSection,
  agreement: AgreementSection,
  vateam: VaTeamSection,
  projects: WorkSection,
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
            <Button variant="outline" onClick={() => router.push("/admin")}>
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
  const { state, update, readOnly } = usePortal();
  // The API decides whose portal this is (the client's own, or X-Client-Id in "View as client").
  const business = useOverview(30).data?.business || "Your business";
  const { user, viewAsClientId } = useSession();
  const subtitle = readOnly ? "Client portal · view only" : viewAsClientId && user?.isStaff ? "Client portal · acting as client" : "Client portal";
  // Online status for the team (not for staff using "View as client").
  usePresenceHeartbeat(!!user && !user.isStaff);

  // Pages of "My VA team" and "Learn & support" open once the client has an active VA; until then, the dashboard.
  const vaWork = useHasVaWork();
  // Training opens once GoCWGL assigns the client a training.
  const training = useHasTraining();
  // Funnels opens once the team turns on the Funnel menu for this client.
  const funnelMenu = useFunnelMenu();
  // Tasks & projects shows while the client has either tab (Projects can come before the first VA).
  const work = useWorkTabs();
  // VA tracker and Attendance open only once a VA request turned on the time tracker or the attendance tracker.
  const tools = useVaTools();
  const locked =
    HIDDEN_PORTAL_TABS.has(state.tab) ||
    (vaWork.known && !vaWork.has && VA_ONLY_TABS.has(state.tab)) ||
    (state.tab === "training" && training.known && !training.has) ||
    (state.tab === "funnels" && funnelMenu.known && !funnelMenu.has) ||
    (state.tab === "projects" && work.known && !work.any) ||
    (state.tab === "journal" && tools.known && !tools.timeTracker) ||
    (state.tab === "attendance" && tools.known && !tools.attendance);
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
      <BetaTesterBanner />
      <PageHeader
        kicker={`${(PORTAL_GROUP_OF[tab] ?? "My account").toUpperCase()} // ${page.title.toUpperCase()}`}
        title={page.title}
        subtitle={page.subtitle}
      />
      <PageGuide key={`guide-${tab}`} tab={tab} />
      <Toast message={state.toast} onClose={() => update({ toast: "" })} />
      <div className="page-enter" key={tab}>
        <Section />
      </div>
    </AppShell>
  );
}
