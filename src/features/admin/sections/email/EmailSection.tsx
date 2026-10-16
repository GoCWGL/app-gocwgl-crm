"use client";

import { SegmentedControl, StatGrid } from "@/components/ui";
import { percent } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";
import { EmailComposer } from "./EmailComposer";
import { SentEmails } from "./SentEmails";
import { TemplatesView } from "./TemplatesView";

export function EmailSection() {
  const { state, update } = useAdmin();
  const { sentEmails, contacts, emailView } = state;
  const opened = sentEmails.filter((m) => m.status === "Opened" || m.status === "Clicked").length;
  const clicked = sentEmails.filter((m) => m.status === "Clicked").length;

  return (
    <div className="page-stack">
      <StatGrid
        plain
        items={[
          { label: "Emails sent", value: sentEmails.reduce((n, m) => n + (m.count ?? 1), 0) },
          { label: "Open rate", value: percent(opened, sentEmails.length) },
          { label: "Click rate", value: percent(clicked, sentEmails.length) },
          { label: "Contacts you can email", value: contacts.length },
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
