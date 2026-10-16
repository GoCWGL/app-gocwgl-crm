"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { SETTINGS_TABS, type Settings, type SettingsTab } from "@/data/admin";
import { useAdmin } from "../../state/AdminContext";
import { DomainSettings } from "./DomainSettings";
import { BusinessSettings, NotificationSettings, ProfileSettings } from "./GeneralSettings";
import { SecuritySettings } from "./SecuritySettings";
import { TeamSettings } from "./TeamSettings";

/** Tabs with editable drafts get Save / Discard buttons at the bottom. */
const DRAFT_TABS: SettingsTab[] = ["profile", "business", "notif"];

export function SettingsSection() {
  const { state, update } = useAdmin();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [draft, setDraft] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");

  const current = draft ?? state.settings;
  const edit = (patch: Partial<Settings>) => {
    setDraft({ ...current, ...patch });
    setMessage("");
  };
  const head = SETTINGS_TABS.find((t) => t.id === tab)!;

  return (
    <div className="split settings">
      <nav className="card card--tight settings__nav" aria-label="Settings sections">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="settings__tab"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => {
              setTab(t.id);
              setMessage("");
            }}
          >
            <Icon name={t.icon} strokeWidth={1.9} />
            {t.label}
          </button>
        ))}
      </nav>

      <section className="card card--roomy settings__panel">
        <div className="stack stack--4">
          <span className="kicker">{head.kicker}</span>
          <h2 className="modal__title">{head.heading}</h2>
          <span className="text-muted">{head.blurb}</span>
        </div>

        {message && (
          <div className="notice notice--success u-strong" role="status">
            {message}
          </div>
        )}

        {tab === "profile" && <ProfileSettings settings={current} onChange={edit} />}
        {tab === "business" && <BusinessSettings settings={current} onChange={edit} />}
        {tab === "notif" && <NotificationSettings settings={current} onChange={edit} />}
        {tab === "team" && <TeamSettings onMessage={setMessage} />}
        {tab === "domains" && <DomainSettings />}
        {tab === "security" && <SecuritySettings onMessage={setMessage} />}

        {DRAFT_TABS.includes(tab) && (
          <div className="cluster cluster--end settings__footer">
            <Button
              onClick={() => {
                setDraft(null);
                setMessage("");
              }}
            >
              Discard changes
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                update({ settings: current });
                setDraft(null);
                setMessage("Changes saved.");
              }}
            >
              Save changes
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
