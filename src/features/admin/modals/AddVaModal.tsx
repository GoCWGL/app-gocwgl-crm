"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconTile, Input, Modal, PasswordInput, SegmentedControl, Select, Textarea } from "@/components/ui";
import { browserZone, zoneOptions } from "@/features/booking/zones";
import { copyToClipboard, generatePassword, isEmail } from "@/lib/utils";
import type { VaStatus } from "@/utils/api/models";
import { isStaffAdmin } from "@/utils/auth/session";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useMe } from "@/utils/hooks/useUsers";
import { useCreateVa } from "@/utils/hooks/useVas";
import { VA_STATUS, VA_STATUSES } from "../lib/vas";
import { useAdmin } from "../state/AdminContext";

type Draft = {
  first: string;
  last: string;
  email: string;
  phone: string;
  country: string;
  timezone: string;
  status: VaStatus;
  headline: string;
  experience: string;
  skills: string;
  rate: string;
  startedOn: string;
  notes: string;
};

const blank = (): Draft => ({
  first: "",
  last: "",
  email: "",
  phone: "",
  country: "",
  timezone: browserZone("America/New_York"),
  status: "onboarding",
  headline: "",
  experience: "",
  skills: "",
  rate: "",
  startedOn: "",
  notes: "",
});

/** How the new VA gets into the VA portal. */
type Access = "invite" | "password" | "none";

const FIELDS: Array<{ key: "first" | "last" | "email" | "phone" | "country"; label: string; type: string; placeholder: string; required?: boolean }> = [
  { key: "first", label: "First name", type: "text", placeholder: "Nia", required: true },
  { key: "last", label: "Last name", type: "text", placeholder: "Reyes" },
  { key: "email", label: "Email", type: "email", placeholder: "nia@email.com", required: true },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+63 917 000 0000" },
  { key: "country", label: "Country", type: "text", placeholder: "Philippines" },
];

