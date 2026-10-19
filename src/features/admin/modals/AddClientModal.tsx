"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconTile, Input, Modal, PasswordInput, SegmentedControl, Select, Textarea } from "@/components/ui";
import { CORE_STAGES, LEAD_SOURCES, type CoreStage, type LeadSource } from "@/data/admin";
import { copyToClipboard, generatePassword, isEmail } from "@/lib/utils";
import { isStaffAdmin } from "@/utils/auth/session";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useCreateContact, usePipelines, useTags } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { TagPicker } from "../components/TagPicker";
import { getSalesStages } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

type Draft = {
  first: string;
  last: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  stage: CoreStage;
  tags: string[];
  notes: string;
};

const BLANK: Draft = { first: "", last: "", email: "", phone: "", company: "", source: "Manual entry", stage: "lead", tags: [], notes: "" };

/** How the new client gets into their portal. */
type Access = "invite" | "password" | "none";

const FIELDS: Array<{ key: keyof Pick<Draft, "first" | "last" | "email" | "phone" | "company">; label: string; type: string; placeholder: string; required?: boolean }> = [
  { key: "first", label: "First name", type: "text", placeholder: "Jane", required: true },
  { key: "last", label: "Last name", type: "text", placeholder: "Doe" },
  { key: "email", label: "Email", type: "email", placeholder: "jane@company.com", required: true },
  { key: "phone", label: "Phone", type: "tel", placeholder: "(555) 000-0000" },
  { key: "company", label: "Business name", type: "text", placeholder: "Optional" },
];

export function AddClientModal() {
  const { state, update } = useAdmin();
  if (!state.addClientOpen) return null;
  return <AddClientForm onClose={() => update({ addClientOpen: false })} />;
}

function AddClientForm({ onClose }: { onClose: () => void }) {
  const { update } = useAdmin();
  const stages = getSalesStages(usePipelines().data);
  const tags = useTags().data ?? [];
  const create = useCreateContact();
  const isAdmin = isStaffAdmin(useMe().data);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [access, setAccess] = useState<Access>("invite");
  const [password, setPassword] = useState("");
  const [notifyReady, setNotifyReady] = useState(true);
  const [copied, setCopied] = useState(false);
  const [openAfter, setOpenAfter] = useState(true);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
    if (create.isError) create.reset();
  };

  // The API checks for a duplicate email (409 duplicate_email).
  const duplicate = hasCode(create.error, "duplicate_email");
  const api = fieldErrors(create.error);
  const apiKey: Record<string, string> = { first: "firstName", last: "lastName", email: "email", phone: "phone", company: "company" };

  const invalid = (key: string) =>
    (tried && ((key === "first" && !draft.first.trim()) || (key === "email" && !isEmail(draft.email)))) ||
    (key === "email" && duplicate) ||
    !!api[apiKey[key]];
  const withPassword = access === "password";
  const sendWelcome = access === "invite" || (withPassword && notifyReady);

  const add = (another: boolean) => {
    const missing = [
      !draft.first.trim() && "first name",
      !isEmail(draft.email) && "a valid email",
      withPassword && !password && "a password",
    ].filter(Boolean);
    if (missing.length) {
      setTried(true);
      return setError(`Please add ${missing.join(" and ")}.`);
    }

    const name = `${draft.first.trim()} ${draft.last.trim()}`.trim();
    create.mutate(
      {
        firstName: draft.first.trim(),
        lastName: draft.last.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        company: draft.company.trim(),
        source: draft.source,
        stage: draft.stage,
        tagIds: draft.tags,
        notes: draft.notes.trim(),
        sendWelcome,
        ...(withPassword && { password }),
      },
      {
        onSuccess: () => {
          update({
            toast: withPassword
              ? `${name} was added and can sign in to their portal${sendWelcome ? " — we emailed them that it’s ready." : "."}`
              : `${name} was added${sendWelcome ? " and the Welcome email is on its way." : "."}`,
            addClientOpen: another,
            ...(!another && openAfter && { tab: "clients" as const, contactView: "all" as const }),
          });
          setDraft(BLANK);
          setPassword("");
          setCopied(false);
          setTried(false);
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
      titleId="ac-title"
      kicker="NEW CLIENT"
      title="Add a client"
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
            {create.isPending ? "Adding…" : "Add client"}
          </Button>
        </>
      }
    >
      <span className="kicker">01 · CONTACT DETAILS</span>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`ac-${f.key}`} required={f.required}>
            <Input
              id={`ac-${f.key}`}
              type={f.type}
              autoComplete="off"
              placeholder={f.placeholder}
              value={draft[f.key]}
              aria-invalid={invalid(f.key)}
              onChange={(e) => set({ [f.key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      {duplicate && (
        <div className="notice notice--warning u-strong" role="status">
          {errorMessage(create.error)}
        </div>
      )}

      <span className="kicker">02 · WHERE THEY ARE</span>
      <div className="form-grid">
        <Field label="Lead source" htmlFor="ac-source">
          <Select id="ac-source" value={draft.source} options={LEAD_SOURCES} onChange={(e) => set({ source: e.target.value as LeadSource })} />
        </Field>
        <Field label="Pipeline stage" htmlFor="ac-stage">
          <Select
            id="ac-stage"
            value={draft.stage}
            options={CORE_STAGES.map((st) => ({ value: st, label: stages[st].label }))}
            onChange={(e) => set({ stage: e.target.value as CoreStage })}
          />
        </Field>
      </div>
      <Field label="Tags">
        <TagPicker tags={tags} selected={draft.tags} onChange={(ids) => set({ tags: ids })} />
      </Field>
      <Field label="Notes" htmlFor="ac-notes">
        <Textarea id="ac-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering about this client" />
      </Field>

      <span className="kicker">03 · PORTAL LOGIN</span>
      <div className="inset inset--soft">
        <SegmentedControl<Access>
          kind="radio"
          variant="soft"
          size="sm"
          label="Portal login"
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
        {access === "invite" && <span className="text-tiny">We send the “Welcome” email with a link to choose their own password.</span>}
        {access === "none" && <span className="text-tiny">You can set a password or invite them later from their profile.</span>}
        {withPassword && (
          <>
            <Field label="Password" htmlFor="ac-password" required hint="They sign in with the email above. At least 8 characters.">
              <div className="portal-login__password">
                <PasswordInput
                  id="ac-password"
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
              label="Email them that their portal is ready (the password isn’t included)"
              checked={notifyReady}
              onChange={() => setNotifyReady(!notifyReady)}
            />
          </>
        )}
      </div>
      <div className="inset inset--soft">
        <Checkbox brand label="Open the Clients list after saving" checked={openAfter} onChange={() => setOpenAfter(!openAfter)} />
      </div>
      {error && !duplicate && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
