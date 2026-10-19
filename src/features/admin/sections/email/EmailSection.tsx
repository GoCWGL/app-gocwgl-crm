"use client";

import { SegmentedControl, StatGrid } from "@/components/ui";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useSentEmails } from "@/utils/hooks/useMarketing";
import { useAdmin } from "../../state/AdminContext";
import { EmailComposer } from "./EmailComposer";
import { SentEmails } from "./SentEmails";
import { TemplatesView } from "./TemplatesView";

export function EmailSection() {
  const { state, update } = useAdmin();
  const { emailView } = state;
  const sent = useSentEmails().data ?? [];
  const contactTotal = useContactsPage({ limit: 1 }).data?.total;

  return (
    <div className="page-stack">
      <StatGrid
        plain
        items={[
          { label: "Emails sent", value: sent.filter((m) => m.status === "Sent").reduce((n, m) => n + (m.recipientCount || 1), 0) },
          { label: "Waiting to send", value: sent.filter((m) => m.status === "Queued").length },
          // Open and click tracking isn't built yet (backend F-5).
          { label: "Open & click rates", value: "Coming soon" },
          { label: "Contacts you can email", value: contactTotal ?? "—" },
        ]}
      />

      <SegmentedControl
        kind="tabs"
        label="Email views"
        value={emailView}
        onChange={(view) => update({ emailView: view })}
        options={[
          { value: "compose", label: "Compose" },
          { value: "templates", label: "Templates" },
        ]}
      />

      {emailView === "compose" ? (
        <div className="card-row">
          <EmailComposer />
          <SentEmails />
        </div>
      ) : (
        <TemplatesView />
      )}
    </div>
  );
}
