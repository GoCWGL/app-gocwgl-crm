"use client";

import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { Avatar, Field, Input, Select, Toggle } from "@/components/ui";
import { CURRENCIES, NOTIFICATION_OPTIONS, TIME_ZONES, roleLabel } from "@/data/admin";
import type { User } from "@/utils/api/models";

/** Editable profile fields (PATCH /users/me). Email changes aren't built yet (backend F-4). */
export type ProfileDraft = { fullName: string; title: string; phone: string; timezone: string };

/** Editable business + notification fields (PATCH /admin/settings). */
export type BusinessDraft = {
  company: string;
  website: string;
  bizEmail: string;
  bizPhone: string;
  address: string;
  currency: string;
  notifyEmail: string;
  notifications: Record<string, boolean>;
  /** Daily summary: hour (0-23) and time zone ("" = the business time zone). */
  digestHour: number;
  digestTimezone: string;
  /** Read-only: shown as the default for the Daily summary's time zone. */
  businessTimezone: string;
};

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`,
}));

type FieldDef<K extends string> = { key: K; label: string; type?: string; placeholder?: string; autoComplete?: string };

function TextFields<T extends Record<string, unknown>, K extends keyof T & string>({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef<K>[];
  values: T;
  onChange: (patch: Partial<T>) => void;
}) {
  return (
    <>
      {fields.map((f) => (
        <Field key={f.key} label={f.label} htmlFor={`set-${f.key}`}>
          <Input
            id={`set-${f.key}`}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            autoComplete={f.autoComplete ?? "off"}
            value={String(values[f.key] ?? "")}
            onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<T>)}
          />
        </Field>
      ))}
    </>
  );
}

/** A zone the API sent that isn't in the short list still shows (and stays selected). */
function zoneOptions(current: string) {
  return TIME_ZONES.some((z) => z.value === current) || !current ? TIME_ZONES : [{ value: current, label: current }, ...TIME_ZONES];
}


export function ProfileSettings({
  user,
  company,
  draft,
  onChange,
}: {
  user: User;
  company: string;
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
}) {
  return (
    <div className="stack stack--16">
      <div className="cluster settings-profile">
        <Avatar name={draft.fullName || user.email} brand ring size="xl" className="settings-profile__avatar" />
        <div className="stack stack--2">
          <span className="settings-profile__name">{draft.fullName || user.email}</span>
          <span className="text-muted">
            {roleLabel(user.role)}
            {company && ` · ${company}`}
          </span>
        </div>
      </div>
      <div className="form-grid">
        <TextFields
          values={draft}
          onChange={onChange}
          fields={[
            { key: "fullName", label: "Full name", autoComplete: "name" },
            { key: "title", label: "Job title" },
          ]}
        />
        <Field label="Login email" htmlFor="set-email" hint="Changing your login email is coming soon.">
          <Input id="set-email" type="email" value={user.email} readOnly aria-readonly="true" />
        </Field>
        <TextFields
          values={draft}
          onChange={onChange}
          fields={[{ key: "phone", label: "Phone", type: "tel", placeholder: "(555) 000-0000", autoComplete: "tel" }]}
        />
        <Field label="Time zone" htmlFor="set-tz">
          <Select id="set-tz" value={draft.timezone} options={zoneOptions(draft.timezone)} onChange={(e) => onChange({ timezone: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function BusinessSettings({ draft, onChange }: { draft: BusinessDraft; onChange: (patch: Partial<BusinessDraft>) => void }) {
  return (
    <div className="stack stack--16">
      <div className="inset logo-row">
        <Image src={logoWordmark} alt="Current logo" width={150} />
        <div className="stack stack--2">
          <span className="text-strong">Brand logo</span>
          <span className="text-small">Shown in the sidebar, on forms, booking pages and client progress pages.</span>
        </div>
      </div>
      <div className="form-grid">
        <TextFields
          values={draft}
          onChange={onChange}
          fields={[
            { key: "company", label: "Business name", autoComplete: "organization" },
            { key: "website", label: "Website", type: "url" },
            { key: "bizEmail", label: "Business email (sender for emails)", type: "email" },
            { key: "bizPhone", label: "Business phone", type: "tel" },
            { key: "address", label: "Business address" },
          ]}
        />
        <Field label="Currency" htmlFor="set-cur">
          <Select id="set-cur" value={draft.currency} options={CURRENCIES} onChange={(e) => onChange({ currency: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function NotificationSettings({ draft, onChange }: { draft: BusinessDraft; onChange: (patch: Partial<BusinessDraft>) => void }) {
  return (
    <div>
      {NOTIFICATION_OPTIONS.map((n) => {
        const on = draft.notifications[n.key] ?? n.defaultOn;
        return (
          <div className="list-row list-row--nowrap" key={n.key}>
            <div className="stack stack--2 u-grow">
              <span className="u-strong">{n.label}</span>
              <span className="text-small">{n.desc}</span>
            </div>
            <Toggle label={n.label} checked={on} onChange={(next) => onChange({ notifications: { ...draft.notifications, [n.key]: next } })} />
          </div>
        );
      })}
      <div className="digest-time">
        <Field label="Daily summary time" htmlFor="set-digest-hour" hint="One email a day with yesterday’s numbers.">
          <Select
            id="set-digest-hour"
            value={String(draft.digestHour)}
            options={HOURS}
            disabled={draft.notifications.digest === false}
            onChange={(e) => onChange({ digestHour: Number(e.target.value) })}
          />
        </Field>
        <Field label="Time zone" htmlFor="set-digest-tz">
          <Select
            id="set-digest-tz"
            value={draft.digestTimezone}
            disabled={draft.notifications.digest === false}
            options={[{ value: "", label: `Business time zone (${draft.businessTimezone})` }, ...zoneOptions(draft.digestTimezone)]}
            onChange={(e) => onChange({ digestTimezone: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Send notifications to" htmlFor="set-notify-email" className="notify-email">
        <Input
          id="set-notify-email"
          type="email"
          value={draft.notifyEmail}
          placeholder="you@yourdomain.com"
          onChange={(e) => onChange({ notifyEmail: e.target.value })}
        />
      </Field>
    </div>
  );
}
