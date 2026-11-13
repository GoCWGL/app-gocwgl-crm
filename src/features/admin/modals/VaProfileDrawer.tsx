"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, Icon, Input, Loading, Modal, Select, Textarea } from "@/components/ui";
import { zoneOptions } from "@/features/booking/zones";
import { avatarTone } from "@/lib/tones";
import type { VaDetailOut, VaStatus, VaUpdate } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { fieldErrors } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useMe } from "@/utils/hooks/useUsers";
import { useInviteVa, useUpdateVa, useVa } from "@/utils/hooks/useVas";
import { LOGIN_STATUS, VA_STATUS, VA_STATUSES } from "../lib/vas";
import { CallInviteModal } from "./CallInviteModal";
import { useAdmin } from "../state/AdminContext";

type Draft = {
  fullName: string;
  phone: string;
  timezone: string;
  status: VaStatus;
  headline: string;
  skills: string;
  country: string;
  rate: string;
  startedOn: string;
  bio: string;
  experience: string;
  notes: string;
};

const toDraft = (va: VaDetailOut): Draft => ({
  fullName: va.fullName,
  phone: va.phone,
  timezone: va.timezone,
  status: va.status,
  headline: va.headline,
  skills: va.skills.join(", "),
  country: va.country,
  rate: va.hourlyRateCents == null ? "" : (va.hourlyRateCents / 100).toFixed(2),
  startedOn: va.startedOn ?? "",
  bio: va.bio,
  experience: va.experience,
  notes: va.notes,
});

/** People › VAs: a VA's profile in a drawer (view, and edit for staff who can change CRM data). */
export function VaProfileDrawer() {
  const { state, update } = useAdmin();
  const id = state.vaId;
  const va = useVa(id);
  if (!id) return null;
  const onClose = () => update({ vaId: "" });
  if (!va.data) {
    return (
      <Modal open variant="drawer" width={520} onClose={onClose} titleId="va-title" kicker="VA PROFILE" title="VA">
        {va.isError ? <FormError error={va.error} /> : <Loading text="Loading VA…" />}
      </Modal>
    );
  }
  return <VaProfileForm key={va.data.id} va={va.data} onClose={onClose} />;
}

