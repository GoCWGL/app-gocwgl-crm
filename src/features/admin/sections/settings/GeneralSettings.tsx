"use client";

import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { Avatar, Field, Input, Select, Toggle } from "@/components/ui";
import { CURRENCIES, NOTIFICATION_OPTIONS, TIME_ZONES, type Settings } from "@/data/admin";

type PanelProps = { settings: Settings; onChange: (patch: Partial<Settings>) => void };

type FieldDef = { key: keyof Settings; label: string; type?: string; placeholder?: string; autoComplete?: string };

function TextFields({ fields, settings, onChange }: PanelProps & { fields: FieldDef[] }) {
  return (
    <>
      {fields.map((f) => (
        <Field key={f.key} label={f.label} htmlFor={`set-${f.key}`}>
          <Input
            id={`set-${f.key}`}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            autoComplete={f.autoComplete ?? "off"}
            value={String(settings[f.key] ?? "")}
            onChange={(e) => onChange({ [f.key]: e.target.value })}
          />
        </Field>
      ))}
    </>
  );
}

export function ProfileSettings({ settings, onChange }: PanelProps) {
  return (
    <div className="stack stack--16">
      <div className="cluster settings-profile">
        <Avatar name={settings.name} brand ring size="xl" className="settings-profile__avatar" />
        <div className="stack stack--2">
          <span className="settings-profile__name">{settings.name}</span>
          <span className="text-muted">
            {settings.role} · {settings.company}
          </span>
        </div>
      </div>
      <div className="form-grid">
        <TextFields
          settings={settings}
          onChange={onChange}
          fields={[
            { key: "name", label: "Full name", autoComplete: "name" },
            { key: "title", label: "Job title" },
            { key: "email", label: "Login email", type: "email", autoComplete: "email" },
            { key: "phone", label: "Phone", type: "tel", placeholder: "(555) 000-0000", autoComplete: "tel" },
          ]}
        />
        <Field label="Time zone" htmlFor="set-tz">
          <Select id="set-tz" value={settings.tz} options={TIME_ZONES} onChange={(e) => onChange({ tz: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function BusinessSettings({ settings, onChange }: PanelProps) {
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
          settings={settings}
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
          <Select id="set-cur" value={settings.currency} options={CURRENCIES} onChange={(e) => onChange({ currency: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function NotificationSettings({ settings, onChange }: PanelProps) {
  return (
    <div>
      {NOTIFICATION_OPTIONS.map((n) => (
        <div className="list-row list-row--nowrap" key={n.key}>
          <div className="stack stack--2 u-grow">
            <span className="u-strong">{n.label}</span>
            <span className="text-small">{n.desc}</span>
          </div>
          <Toggle
            label={n.label}
            checked={!!settings.notif[n.key]}
            onChange={(on) => onChange({ notif: { ...settings.notif, [n.key]: on } })}
          />
        </div>
      ))}
      <Field label="Send notifications to" htmlFor="set-notify-email" className="notify-email">
        <Input
          id="set-notify-email"
          type="email"
          value={settings.notifyEmail}
          placeholder="you@yourdomain.com"
          onChange={(e) => onChange({ notifyEmail: e.target.value })}
        />
      </Field>
    </div>
  );
}
