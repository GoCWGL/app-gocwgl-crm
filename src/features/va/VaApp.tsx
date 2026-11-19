"use client";

import { useEffect } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { VA_CLIENT_TABS, VA_PAGES, type VaTab } from "@/data/va";
import { RequireVa } from "@/utils/auth/guards";
import { useSession } from "@/utils/auth/session";
import { usePresenceHeartbeat } from "@/utils/hooks/useUsers";
import { useMyClients } from "@/utils/hooks/useShifts";
import { useVaAccess } from "./lib/access";
import { clientLabel } from "./lib/time";
import { useSectionChangeSweep } from "@/utils/navigation";
import { StaffVaBar, StaffVaGate } from "./components/StaffVaGate";
import { VaSidebar } from "./components/VaSidebar";
import { AgreementSection } from "./sections/AgreementSection";
import { ClientDetailsSection } from "./sections/ClientDetailsSection";
import { ClientsSection } from "./sections/ClientsSection";
import { DashboardSection } from "./sections/DashboardSection";
import { FeedbackSection } from "./sections/FeedbackSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { OpenJobsSection } from "./sections/OpenJobsSection";
import { ReferralsSection } from "./sections/ReferralsSection";
import { RequestSupportSection } from "./sections/RequestSupportSection";
import { AccountSection } from "./sections/AccountSection";
import { AttendanceSection } from "./sections/AttendanceSection";
import { AssetsSection } from "./sections/AssetsSection";
import { ResumeSection } from "./sections/ResumeSection";
import { SopLibrarySection } from "./sections/SopLibrarySection";
import { ClientSopsTabSection } from "./sections/SharedSopsSection";
import { TasksSection } from "./sections/TasksSection";
import { TimeTrackerSection } from "./sections/TimeTrackerSection";
import { TrainingSection } from "./sections/TrainingSection";
import { VaProvider, useVa } from "./state/VaContext";

/** VA portal: one page with a sidebar, switching sections in place (like the admin and client portals). */
export function VaApp() {
  return (
    <RequireVa>
      <StaffVaGate>
        <VaProvider>
          <VaLayout />
        </VaProvider>
      </StaffVaGate>
    </RequireVa>
  );
}

function VaLayout() {
  const { tab, client, goTo } = useVa();
  const page = VA_PAGES[tab];
  // A client's pages (Attendance, Tasks, Assets, Time tracker, Invoices) are for one client at a time. Opened
  // without one (a shortcut or an old link), they go to the first active client.
  const clients = useMyClients(useVaAccess().ready).data?.clients;
  const forClient = VA_CLIENT_TABS.has(tab);
  const firstActive = clients?.find((c) => c.active)?.id;
  useEffect(() => {
    if (forClient && !client && firstActive) goTo(tab, firstActive);
  }, [forClient, client, firstActive, tab, goTo]);
  const current = forClient ? clients?.find((c) => c.id === client) : undefined;
  const clientName = current ? clientLabel(current) : "";
  // Online status for the team (not for staff looking at the VA portal).
  const { user } = useSession();
  usePresenceHeartbeat(!!user && !user.isStaff);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  useSectionChangeSweep(tab);

  return (
    <AppShell sidebar={<VaSidebar />}>
      <StaffVaBar />
      <PageHeader kicker={`VA PORTAL // ${clientName ? `${clientName.toUpperCase()} // ` : ""}${page.title.toUpperCase()}`} title={page.title} subtitle={page.subtitle} />
      <div className="page-enter" key={`${tab}:${client}`}>
        <Section tab={tab} />
      </div>
    </AppShell>
  );
}

const SECTIONS: Record<VaTab, () => React.ReactNode> = {
  dashboard: DashboardSection,
  agreement: AgreementSection,
  client: ClientDetailsSection,
  clients: ClientsSection,
  tasks: TasksSection,
  attendance: AttendanceSection,
  assets: AssetsSection,
  "client-sops": ClientSopsTabSection,
  time: TimeTrackerSection,
  invoices: InvoicesSection,
  jobs: OpenJobsSection,
  training: TrainingSection,
  feedback: FeedbackSection,
  referrals: ReferralsSection,
  sops: SopLibrarySection,
  support: RequestSupportSection,
  resume: ResumeSection,
  account: AccountSection,
};

function Section({ tab }: { tab: VaTab }) {
  const Page = SECTIONS[tab];
  return <Page />;
}
