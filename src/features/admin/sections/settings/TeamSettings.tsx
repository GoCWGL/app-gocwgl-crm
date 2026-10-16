"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, Input, Select } from "@/components/ui";
import { TEAM_ROLES } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { isEmail, newId } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

export function TeamSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const { state, update } = useAdmin();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Sales");

  const invite = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!isEmail(address)) return;
    update((s) => ({ team: [...s.team, { id: newId(), name: address.split("@")[0], email: address, role, status: "Invited" }] }));
    setEmail("");
    onMessage(`Invite sent to ${address}.`);
  };

  return (
    <div className="stack stack--14">
      {state.team.map((m) => {
        // The owner row always shows the current profile name and email.
        const isOwner = m.role === "Owner";
        const name = m.id === 1 ? state.settings.name : m.name;
        return (
          <div className="team-row" key={m.id}>
            <Avatar name={name.replace(/[[\]]/g, "")} tone={avatarTone(m.id)} size="md" />
            <div className="stack stack--2 team-row__who">
              <span className="text-strong">{name}</span>
              <span className="text-small">{m.id === 1 ? state.settings.email : m.email}</span>
            </div>
            <Badge tone={m.status === "Active" ? "green" : "amber"}>{m.status}</Badge>
            <Select
              size="sm"
              className="input--auto"
              aria-label={`Role for ${name}`}
              value={m.role}
              options={TEAM_ROLES}
              disabled={isOwner}
              onChange={(e) => update((s) => ({ team: s.team.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)) }))}
            />
            {!isOwner && (
              <Button variant="danger" size="sm" aria-label={`Remove ${name}`} onClick={() => update((s) => ({ team: s.team.filter((x) => x.id !== m.id) }))}>
                Remove
              </Button>
            )}
          </div>
        );
      })}

      <form className="invite-form" onSubmit={invite}>
        <Field label="Invite a team member" htmlFor="inv-email" className="u-grow">
          <Input id="inv-email" type="email" value={email} placeholder="name@company.com" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role" htmlFor="inv-role">
          <Select id="inv-role" value={role} options={TEAM_ROLES.slice(1)} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary">
          Send invite
        </Button>
      </form>
      <span className="text-small">
        Admin: everything except billing · Sales: contacts, pipeline, calendar and email · Viewer: read only.
      </span>
    </div>
  );
}