/** People › VAs › Add a VA: the same shape as Add a client (details, experience, portal login). */
export function AddVaModal({ onClose }: { onClose: () => void }) {
  const { notify, update } = useAdmin();
  const create = useCreateVa();
  const isAdmin = isStaffAdmin(useMe().data);
  const [draft, setDraft] = useState<Draft>(blank);
  const [access, setAccess] = useState<Access>("invite");
  const [password, setPassword] = useState("");
  const [notifyReady, setNotifyReady] = useState(true);
  const [copied, setCopied] = useState(false);
  const [openAfter, setOpenAfter] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
    if (create.isError) create.reset();
  };

  const duplicate = hasCode(create.error, "email_taken");
  const api = fieldErrors(create.error);
  const apiKey: Record<string, string> = { first: "firstName", last: "lastName", email: "email", phone: "phone", country: "country" };
  const invalid = (key: string) =>
    (tried && ((key === "first" && !draft.first.trim()) || (key === "email" && !isEmail(draft.email)))) ||
    (key === "email" && duplicate) ||
    !!api[apiKey[key]];
  const withPassword = access === "password";
  const rateCents = draft.rate.trim() === "" ? null : Math.round(Number(draft.rate) * 100);
  const rateInvalid = rateCents !== null && (!Number.isFinite(rateCents) || rateCents < 0);

  const add = (another: boolean) => {
    const missing = [
      !draft.first.trim() && "first name",
      !isEmail(draft.email) && "a valid email",
      withPassword && !password && "a password",
    ].filter(Boolean);
    if (missing.length || rateInvalid) {
      setTried(true);
      return setError(missing.length ? `Please add ${missing.join(" and ")}.` : "Enter the hourly rate as an amount, e.g. 8.50");
    }

    const name = `${draft.first.trim()} ${draft.last.trim()}`.trim();
    create.mutate(
      {
        firstName: draft.first.trim(),
        lastName: draft.last.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        country: draft.country.trim(),
        timezone: draft.timezone,
        status: draft.status,
        headline: draft.headline.trim(),
        experience: draft.experience.trim(),
        skills: [...new Set(draft.skills.split(",").map((s) => s.trim()).filter(Boolean))],
        hourlyRateCents: rateCents,
        startedOn: draft.startedOn || null,
        notes: draft.notes.trim(),
        access,
        ...(withPassword && { password, notify: notifyReady }),
      },
      {
        onSuccess: (va) => {
          notify(
            access === "invite"
              ? `${name} was added and their invite is on its way.`
              : withPassword
                ? `${name} was added and can sign in to the VA portal${notifyReady ? " — we emailed them that it’s ready." : "."}`
                : `${name} was added. Invite them from their profile when you’re ready.`,
          );
          setDraft(blank());
          setPassword("");
          setCopied(false);
          setTried(false);
          if (!another) {
            onClose();
            if (openAfter) update({ vaFullId: va.id });
          }
        },
        onError: (err) => {
          const f = fieldErrors(err);
          setError(Object.keys(f).length ? Object.values(f)[0] : errorMessage(err));
        },
      },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="av-title"
      kicker="NEW VA"
      title="Add a VA"
      media={
        <IconTile brand size="lg">
          <Icon name="userPlus" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={() => add(true)} disabled={create.isPending}>
            Save &amp; add another
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add VA"}
          </Button>
        </>
      }
    >
      <span className="kicker">01 · CONTACT DETAILS</span>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`av-${f.key}`} required={f.required}>
            <Input
              id={`av-${f.key}`}
              type={f.type}
              autoComplete="off"
              placeholder={f.placeholder}
              value={draft[f.key]}
              aria-invalid={invalid(f.key)}
              onChange={(e) => set({ [f.key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="Time zone" htmlFor="av-tz">
          <Select id="av-tz" value={draft.timezone} options={zoneOptions([draft.timezone])} onChange={(e) => set({ timezone: e.target.value })} />
        </Field>
      </div>
      {duplicate && (
        <div className="notice notice--warning u-strong" role="status">
          {errorMessage(create.error)}
        </div>
      )}

      <span className="kicker">02 · EXPERIENCE &amp; SKILLS</span>
      <Field label="Headline" htmlFor="av-headline" hint="What they do, in a few words.">
        <Input id="av-headline" placeholder="Inbox, calendar & customer support" value={draft.headline} onChange={(e) => set({ headline: e.target.value })} />
      </Field>
      <Field label="Experience" htmlFor="av-experience">
        <Textarea
          id="av-experience"
          rows={3}
          placeholder="Past roles, tools and industries, e.g. 3 years supporting coaches with GoHighLevel and Canva"
          value={draft.experience}
          onChange={(e) => set({ experience: e.target.value })}
        />
      </Field>
      <Field label="Skills" htmlFor="av-skills" hint="Separate with commas.">
        <Input id="av-skills" placeholder="Email, Scheduling, Canva" value={draft.skills} onChange={(e) => set({ skills: e.target.value })} />
      </Field>
      <div className="form-grid">
        <Field label="Status" htmlFor="av-status">
          <Select id="av-status" value={draft.status} onChange={(e) => set({ status: e.target.value as VaStatus })}>
            {VA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VA_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hourly rate" htmlFor="av-rate" hint="What GoCWGL pays them.">
          <Input id="av-rate" inputMode="decimal" placeholder="0.00" value={draft.rate} aria-invalid={rateInvalid} onChange={(e) => set({ rate: e.target.value })} />
        </Field>
        <Field label="Start date" htmlFor="av-start">
          <Input id="av-start" type="date" value={draft.startedOn} onChange={(e) => set({ startedOn: e.target.value })} />
        </Field>
      </div>
      <Field label="Team notes" htmlFor="av-notes" hint="Only your team sees these, never the VA.">
        <Textarea id="av-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering about this VA" />
      </Field>

      <span className="kicker">03 · VA PORTAL LOGIN</span>
      <div className="inset inset--soft">
        <SegmentedControl<Access>
          kind="radio"
          variant="soft"
          size="sm"
          label="VA portal login"
          value={access}
          onChange={(v) => {
            setAccess(v);
            if (create.isError) create.reset();
          }}
          options={[
            { value: "invite", label: "Email an invite" },
            ...(isAdmin ? [{ value: "password" as const, label: "Set a password" }] : []),
            { value: "none", label: "Not now" },
          ]}
        />
        {access === "invite" && <span className="text-tiny">We email them a link to choose their own password.</span>}
        {access === "none" && <span className="text-tiny">You can invite them later from their profile.</span>}
        {withPassword && (
          <>
            <Field label="Password" htmlFor="av-password" required hint="They sign in with the email above. At least 8 characters.">
              <div className="portal-login__password">
                <PasswordInput
                  id="av-password"
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={(tried && !password) || !!api.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCopied(false);
                    setError("");
                    if (create.isError) create.reset();
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setPassword(generatePassword());
                    setCopied(false);
                    setError("");
                  }}
                >
                  Generate
                </Button>
                <Button
                  size="sm"
                  disabled={!password}
                  onClick={() => {
                    copyToClipboard(password);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </Field>
            <Checkbox
              brand
              label="Email them that their VA portal is ready (the password isn’t included)"
              checked={notifyReady}
              onChange={() => setNotifyReady(!notifyReady)}
            />
          </>
        )}
      </div>
      <div className="inset inset--soft">
        <Checkbox brand label="Open their full profile after saving" checked={openAfter} onChange={() => setOpenAfter(!openAfter)} />
      </div>
      {error && !duplicate && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
