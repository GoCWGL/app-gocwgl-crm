"use client";

import { useEffect } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { VA_PAGES, type VaTab } from "@/data/va";
import { RequireVa } from "@/utils/auth/guards";
import { useSectionChangeSweep } from "@/utils/navigation";
import { StaffVaBar, StaffVaGate } from "./components/StaffVaGate";
import { VaSidebar } from "./components/VaSidebar";
import { ClientsSection } from "./sections/ClientsSection";
import { DashboardSection } from "./sections/DashboardSection";
import { FeedbackSection } from "./sections/FeedbackSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { OpenJobsSection } from "./sections/OpenJobsSection";
import { ReferralsSection } from "./sections/ReferralsSection";
import { RequestSupportSection } from "./sections/RequestSupportSection";
import { ResumeSection } from "./sections/ResumeSection";
import { SopLibrarySection } from "./sections/SopLibrarySection";
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
  const { tab } = useVa();
  const page = VA_PAGES[tab];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  useSectionChangeSweep(tab);

  return (
    <AppShell sidebar={<VaSidebar />}>
      <StaffVaBar />
      <PageHeader kicker={`VA PORTAL // ${page.title.toUpperCase()}`} title={page.title} subtitle={page.subtitle} />
      <div className="page-enter" key={tab}>
        <Section tab={tab} />
      </div>
    </AppShell>
  );
}

const SECTIONS: Record<VaTab, () => React.ReactNode> = {
  dashboard: DashboardSection,
  clients: ClientsSection,
  tasks: TasksSection,
  time: TimeTrackerSection,
  invoices: InvoicesSection,
  jobs: OpenJobsSection,
  training: TrainingSection,
  feedback: FeedbackSection,
  referrals: ReferralsSection,
  sops: SopLibrarySection,
  support: RequestSupportSection,
  resume: ResumeSection,
};

function Section({ tab }: { tab: VaTab }) {
  const Page = SECTIONS[tab];
  return <Page />;
}
