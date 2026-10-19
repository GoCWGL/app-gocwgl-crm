"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, Input, LoadState, Select } from "@/components/ui";
import { TEAM_ROLES } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { isEmail } from "@/lib/utils";
import type { StaffRole } from "@/utils/api/users";
import { isStaffAdmin } from "@/utils/auth/session";
import { fieldErrors } from "@/utils/errors";
import {
  useCancelStaffInvitation,
  useChangeStaffRole,
  useInviteStaff,
  useMe,
  useRemoveStaff,
  useStaffTeam,
} from "@/utils/hooks/useUsers";

export function TeamSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const me = useMe().data;
  const canManage = isStaffAdmin(me);
  const team = useStaffTeam(canManage);
  const invite = useInviteStaff();
  const changeRole = useChangeStaffRole();
  const remove = useRemoveStaff();
  const cancelInvite = useCancelStaffInvitation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("sales");

  // Only owners grant or take away the owner role (the API enforces it too).
  const roleOptions = me?.role === "owner" ? TEAM_ROLES : TEAM_ROLES.filter((r) => r.value !== "owner");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!isEmail(address)) return;
    invite.mutate(
      { email: address, fullName: fullName.trim(), role },
      {
        onSuccess: () => {
          setEmail("");
          setFullName("");
          onMessage(`Invite sent to ${address}.`);
        },
      },
    );
  };

  if (!canManage) return <div className="empty-state">Ask an owner or admin to manage the team.</div>;

  const apiFields = fieldErrors(invite.error);

  return (
    <div className="stack stack--14">
      <FormError error={changeRole.error ?? remove.error ?? cancelInvite.error} />
      <LoadState query={team}>
        {team.data?.members.map((m) => {
          const isSelf = m.id === me?.id;
          const lockedOwner = m.role === "owner" && me?.role !== "owner";
          return (
            <div className="team-row" key={m.id}>
              <Avatar name={m.fullName || m.email} tone={avatarTone(m.id)} size="md" />
              <div className="stack stack--2 team-row__who">
                <span className="text-strong">
                  {m.fullName || m.email}
                  {isSelf && " (you)"}
                </span>
                <span className="text-small">{m.email}</span>
              </div>
              <Badge tone="green">{m.status ?? "Active"}</Badge>
              <Select
                size="sm"
                className="input--auto"
                aria-label={`Role for ${m.fullName || m.email}`}
                value={m.role}
                options={lockedOwner ? TEAM_ROLES : roleOptions}
                disabled={isSelf || lockedOwner || changeRole.isPending}
                onChange={(e) =>
                  changeRole.mutate(
                    { userId: m.id, role: e.target.value as StaffRole },
                    { onSuccess: () => onMessage(`${m.fullName || m.email} is now ${e.target.value}.`) },
                  )
                }
              />
              {!isSelf && !lockedOwner && (
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Remove ${m.fullName || m.email}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(m.id, { onSuccess: () => onMessage(`${m.fullName || m.email} was removed.`) })}
                >
                  Remove
                </Button>
              )}
            </div>
          );
        })}
        {team.data?.invitations.map((inv) => (
          <div className="team-row" key={inv.id}>
            <Avatar name={inv.fullName || inv.email} tone={avatarTone(inv.id)} size="md" />
            <div className="stack stack--2 team-row__who">
              <span className="text-strong">{inv.fullName || inv.email}</span>
              <span className="text-small">{inv.email}</span>
            </div>
            <Badge tone="amber">Invited</Badge>
            <span className="text-small u-strong">{TEAM_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}</span>
            <Button
              variant="danger"
              size="sm"
              aria-label={`Cancel invite for ${inv.email}`}
              disabled={cancelInvite.isPending}
              onClick={() => cancelInvite.mutate(inv.id, { onSuccess: () => onMessage(`Invite for ${inv.email} cancelled.`) })}
            >
              Cancel invite
            </Button>
          </div>
        ))}
      </LoadState>

      <form className="invite-form" onSubmit={submit}>
        <Field label="Invite a team member" htmlFor="inv-email" className="u-grow" error={apiFields.email}>
          <Input id="inv-email" type="email" value={email} placeholder="name@company.com" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Name (optional)" htmlFor="inv-name">
          <Input id="inv-name" value={fullName} placeholder="Their name" onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Role" htmlFor="inv-role">
          <Select id="inv-role" value={role} options={roleOptions} onChange={(e) => setRole(e.target.value as StaffRole)} />
        </Field>
        <Button type="submit" variant="primary" disabled={invite.isPending}>
          {invite.isPending ? "Sending…" : "Send invite"}
        </Button>
      </form>
      {invite.error && !apiFields.email ? <FormError error={invite.error} /> : null}
      <span className="text-small">
        Admin: everything except granting the owner role · Sales: contacts, pipeline, calendar and email · Viewer: read only.
      </span>
    </div>
  );
}
