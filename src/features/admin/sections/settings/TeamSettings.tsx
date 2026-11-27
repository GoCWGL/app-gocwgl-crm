"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, Icon, IconTile, Input, LoadState, Modal, Select } from "@/components/ui";
import { TEAM_ROLES, type MenuKey } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { isEmail } from "@/lib/utils";
import type { StaffRole } from "@/utils/api/users";
import { isStaffAdmin, isSuperAdmin } from "@/utils/auth/session";
import type { InvitationOut, MemberOut } from "@/utils/api/models";
import { fieldErrors } from "@/utils/errors";
import {
  useCancelStaffInvitation,
  useChangeStaffRole,
  useInviteStaff,
  useMe,
  useRemoveStaff,
  useSaveTeamAccess,
  useStaffTeam,
} from "@/utils/hooks/useUsers";
import { MenuAccessPicker, menuAccessLabel, type MenuAccess } from "./MenuAccessPicker";

export function TeamSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const me = useMe().data;
  const canManage = isStaffAdmin(me);
  const team = useStaffTeam(canManage);
  const changeRole = useChangeStaffRole();
  const remove = useRemoveStaff();
  const cancelInvite = useCancelStaffInvitation();
  const [adding, setAdding] = useState(false);
  // Edit access: a teammate's or a pending invite's role and menus.
  const [editing, setEditing] = useState<{ kind: "member"; who: MemberOut } | { kind: "invite"; who: InvitationOut } | null>(null);

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
          const lockedOwner = !superAdmin && (m.role === "super_admin" || m.role === "admin" || m.role === "shareholder");
          return (
            <div className="team-row" key={m.id}>
              <Avatar name={m.fullName || m.email} tone={avatarTone(m.id)} size="md" />
              <div className="stack stack--2 team-row__who">
                <span className="text-strong">
                  {m.fullName || m.email}
                  {isSelf && " (you)"}
                </span>
                <span className="text-small">{m.email}</span>
                <span className="text-tiny team-row__menus" title={menusOf(m)}>
                  <Icon name="grid" size={11} /> {menusOf(m)}
                </span>
              </div>
              <Badge tone="green">{m.status ?? "Active"}</Badge>
              {!isSelf && !lockedOwner && (
                <Button size="sm" variant="outline" aria-label={`Edit access for ${m.fullName || m.email}`} onClick={() => setEditing({ kind: "member", who: m })}>
                  Edit access
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
                <Icon name="grid" size={11} /> {menusOf(inv)}
              </span>
            </div>
            <Badge tone="amber">Invited</Badge>
            <span className="text-small u-strong">{TEAM_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}</span>
            {(superAdmin || (inv.role !== "super_admin" && inv.role !== "admin" && inv.role !== "shareholder")) && (
              <Button size="sm" variant="outline" aria-label={`Edit access for ${inv.fullName || inv.email}`} onClick={() => setEditing({ kind: "invite", who: inv })}>
                Edit access
              </Button>
            )}
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
      {editing && (
        <EditAccessDialog
          target={editing}
          roleOptions={roleOptions}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            onMessage(text);
          }}
        />
      )}

      <span className="text-small">
        Super Admin: everything · Admin: everything except managing admins · Sales: contacts, calendar and email · Viewer: read only
        {superAdmin && " · Shareholder: only the shareholder dashboard, no CRM"}.
        Use Edit access to change someone’s role or limit which pages they can open, before or after they accept.
      </span>
    </div>
  );
}

/** Which pages they can open, in words. */
function menusOf(m: { role: string; menuAccess?: string[] | null }): string {
  if (m.role === "super_admin") return "Every menu (super admin)";
  if (m.role === "shareholder") return "Shareholder dashboard only";
  return menuAccessLabel(m.menuAccess);
}

