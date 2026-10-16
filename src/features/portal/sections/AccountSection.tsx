"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, Input, Toggle } from "@/components/ui";
import { ALERT_OPTIONS, type Profile } from "@/data/portal";
import { isEmail } from "@/lib/utils";
import { SocialLinksCard } from "../components/SocialLinksCard";
import { usePortal } from "../state/PortalContext";

const PROFILE_FIELDS: Array<{ key: keyof Profile; label: string; type: string; autoComplete: string }> = [
  { key: "name", label: "Full name", type: "text", autoComplete: "name" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  { key: "business", label: "Business name", type: "text", autoComplete: "organization" },
  { key: "website", label: "Website", type: "url", autoComplete: "url" },
];

export function AccountSection() {
  const { state, update, notify } = usePortal();
  const [inviteEmail, setInviteEmail] = useState("");

  const invite = (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!isEmail(email)) return;
    setInviteEmail("");
    update((s) => ({
      team: [...s.team, { name: email.split("@")[0], email, role: "Invited" }],
      toast: `Invite sent to ${email}.`,
    }));
  };

  return (
    <div className="card-row">
      <section className="card account-profile">
        <span className="kicker">PROFILE</span>
        <div className="form-grid">
          {PROFILE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`acct-${f.key}`}>
              <Input
                id={`acct-${f.key}`}
                type={f.type}
                autoComplete={f.autoComplete}
                value={state.profile[f.key]}
                onChange={(e) => update((s) => ({ profile: { ...s.profile, [f.key]: e.target.value } }))}
              />
            </Field>
          ))}
        </div>

        <span className="kicker">ALERTS</span>
        <div>
          {ALERT_OPTIONS.map((a) => (
            <div className="list-row list-row--nowrap" key={a.key}>
              <div className="stack stack--2 u-grow">
                <span className="u-strong">{a.label}</span>
                <span className="text-small">{a.desc}</span>
              </div>
              <Toggle
                label={a.label}
                checked={!!state.alerts[a.key]}
                onChange={(on) => update((s) => ({ alerts: { ...s.alerts, [a.key]: on } }))}
              />
            </div>
          ))}
        </div>
        <Button variant="primary" className="u-self-end" onClick={() => notify("Your account details were saved.")}>
          Save changes
        </Button>
      </section>

      <section className="card">
        <span className="kicker">PEOPLE WITH PORTAL ACCESS</span>
        <div>
          {state.team.map((m) => (
            <div className="list-row list-row--nowrap" key={m.email}>
              <Avatar name={m.name} tone="purple" />
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{m.name}</span>
                <span className="text-small">{m.email}</span>
              </div>
              <span className="kicker kicker--sm kicker--muted">{m.role}</span>
            </div>
          ))}
        </div>
        <form className="cluster cluster--8 cluster--nowrap" onSubmit={invite}>
          <label className="sr-only" htmlFor="ac-inv">
            Invite by email
          </label>
          <Input
            id="ac-inv"
            type="email"
            size="sm"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@yourbusiness.com"
          />
          <Button type="submit" variant="accent">
            Invite
          </Button>
        </form>
      </section>

      <SocialLinksCard />
    </div>
  );
}
