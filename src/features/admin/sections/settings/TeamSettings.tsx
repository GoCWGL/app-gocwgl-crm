"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, Icon, IconTile, Input, LoadState, Modal, Select } from "@/components/ui";
import { TEAM_ROLES } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { isEmail } from "@/lib/utils";
import type { StaffRole } from "@/utils/api/users";
import { isStaffAdmin, isSuperAdmin } from "@/utils/auth/session";
import type { MemberOut } from "@/utils/api/models";
import { fieldErrors } from "@/utils/errors";
import {
  useCancelStaffInvitation,
  useChangeStaffRole,
  useInviteStaff,
  useMe,
  useRemoveStaff,
  useStaffTeam,
} from "@/utils/hooks/useUsers";
import { MenuAccessDialog, MenuAccessPicker, menuAccessLabel, type MenuAccess } from "./MenuAccessPicker";

export function TeamSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const me = useMe().data;
  const canManage = isStaffAdmin(me);
  const team = useStaffTeam(canManage);
  const changeRole = useChangeStaffRole();
  const remove = useRemoveStaff();
  const cancelInvite = useCancelStaffInvitation();
  const [adding, setAdding] = useState(false);
  const [editingMenus, setEditingMenus] = useState<MemberOut | null>(null);

  // Only a super admin grants or takes away the admin and super admin roles (the API enforces it too).
  const superAdmin = isSuperAdmin(me);
  const roleOptions = superAdmin ? TEAM_ROLES : TEAM_ROLES.filter((r) => r.value === "sales" || r.value === "viewer");

  if (!canManage) return <div className="empty-state">Ask an owner or admin to manage the team.</div>;

  return (
    <div className="stack stack--14">
      <div className="cluster cluster--end">
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Icon name="userPlus" size={15} />
          Add team member
        </Button>
      </div>
      {adding && (
        <AddTeamMemberDialog
          roleOptions={roleOptions}
          onClose={() => setAdding(false)}
          onAdded={(text) => {
            setAdding(false);
            onMessage(text);
          }}
        />
      )}
      <FormError error={changeRole.error ?? remove.error ?? cancelInvite.error} />
      <LoadState query={team}>
        {team.data?.members.map((m) => {
          const isSelf = m.id === me?.id;
          const lockedOwner = !superAdmin && (m.role === "super_admin" || m.role === "admin");
          return (
            <div className="team-row" key={m.id}>
              <Avatar name={m.fullName || m.email} tone={avatarTone(m.id)} size="md" />
              <div className="stack stack--2 team-row__who">
                <span className="text-strong">
                  {m.fullName || m.email}
                  {isSelf && " (you)"}
                </span>
                <span className="text-small">{m.email}</span>
                <span className="text-tiny team-row__menus" title={menuAccessLabel(m.menuAccess)}>
                  <Icon name="grid" size={11} /> {m.role === "super_admin" ? "Every menu (super admin)" : menuAccessLabel(m.menuAccess)}
                </span>
              </div>
              <Badge tone="green">{m.status ?? "Active"}</Badge>
              {!isSelf && !lockedOwner && m.role !== "super_admin" && (
                <Button size="sm" variant="outline" aria-label={`Menu access for ${m.fullName || m.email}`} onClick={() => setEditingMenus(m)}>
                  Menus
                </Button>
              )}
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
              <span className="text-tiny team-row__menus">
                <Icon name="grid" size={11} /> {inv.role === "super_admin" ? "Every menu (super admin)" : menuAccessLabel(inv.menuAccess)}
              </span>
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
      {editingMenus && (
        <MenuAccessDialog
          member={editingMenus}
          onClose={() => setEditingMenus(null)}
          onSaved={(text) => {
            setEditingMenus(null);
            onMessage(text);
          }}
        />
      )}

      <span className="text-small">
        Super Admin: everything · Admin: everything except managing admins · Sales: contacts, pipeline, calendar and email · Viewer: read only.
        Use Menus to limit which pages someone can open.
      </span>
    </div>
  );
}

const ROLE_HELP: Record<StaffRole, string> = {
  super_admin: "Everything, including who is an admin or super admin.",
  admin: "Everything except adding, changing or removing admins and super admins.",
  sales: "Contacts, pipeline, calendar, email and payments. No settings or team.",
  viewer: "Can look at everything but can’t change anything.",
};

/**
 * New team member: name, email and role. The API adds them by invitation: they get an email
 * to choose their password, and show as "Invited" until they accept.
 */
function AddTeamMemberDialog({
  roleOptions,
  onClose,
  onAdded,
}: {
  roleOptions: Array<{ value: StaffRole; label: string }>;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const invite = useInviteStaff();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("sales");
  const [menus, setMenus] = useState<MenuAccess>(null);
  const [tried, setTried] = useState(false);
  const noMenus = role !== "super_admin" && menus !== null && menus.length === 0;
  const api = fieldErrors(invite.error);
  const nameErr = !fullName.trim() ? "Enter their name." : api.fullName || "";
  const emailErr = !isEmail(email) ? "Enter a valid email." : api.email || "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!fullName.trim() || !isEmail(email) || noMenus) return;
    const address = email.trim();
    invite.mutate(
      { email: address, fullName: fullName.trim(), role, menuAccess: role === "super_admin" ? null : menus },
      { onSuccess: () => onAdded(`${fullName.trim()} was added as ${TEAM_ROLES.find((r) => r.value === role)?.label}. An invite is on its way to ${address}.`) },
    );
  };

  return (
    <Modal
      open
      width={640}
      onClose={onClose}
      onSubmit={submit}
      titleId="tm-title"
      kicker="TEAM"
      title="Add a team member"
      subtitle="They get an email to set their password, then they can sign in to the CRM."
      media={
        <IconTile brand size="lg">
          <Icon name="userPlus" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={invite.isPending}>
            {invite.isPending ? "Adding…" : "Add team member"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Full name" htmlFor="tm-name" required error={tried && nameErr}>
          <Input id="tm-name" autoComplete="off" value={fullName} placeholder="Jane Doe" onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="tm-email" required error={tried && emailErr}>
          <Input
            id="tm-email"
            type="email"
            autoComplete="off"
            value={email}
            placeholder="jane@company.com"
            onChange={(e) => {
              setEmail(e.target.value);
              invite.reset();
            }}
          />
        </Field>
      </div>
      <Field label="Role" htmlFor="tm-role" hint={ROLE_HELP[role]}>
        <Select id="tm-role" value={role} options={roleOptions} onChange={(e) => setRole(e.target.value as StaffRole)} />
      </Field>
      {role === "super_admin" ? (
        <span className="text-small">Super admins always have every menu.</span>
      ) : (
        <MenuAccessPicker value={menus} onChange={setMenus} idPrefix="tm-menus" />
      )}
      {tried && noMenus && <span className="field__error">Give them access to at least one menu.</span>}
      {invite.error && !api.email && !api.fullName ? <FormError error={invite.error} /> : null}
    </Modal>
  );
}