const ROLE_HELP: Record<StaffRole, string> = {
  super_admin: "Everything, including who is an admin or super admin.",
  admin: "Everything except adding, changing or removing admins and super admins.",
  sales: "Contacts, calendar, email and payments. No settings or team.",
  shareholder: "Only sees the shareholder dashboard: business results, published updates, documents shared with them, and their own shares and dividends. No CRM.",
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
  const hasMenus = role !== "super_admin" && role !== "shareholder";
  const noMenus = hasMenus && menus !== null && menus.length === 0;
  const api = fieldErrors(invite.error);
  const nameErr = !fullName.trim() ? "Enter their name." : api.fullName || "";
  const emailErr = !isEmail(email) ? "Enter a valid email." : api.email || "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!fullName.trim() || !isEmail(email) || noMenus) return;
    const address = email.trim();
    invite.mutate(
      { email: address, fullName: fullName.trim(), role, menuAccess: hasMenus ? menus : null },
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
      subtitle="They get an email to set their password, then they can sign in."
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
      {!hasMenus ? (
        <span className="text-small">
          {role === "shareholder" ? "Once they accept, add them on Shareholders with their share % and link this login." : "Super admins always have every menu."}
        </span>
      ) : (
        <MenuAccessPicker value={menus} onChange={setMenus} idPrefix="tm-menus" />
      )}
      {tried && noMenus && <span className="field__error">Give them access to at least one menu.</span>}
      {invite.error && !api.email && !api.fullName ? <FormError error={invite.error} /> : null}
    </Modal>
  );
}

/**
 * Edit access: change a teammate's (or a pending invite's) role and which menus they can open. A teammate's changes apply
 * on their next click (a new role signs them out first); an invite's apply when they accept.
 */
function EditAccessDialog({
  target,
  roleOptions,
  onClose,
  onSaved,
}: {
  target: { kind: "member"; who: MemberOut } | { kind: "invite"; who: InvitationOut };
  roleOptions: Array<{ value: StaffRole; label: string }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const save = useSaveTeamAccess();
  const { who: p } = target;
  const name = p.fullName || p.email;
  const startRole = p.role as StaffRole;
  const [role, setRole] = useState<StaffRole>(startRole);
  const [menus, setMenus] = useState<MenuAccess>((p.menuAccess as MenuKey[] | null | undefined) ?? null);
  const hasMenus = role !== "super_admin" && role !== "shareholder";
  const noMenus = hasMenus && menus !== null && menus.length === 0;
  // Their current role stays listed even when this admin couldn't give it.
  const options = roleOptions.some((r) => r.value === startRole) ? roleOptions : [...TEAM_ROLES.filter((r) => r.value === startRole), ...roleOptions];
  const roleLabel = TEAM_ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <Modal
      open
      width={640}
      onClose={onClose}
      titleId="access-title"
      kicker={target.kind === "invite" ? "TEAM · INVITED" : "TEAM"}
      title={`${name}’s access`}
      subtitle={
        target.kind === "invite"
          ? "They haven’t accepted yet: they get this role and these menus when they do."
          : role !== startRole
            ? "Changing their role signs them out; they sign back in with the new role."
            : "Changes apply straight away, on their next click."
      }
      media={
        <IconTile brand size="lg">
          <Icon name="grid" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={save.isPending || noMenus}
            onClick={() =>
              save.mutate(
                { kind: target.kind, id: p.id, role, roleChanged: role !== startRole, menuAccess: hasMenus ? menus : null },
                {
                  onSuccess: () =>
                    onSaved(
                      `${name} is ${roleLabel} with ${!hasMenus || menus === null ? "every menu" : `${menus.length} menu${menus.length === 1 ? "" : "s"}`}.`,
                    ),
                },
              )
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Field label="Role" htmlFor="access-role" hint={ROLE_HELP[role]}>
        <Select id="access-role" value={role} options={options} onChange={(e) => setRole(e.target.value as StaffRole)} />
      </Field>
      {!hasMenus ? (
        <span className="text-small">{role === "shareholder" ? "Shareholders only see the shareholder dashboard: no CRM menus." : "Super admins always have every menu."}</span>
      ) : (
        <MenuAccessPicker value={menus} onChange={setMenus} idPrefix={`access-${p.id}`} />
      )}
      {noMenus && <span className="field__error">Give them access to at least one menu.</span>}
      <FormError error={save.error} />
    </Modal>
  );
}
