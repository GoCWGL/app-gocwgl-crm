"use client";

import { useState } from "react";
import { Button, FormError, Icon, LoadState } from "@/components/ui";
import { SETTINGS_TABS, type SettingsTab } from "@/data/admin";
import type { OrgSettingsOut, OrgSettingsUpdate, ProfileUpdate, User } from "@/utils/api/models";
import { isStaffAdmin } from "@/utils/auth/session";
import { useSettings, useUpdateSettings } from "@/utils/hooks/useSettings";
import { useMe, useUpdateMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";
import { DomainSettings } from "./DomainSettings";
import { BusinessSettings, NotificationSettings, ProfileSettings, type BusinessDraft, type ProfileDraft } from "./GeneralSettings";
import { SecuritySettings } from "./SecuritySettings";
import { TeamSettings } from "./TeamSettings";

/** Tabs with editable drafts get Save / Discard buttons at the bottom. */
const DRAFT_TABS: SettingsTab[] = ["profile", "business", "notif"];
/** Settings only owners and admins can change (the API refuses the rest). */
const ADMIN_TABS: SettingsTab[] = ["business", "team", "domains", "notif"];

const profileOf = (u: User): ProfileDraft => ({ fullName: u.fullName, title: u.title, phone: u.phone, timezone: u.timezone });

const businessOf = (s: OrgSettingsOut): BusinessDraft => ({
  company: s.company,
  website: s.website,
  bizEmail: s.bizEmail,
  bizPhone: s.bizPhone,
  address: s.address,
  currency: s.currency,
  notifyEmail: s.notifyEmail,
  notifications: (s.notifications ?? {}) as Record<string, boolean>,
  digestHour: s.digestHour,
  digestTimezone: s.digestTimezone,
  businessTimezone: s.timezone,
});

export function SettingsSection() {
  const { state, update } = useAdmin();
  const me = useMe();
  const settings = useSettings();
  const saveMe = useUpdateMe();
  const saveSettings = useUpdateSettings();
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [businessDraft, setBusinessDraft] = useState<BusinessDraft | null>(null);
  const [message, setMessage] = useState("");

  const tab = state.settingsTab;
  const setTab = (settingsTab: SettingsTab) => update({ settingsTab });
  const user = me.data;
  const canAdmin = isStaffAdmin(user);
  const head = SETTINGS_TABS.find((t) => t.id === tab)!;

  const profile = profileDraft ?? (user ? profileOf(user) : null);
  const business = businessDraft ?? (settings.data ? businessOf(settings.data) : null);

  const discard = () => {
    setProfileDraft(null);
    setBusinessDraft(null);
    saveMe.reset();
    saveSettings.reset();
    setMessage("");
  };

  const save = () => {
    setMessage("");
    if (tab === "profile" && profileDraft) {
      const body: ProfileUpdate = { ...profileDraft, phone: profileDraft.phone.trim() };
      saveMe.mutate(body, { onSuccess: () => (setProfileDraft(null), setMessage("Changes saved.")) });
    } else if ((tab === "business" || tab === "notif") && businessDraft) {
      const body: OrgSettingsUpdate =
        tab === "business"
          ? {
              company: businessDraft.company,
              website: businessDraft.website,
              bizEmail: businessDraft.bizEmail,
              bizPhone: businessDraft.bizPhone,
              address: businessDraft.address,
              currency: businessDraft.currency as OrgSettingsUpdate["currency"],
            }
          : {
              notifications: businessDraft.notifications,
              notifyEmail: businessDraft.notifyEmail,
              digestHour: businessDraft.digestHour,
              digestTimezone: businessDraft.digestTimezone,
            };
      saveSettings.mutate(body, { onSuccess: () => (setBusinessDraft(null), setMessage("Changes saved.")) });
    } else setMessage("Nothing to save.");
  };

  const saving = saveMe.isPending || saveSettings.isPending;
  const saveError = tab === "profile" ? saveMe.error : saveSettings.error;

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

        {ADMIN_TABS.includes(tab) && !canAdmin && (
          <div className="notice notice--info" role="status">
            Only owners and admins can change these settings.
          </div>
        )}

        {tab === "profile" && (
          <LoadState query={me}>
            {profile && user && (
              <ProfileSettings
                user={user}
                company={settings.data?.company ?? ""}
                draft={profile}
                onChange={(patch) => (setProfileDraft({ ...profile, ...patch }), setMessage(""))}
              />
            )}
          </LoadState>
        )}
        {(tab === "business" || tab === "notif") && (
          <LoadState query={settings}>
            {business &&
              (tab === "business" ? (
                <BusinessSettings draft={business} onChange={(patch) => (setBusinessDraft({ ...business, ...patch }), setMessage(""))} />
              ) : (
                <NotificationSettings draft={business} onChange={(patch) => (setBusinessDraft({ ...business, ...patch }), setMessage(""))} />
              ))}
          </LoadState>
        )}
        {tab === "team" && <TeamSettings onMessage={setMessage} />}
        {tab === "domains" && <DomainSettings />}
        {tab === "security" && <SecuritySettings onMessage={setMessage} promptMfa={state.mfaPrompt && !user?.mfaEnabled} />}

        {DRAFT_TABS.includes(tab) && (
          <div className="cluster cluster--end settings__footer">
            <FormError error={saveError} />
            <Button onClick={discard} disabled={saving}>
              Discard changes
            </Button>
            <Button variant="primary" onClick={save} disabled={saving || (tab !== "profile" && !canAdmin)}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