function VaProfileForm({ va, onClose }: { va: VaDetailOut; onClose: () => void }) {
  const { update, notify } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const save = useUpdateVa();
  const invite = useInviteVa();
  const [interviewing, setInterviewing] = useState(false);
  const login = LOGIN_STATUS[va.loginStatus as keyof typeof LOGIN_STATUS] ?? LOGIN_STATUS.none;
  const [draft, setDraft] = useState<Draft>(() => toDraft(va));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const errors = fieldErrors(save.error);
  const status = VA_STATUS[va.status];
  const rateCents = draft.rate.trim() === "" ? null : Math.round(Number(draft.rate) * 100);
  const rateInvalid = rateCents !== null && (!Number.isFinite(rateCents) || rateCents < 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite || rateInvalid) return;
    const body: VaUpdate = {
      fullName: draft.fullName.trim() || va.fullName,
      phone: draft.phone.trim(),
      timezone: draft.timezone,
      status: draft.status,
      headline: draft.headline.trim(),
      skills: [...new Set(draft.skills.split(",").map((s) => s.trim()).filter(Boolean))],
      country: draft.country.trim(),
      hourlyRateCents: rateCents,
      startedOn: draft.startedOn || null,
      bio: draft.bio.trim(),
      experience: draft.experience.trim(),
      notes: draft.notes.trim(),
    };
    // A new status moves them to that tab of People › VAs; say where they went.
    const moved = draft.status !== va.status && va.isActive;
    save.mutate(
      { id: va.id, body },
      { onSuccess: () => notify(moved ? `${body.fullName} moved to ${VA_STATUS[draft.status].tab}.` : `${body.fullName}'s profile is saved.`) },
    );
  };

  return (
    <Modal
      open
      variant="drawer"
      width={520}
      onClose={onClose}
      onSubmit={submit}
      titleId="va-title"
      kicker="VA PROFILE"
      title={va.fullName}
      subtitle={`${va.email} · joined ${formatShort(va.createdAt)}`}
      media={<Avatar name={va.fullName} tone={avatarTone(va.id)} size="lg" ring />}
      footer={
        <>
          <Button onClick={() => update({ vaFullId: va.id, vaId: "", tab: "vas" })}>Open full profile</Button>
          <span className="u-spacer" />
          {canWrite ? (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={save.isPending || rateInvalid}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )}
        </>
      }
    >
      <div className="stack stack--14">
        <div className="cluster">
          <Badge tone={status.tone} dot>
            {va.isActive ? status.label : "Deactivated"}
          </Badge>
          <span className="text-small">
            {va.clientCount} client{va.clientCount === 1 ? "" : "s"} · last sign-in {va.lastLoginAt ? formatShort(va.lastLoginAt) : "never"}
          </span>
        </div>
        <div className="inset inset--soft cluster cluster--between">
          <span className="stack stack--2">
            <span className="text-strong">VA portal login</span>
            <span className="text-small">
              {va.loginStatus === "active"
                ? "They can sign in to the VA portal."
                : va.loginStatus === "invited"
                  ? "Invite sent. They haven’t set their password yet."
                  : "No login yet. Send an invite so they can choose a password."}
            </span>
          </span>
          <span className="cluster cluster--8">
            <Badge tone={login.tone} dot>
              {login.label}
            </Badge>
            {canWrite && va.isActive && va.loginStatus !== "active" && (
              <Button
                size="sm"
                variant="outline"
                disabled={invite.isPending}
                onClick={() => invite.mutate(va.id, { onSuccess: () => notify(`Invite sent to ${va.email}.`) })}
              >
                {invite.isPending ? "Sending…" : va.loginStatus === "invited" ? "Resend invite" : "Send invite"}
              </Button>
            )}
          </span>
        </div>
        {canWrite && va.isActive && va.status === "onboarding" && (
          <div className="inset inset--soft call-invite-box">
            <span className="call-invite-box__icon" aria-hidden="true">
              <Icon name="calendarCheck" size={16} />
            </span>
            <span className="stack stack--2 u-grow">
              <span className="text-strong">Interview</span>
              <span className="text-small">Send them a link to book an interview with your team.</span>
            </span>
            <Button size="sm" variant="primary" onClick={() => setInterviewing(true)}>
              Invite to an interview
            </Button>
          </div>
        )}
        {interviewing && (
          <CallInviteModal kind="interview" id={va.id} name={va.fullName} email={va.email} onClose={() => setInterviewing(false)} />
        )}
        <FormError error={save.error ?? invite.error} />
        {!canWrite && <span className="text-small">Your role can view but not change VAs.</span>}

        <fieldset className="stack stack--10" disabled={!canWrite}>
          <span className="kicker">PROFILE</span>
          <div className="form-grid form-grid--narrow">
            <Field label="Full name" htmlFor="va-name" error={errors.fullName}>
              <Input id="va-name" value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </Field>
            <Field label="Status" htmlFor="va-status">
              <Select id="va-status" value={draft.status} onChange={(e) => set({ status: e.target.value as VaStatus })}>
                {VA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {VA_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Phone" htmlFor="va-phone" error={errors.phone}>
              <Input id="va-phone" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Country" htmlFor="va-country">
              <Input id="va-country" value={draft.country} onChange={(e) => set({ country: e.target.value })} />
            </Field>
            <Field label="Time zone" htmlFor="va-tz">
              <Select id="va-tz" value={draft.timezone} options={zoneOptions([draft.timezone])} onChange={(e) => set({ timezone: e.target.value })} />
            </Field>
            <Field label="Hourly rate" htmlFor="va-rate" hint="What GoCWGL pays them." error={rateInvalid ? "Enter an amount, e.g. 8.50" : errors.hourlyRateCents}>
              <Input id="va-rate" inputMode="decimal" placeholder="0.00" value={draft.rate} onChange={(e) => set({ rate: e.target.value })} />
            </Field>
            <Field label="Started on" htmlFor="va-start">
              <Input id="va-start" type="date" value={draft.startedOn} onChange={(e) => set({ startedOn: e.target.value })} />
            </Field>
          </div>
          <Field label="Headline" htmlFor="va-headline" hint="What they do, in a few words.">
            <Input id="va-headline" placeholder="Inbox, calendar & customer support" value={draft.headline} onChange={(e) => set({ headline: e.target.value })} />
          </Field>
          <Field label="Skills" htmlFor="va-skills" hint="Separate with commas." error={errors.skills}>
            <Input id="va-skills" placeholder="Email, Scheduling, Canva" value={draft.skills} onChange={(e) => set({ skills: e.target.value })} />
          </Field>
          <Field label="Experience" htmlFor="va-experience" hint="Past roles, tools and industries.">
            <Textarea id="va-experience" rows={3} value={draft.experience} onChange={(e) => set({ experience: e.target.value })} />
          </Field>
          <Field label="About" htmlFor="va-bio">
            <Textarea id="va-bio" rows={4} value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
          </Field>
          <Field label="Team notes" htmlFor="va-notes" hint="Only your team sees these, never the VA.">
            <Textarea id="va-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </fieldset>
      </div>
    </Modal>
  );
}
