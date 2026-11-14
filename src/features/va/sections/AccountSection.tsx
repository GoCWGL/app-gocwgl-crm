"use client";

import { useState } from "react";
import { Button, Field, FormError, Icon, Input, LoadState, Select } from "@/components/ui";
import { ProfilePhotoEditor } from "@/features/account/ProfilePhoto";
import { TIME_ZONES } from "@/data/admin";
import { SecuritySettings } from "@/features/admin/sections/settings/SecuritySettings";
import { useSignOutConfirm } from "@/features/auth/components/SignOutConfirm";
import type { User } from "@/utils/api/models";
import { fieldErrors } from "@/utils/errors";
import { useMe, useUpdateMe } from "@/utils/hooks/useUsers";

type Draft = { fullName: string; phone: string; timezone: string };
const draftOf = (u: User): Draft => ({ fullName: u.fullName, phone: u.phone ?? "", timezone: u.timezone });
const zones = (current: string) => (TIME_ZONES.some((z) => z.value === current) || !current ? TIME_ZONES : [{ value: current, label: current }, ...TIME_ZONES]);

/** VA portal › Profile & settings (from the name at the bottom of the menu): their details, password, devices, sign out. */
export function AccountSection() {
  const me = useMe();
  const user = me.data;
  const [message, setMessage] = useState("");

  return (
    <LoadState query={me} loadingText="Loading your account…">
      {user &&
        (user.isStaff ? (
          // Staff viewing the portal as a VA: these settings are the VA's own, not theirs to change here.
          <div className="card notice" role="status">
            You’re viewing the VA portal as a team member. A VA changes their own profile and password here; yours are in Admin › Settings.
          </div>
        ) : (
          <div className="va-account">
            {message && (
              <div className="notice notice--success u-strong" role="status">
                {message}
              </div>
            )}
            <ProfileCard key={`${user.fullName}|${user.phone}|${user.timezone}`} user={user} onSaved={() => setMessage("Your profile is saved.")} />
            <section className="card card--roomy va-account__card">
              <CardHead icon="lock" title="Password & security" note="Change your password, turn on 2-step verification and see where you're signed in." />
              <SecuritySettings onMessage={setMessage} />
            </section>
            <SignOutCard />
          </div>
        ))}
    </LoadState>
  );
}

function CardHead({ icon, title, note }: { icon: "user" | "lock" | "arrowLeft"; title: string; note: string }) {
  return (
    <header className="va-account__head">
      <span className="resume-section__icon" aria-hidden="true">
        <Icon name={icon} size={14} />
      </span>
      <span className="stack stack--2">
        <h3>{title}</h3>
        <span className="text-small">{note}</span>
      </span>
    </header>
  );
}

function ProfileCard({ user, onSaved }: { user: User; onSaved: () => void }) {
  const save = useUpdateMe();
  const [draft, setDraft] = useState<Draft>(() => draftOf(user));
  const [tried, setTried] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(user));
  const api = fieldErrors(save.error);
  const set = (p: Partial<Draft>) => {
    if (save.error) save.reset();
    setDraft((d) => ({ ...d, ...p }));
  };
  const nameError = tried && !draft.fullName.trim() ? "Enter your full name." : api.fullName;
  const phoneError = draft.phone && !/^[0-9+()\-.\s]*$/.test(draft.phone) ? "Use numbers, spaces and + ( ) - only." : api.phone;

  const submit = () => {
    setTried(true);
    if (!draft.fullName.trim() || phoneError) return;
    save.mutate({ fullName: draft.fullName.trim(), phone: draft.phone.trim(), timezone: draft.timezone }, { onSuccess: onSaved });
  };

  return (
    <section className="card card--roomy va-account__card">
      <CardHead icon="user" title="Profile" note="Your name and phone are also on your VA profile and resume." />
      <ProfilePhotoEditor name={draft.fullName || user.email} avatar={{ className: "settings-profile__avatar" }}>
        <span className="settings-profile__name">{draft.fullName || user.email}</span>
        <span className="text-muted">Virtual assistant · GoCWGL</span>
      </ProfilePhotoEditor>
      <div className="form-grid">
        <Field label="Full name" htmlFor="acc-name" required error={nameError}>
          <Input id="acc-name" autoComplete="name" maxLength={120} aria-invalid={nameError ? true : undefined} value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} />
        </Field>
        <Field label="Login email" htmlFor="acc-email" hint="Ask the GoCWGL team to change your login email.">
          <Input id="acc-email" type="email" value={user.email} readOnly aria-readonly="true" disabled />
        </Field>
        <Field label="Phone" htmlFor="acc-phone" error={phoneError}>
          <Input id="acc-phone" type="tel" autoComplete="tel" maxLength={40} aria-invalid={phoneError ? true : undefined} value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Time zone" htmlFor="acc-tz" error={api.timezone} hint="Used for your time tracker and schedules.">
          <Select id="acc-tz" value={draft.timezone} options={zones(draft.timezone)} onChange={(e) => set({ timezone: e.target.value })} />
        </Field>
      </div>
      <FormError error={save.error && !Object.keys(api).length ? save.error : null} />
      <div className="cluster cluster--end">
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => (setDraft(draftOf(user)), setTried(false), save.reset())}>
          Discard
        </Button>
        <Button variant="primary" disabled={!dirty || save.isPending} onClick={submit}>
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </section>
  );
}

function SignOutCard() {
  const signOut = useSignOutConfirm();
  return (
    <section className="card card--roomy va-account__card">
      <div className="cluster cluster--between">
        <CardHead icon="arrowLeft" title="Sign out" note="Sign out of the VA portal on this device." />
        <Button variant="danger" disabled={signOut.pending} onClick={signOut.ask}>
          {signOut.pending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
      {signOut.dialog}
    </section>
  );
}
