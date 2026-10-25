"use client";

import { useEffect, type ComponentType } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Toast } from "@/components/ui";
import { ADMIN_PAGES, CONTACT_VIEWS, type AdminTab } from "@/data/admin";
import { RequireStaff } from "@/utils/auth/guards";
import { canWriteCrm } from "@/utils/auth/session";
import { useSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { useSectionChangeSweep } from "@/utils/navigation";
import { AdminSidebar } from "./components/AdminSidebar";
import { NotificationBell } from "./components/NotificationBell";
import { AddClientModal } from "./modals/AddClientModal";
import { EditContactDrawer } from "./modals/EditContactDrawer";
import { ViewAsClient } from "./modals/ViewAsClient";
import { AffiliatesSection } from "./sections/affiliates/AffiliatesSection";
import { AutomationSection } from "./sections/automation/AutomationSection";
import { BugsSection } from "./sections/bugs/BugsSection";
import { CalendarSection } from "./sections/calendar/CalendarSection";
import { ClientsSection } from "./sections/contacts/ClientsSection";
import { TagsSection } from "./sections/contacts/TagsSection";
import { DashboardSection } from "./sections/dashboard/DashboardSection";
import { EmailSection } from "./sections/email/EmailSection";
import { FormsSection } from "./sections/forms/FormsSection";
import { MediaSection } from "./sections/media/MediaSection";
import { PaymentsSection } from "./sections/payments/PaymentsSection";
import { PipelineSection } from "./sections/pipeline/PipelineSection";
import { NewBuildModal } from "./sections/progress/NewBuildModal";
import { ProgressSection } from "./sections/progress/ProgressSection";
import { ReportingSection } from "./sections/reporting/ReportingSection";
import { SettingsSection } from "./sections/settings/SettingsSection";
import { SurveysSection } from "./sections/surveys/SurveysSection";
import { AdminProvider, useAdmin } from "./state/AdminContext";

const SECTIONS: Record<AdminTab, ComponentType> = {
  dashboard: DashboardSection,
  clients: ClientsSection,
  tags: TagsSection,
  pipeline: PipelineSection,
  calendar: CalendarSection,
  payments: PaymentsSection,
  affiliates: AffiliatesSection,
  progress: ProgressSection,
  media: MediaSection,
  email: EmailSection,
  forms: FormsSection,
  surveys: SurveysSection,
  automation: AutomationSection,
  reporting: ReportingSection,
  bugs: BugsSection,
  settings: SettingsSection,
};

/** Admin CRM: sidebar navigation, one section at a time, plus shared modals. */
export function AdminApp() {
  return (
    <RequireStaff>
      <AdminProvider>
        <AdminLayout />
      </AdminProvider>
    </RequireStaff>
  );
}

function AdminLayout() {
  const { state, update } = useAdmin();
  const { tab, contactView } = state;
  // Loads the business currency and time zone every admin screen formats with.
  useSettings();
  const canWrite = canWriteCrm(useMe().data);

  // Start each section at the top of the page, with the top progress sweep.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, contactView]);
  useSectionChangeSweep(`${tab}:${contactView}`);

  const page = tab === "clients" ? CONTACT_VIEWS[contactView] : ADMIN_PAGES[tab];
  const Section = SECTIONS[tab];

  return (
    <AppShell
      sidebar={<AdminSidebar />}
      overlays={
        <>
          <AddClientModal />
          <NewBuildModal />
          <EditContactDrawer />
          <ViewAsClient />
          <Toast floating message={state.toast} onClose={() => update({ toast: "" })} />
        </>
      }
    >
      <PageHeader
        kicker={`GOCWGL // ${page.title.toUpperCase()}`}
        title={page.title}
        subtitle={page.subtitle}
        actions={
          <>
            <NotificationBell />
            {canWrite && (
              <>
                {tab === "progress" && (
                  <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => update({ newBuildOpen: true })}>
                    + New build
                  </Button>
                )}
                {/* Only under Contacts (every contact view, and Tags). */}
                {(tab === "clients" || tab === "tags") && (
                  <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => update({ addClientOpen: true })}>
                    + Add client
                  </Button>
                )}
              </>
            )}
          </>
        }
      />
      {/* Keyed by view so filters reset when switching Contacts / Clients / Inactive, and the entrance replays. */}
      <div className="page-enter" key={tab === "clients" ? contactView : tab}>
        <Section />
      </div>
    </AppShell>
  );
}
