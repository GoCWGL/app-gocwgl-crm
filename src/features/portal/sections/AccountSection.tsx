"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, FormError, Input, LoadState, Select, SoonNote, Toggle } from "@/components/ui";
import { TIME_ZONES } from "@/data/admin";
import { ALERT_OPTIONS } from "@/data/portal";
import { avatarTone } from "@/lib/tones";
import { isEmail } from "@/lib/utils";
import { fieldErrors } from "@/utils/errors";
import { useSignOut } from "@/utils/hooks/useAuth";
import { useOverview } from "@/utils/hooks/usePortal";
import {
  useCancelPortalInvitation,
  useInvitePortalMember,
  useMe,
  useMyNotifications,
  usePortalTeam,
  useRemovePortalMember,
  useSetMyNotifications,
  useUpdateMe,
} from "@/utils/hooks/useUsers";
import { SocialLinksCard } from "../components/SocialLinksCard";
import { usePortal } from "../state/PortalContext";

type ProfileDraft = { fullName: string; phone: string; title: string; timezone: string };

export function AccountSection() {
  const { readOnly } = usePortal();
  return (
    <div className="card-row">
      <ProfileCard readOnly={readOnly} />
      <TeamCard />
      <SocialLinksCard />
    </div>
  );
}

// ------------------------------------------------------------------ Profile + alerts
function ProfileCard({ readOnly }: { readOnly: boolean }) {
  const router = useRouter();
  const { notify } = usePortal();
  const me = useMe();
  const business = useOverview(30).data?.business ?? "";
  const saveMe = useUpdateMe();
  const prefs = useMyNotifications();
  const savePrefs = useSetMyNotifications();
  const signOut = useSignOut();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [alerts, setAlerts] = useState<Record<string, boolean> | null>(null);

  const user = me.data;
  const profile: ProfileDraft = draft ?? {
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    title: user?.title ?? "",
    timezone: user?.timezone ?? "",
  };
  const alertValues = alerts ?? ((prefs.data?.prefs ?? {}) as Record<string, boolean>);
  const api = fieldErrors(saveMe.error);
  // In "View as client" the signed-in user is a staff member: their own profile isn't shown here.
  const showProfile = !!user && !user.isStaff;

  const save = async () => {
    try {
      if (draft) await saveMe.mutateAsync({ ...draft, phone: draft.phone.trim() });
      if (alerts) await savePrefs.mutateAsync(alerts);
      setDraft(null);
      setAlerts(null);
      notify("Your account details were saved.");
    } catch {
      // The error shows under the form.
    }
  };

  const zones = TIME_ZONES.some((z) => z.value === profile.timezone) || !profile.timezone ? TIME_ZONES : [{ value: profile.timezone, label: profile.timezone }, ...TIME_ZONES];

  return (
    <section className="card account-profile">
      <span className="kicker">PROFILE</span>
      <LoadState query={me}>
        {showProfile ? (
          <div className="form-grid">
            <Field label="Full name" htmlFor="acct-name" error={api.fullName}>
              <Input
                id="acct-name"
                autoComplete="name"
                value={profile.fullName}
                readOnly={readOnly}
                onChange={(e) => setDraft({ ...profile, fullName: e.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="acct-email" hint="Changing your login email is coming soon.">
              <Input id="acct-email" type="email" value={user.email} readOnly aria-readonly="true" />
            </Field>
            <Field label="Phone" htmlFor="acct-phone" error={api.phone}>
              <Input
                id="acct-phone"
                type="tel"
                autoComplete="tel"
                value={profile.phone}
                readOnly={readOnly}
                onChange={(e) => setDraft({ ...profile, phone: e.target.value })}
              />
            </Field>
            <Field label="Job title" htmlFor="acct-title">
              <Input id="acct-title" value={profile.title} readOnly={readOnly} onChange={(e) => setDraft({ ...profile, title: e.target.value })} />
            </Field>
            <Field label="Time zone" htmlFor="acct-tz">
              <Select
                id="acct-tz"
                value={profile.timezone}
                options={zones}
                disabled={readOnly}
                onChange={(e) => setDraft({ ...profile, timezone: e.target.value })}
              />
            </Field>
            <Field label="Business name" htmlFor="acct-biz" hint="Ask your GoCWGL team to change this.">
              <Input id="acct-biz" value={business} readOnly aria-readonly="true" />
            </Field>
          </div>
        ) : (
          <p className="text-muted">Viewing {business || "this client"}’s portal. Their profile is private.</p>
        )}
      </LoadState>

      {showProfile && (
        <>
          <span className="kicker">ALERTS</span>
          <div>
            {ALERT_OPTIONS.map((a) => (
              <div className="list-row list-row--nowrap" key={a.key}>
                <div className="stack stack--2 u-grow">
                  <span className="u-strong">
                    {a.label} {a.key === "lead" && <SoonNote>Coming soon</SoonNote>}
                  </span>
                  <span className="text-small">
                    {a.key === "lead" ? "Your choice is saved; new-lead emails start once lead syncing is switched on." : a.desc}
                  </span>
                </div>
                <Toggle
                  label={a.label}
                  checked={alertValues[a.key] ?? true}
                  onChange={(on) => !readOnly && setAlerts({ ...alertValues, [a.key]: on })}
                />
              </div>
            ))}
          </div>
          <FormError error={saveMe.error && !Object.keys(api).length ? saveMe.error : savePrefs.error} />
          <div className="cluster cluster--end">
            <Button variant="danger" onClick={() => signOut.mutate(undefined, { onSettled: () => router.replace("/login") })} disabled={signOut.isPending}>
              Sign out
            </Button>
            {!readOnly && (
              <Button variant="primary" onClick={save} disabled={(!draft && !alerts) || saveMe.isPending || savePrefs.isPending}>
                {saveMe.isPending || savePrefs.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ Portal team
function TeamCard() {
  const { notify, isOwner } = usePortal();
  const me = useMe().data;
  const team = usePortalTeam();
  const invite = useInvitePortalMember();
  const cancel = useCancelPortalInvitation();
  const remove = useRemovePortalMember();
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState<"owner" | "viewer">("viewer");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!isEmail(email)) return;
    invite.mutate(
      { email, fullName: "", role },
      {
        onSuccess: () => {
          setInviteEmail("");
          notify(`Invite sent to ${email}.`);
        },
      },
    );
  };

  return (
    <section className="card">
      <span className="kicker">PEOPLE WITH PORTAL ACCESS</span>
      <FormError error={cancel.error ?? remove.error} />
      <LoadState query={team}>
        <div>
          {team.data?.members.map((m) => (
            <div className="list-row list-row--nowrap" key={m.id}>
              <Avatar name={m.fullName || m.email} tone={avatarTone(m.id)} />
              <div className="stack stack--2 u-grow">
                <span className="text-strong">
                  {m.fullName || m.email}
                  {m.id === me?.id && " (you)"}
                </span>
                <span className="text-small">{m.email}</span>
              </div>
              <span className="kicker kicker--sm kicker--muted">{m.portalRole === "owner" ? "Owner" : "Viewer"}</span>
              {isOwner && m.id !== me?.id && (
                <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(m.id)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {team.data?.invitations.map((inv) => (
            <div className="list-row list-row--nowrap" key={inv.id}>
              <Avatar name={inv.fullName || inv.email} tone="neutral" />
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{inv.fullName || inv.email}</span>
                <span className="text-small">{inv.email}</span>
              </div>
              <span className="kicker kicker--sm kicker--muted">Invited</span>
              {isOwner && (
                <Button size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(inv.id)}>
                  Cancel
                </Button>
              )}
            </div>
          ))}
        </div>
      </LoadState>
      {isOwner && (
        <form className="cluster cluster--8 cluster--nowrap" onSubmit={submit}>
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
          <Select
            size="sm"
            aria-label="Their access"
            className="input--auto"
            value={role}
            options={[
              { value: "viewer", label: "Can view" },
              { value: "owner", label: "Owner" },
            ]}
            onChange={(e) => setRole(e.target.value as "owner" | "viewer")}
          />
          <Button type="submit" variant="accent" disabled={invite.isPending}>
            Invite
          </Button>
        </form>
      )}
      {invite.error ? <FormError error={invite.error} /> : null}
    </section>
  );
}
