"use client";

import { useEffect, type ComponentType } from "react";
import { AppShell, PageHeader } from "@/components/layout";
import { Button, Tabs, Toast } from "@/components/ui";
import { ADMIN_PAGES, CONTACT_VIEWS, TAB_GROUPS, TAB_MENU, type AdminTab } from "@/data/admin";
import { RequireStaff } from "@/utils/auth/guards";
import { canUseMenu, canWriteCrm } from "@/utils/auth/session";
import { useSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { useSectionChangeSweep } from "@/utils/navigation";
import { AdminSidebar } from "./components/AdminSidebar";
import { NotificationBell } from "./components/NotificationBell";
import { AddClientModal } from "./modals/AddClientModal";
import { EditContactDrawer } from "./modals/EditContactDrawer";
import { VaProfileDrawer } from "./modals/VaProfileDrawer";
import { ViewAsClient } from "./modals/ViewAsClient";
import { AffiliatesSection, ReferralBonusSection } from "./sections/affiliates/AffiliatesSection";
import { AutomationSection } from "./sections/automation/AutomationSection";
import { BugsSection } from "./sections/bugs/BugsSection";
import { FeedbackSection } from "./sections/engagement/FeedbackSection";
import { StatusSection } from "./sections/engagement/StatusSection";
import { SupportSection } from "./sections/engagement/SupportSection";
import { JobPostingsSection } from "./sections/jobs/JobPostingsSection";
import { SopsSection } from "./sections/sops/SopsSection";
import { TrainingsSection } from "./sections/trainings/TrainingsSection";
import { CalendarSection } from "./sections/calendar/CalendarSection";
import { ClientsSection } from "./sections/contacts/ClientsSection";
import { TagsSection } from "./sections/contacts/TagsSection";
import { VasSection } from "./sections/vas/VasSection";
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
  vas: VasSection,
  tags: TagsSection,
  pipeline: PipelineSection,
  calendar: CalendarSection,
  bonuses: ReferralBonusSection,
  payments: PaymentsSection,
  affiliates: AffiliatesSection,
  progress: CrmBuildsSection,
  funnels: FunnelBuildsSection,
  media: MediaSection,
  email: EmailSection,
  forms: FormsSection,
  surveys: SurveysSection,
  automation: AutomationSection,
  reporting: ReportingSection,
  bugs: BugsSection,
  status: StatusSection,
  training: TrainingsSection,
  sops: SopsSection,
  support: SupportSection,
  feedback: FeedbackSection,
  jobs: JobPostingsSection,
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
  const me = useMe().data;
  const canWrite = canWriteCrm(me);
  // Settings › Team › Menus: a page this teammate can't use sends them to their first one (Settings if none).
  const allowed = canUseMenu(me, TAB_MENU[tab]);
  const firstAllowed = (Object.keys(SECTIONS) as AdminTab[]).find((t) => canUseMenu(me, TAB_MENU[t])) ?? "settings";
  useEffect(() => {
    if (me && !allowed) update({ tab: firstAllowed, editContactId: "" });
  }, [me, allowed, firstAllowed, update]);

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
          <VaProfileDrawer />
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
                {/* Tags only: the Clients page has its own Add client button. */}
                {tab === "tags" && (
                  <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => update({ addClientOpen: true })}>
                    + Add client
                  </Button>
                )}
              </>
            )}
          </>
        }
      />
      <GroupTabs />
      {/* Keyed by view so filters reset when switching Contacts / Clients / Inactive, and the entrance replays. */}
      <div className="page-enter" key={tab === "clients" ? (contactView === "all" ? "contacts" : "clients") : tab}>
        {allowed ? <Section /> : <div className="empty-state">You don’t have access to this page. Ask a super admin for access.</div>}
      </div>
    </AppShell>
  );
}

/** Menus that hold several pages (Dashboard, CRM Requests): one tab per page the teammate may use. */
function GroupTabs() {
  const { state, goTo } = useAdmin();
  const me = useMe().data;
  const group = TAB_GROUPS.find((g) => g.tabs.some((t) => t.tab === state.tab));
  if (!group) return null;
  const options = group.tabs
    .filter((t) => canUseMenu(me, TAB_MENU[t.tab]))
    .map((t) => ({ value: t.tab, label: t.label, icon: t.icon, tone: t.tone }));
  if (options.length < 2) return null;
  return <Tabs label={group.label} value={state.tab} onChange={(t) => goTo(t)} options={options} />;
}

/** CRM Requests › Build progress: CRM builds and CRM requests. */
function CrmBuildsSection() {
  return <ProgressSection kind="crm" />;
}

/** Funnel Requests: funnel builds and funnel requests (same layout as CRM Requests). */
function FunnelBuildsSection() {
  return <ProgressSection kind="funnel" />;
}
