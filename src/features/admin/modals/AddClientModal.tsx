"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import { LEAD_SOURCES, type CoreStage, type LeadSource } from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";
import { isEmail, newId } from "@/lib/utils";
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
  const { state, update } = useAdmin();
  const stages = getSalesStages(state.pipelines);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [openAfter, setOpenAfter] = useState(true);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  const duplicate = draft.email.trim()
    ? state.contacts.find((c) => c.email.toLowerCase() === draft.email.trim().toLowerCase())
    : undefined;

  const invalid = (key: string) =>
    tried && ((key === "first" && !draft.first.trim()) || (key === "email" && (!isEmail(draft.email) || !!duplicate)));

  const add = (another: boolean) => {
    const missing = [!draft.first.trim() && "first name", !isEmail(draft.email) && "a valid email"].filter(Boolean);
    if (missing.length) {
      setTried(true);
      return setError(`Please add ${missing.join(" and ")}.`);
    }
    if (duplicate) {
      setTried(true);
      return setError("A client with this email already exists.");
    }

    const id = Math.max(0, ...state.contacts.map((c) => c.id)) + 1;
    const name = `${draft.first.trim()} ${draft.last.trim()}`.trim();
    const welcome = state.templates.find((t) => t.kind === "welcome") ?? state.templates[0];

    update((s) => ({
      contacts: [
        { id, name, email: draft.email.trim(), phone: draft.phone.trim() || "—", source: draft.source, signed: TODAY_SHORT, stage: draft.stage, day: "", time: "", paidOn: draft.stage === "paid" ? TODAY_SHORT : "" },
        ...s.contacts,
      ],
      pipeOrder: [id, ...s.pipeOrder],
      contactTags: { ...s.contactTags, [id]: draft.tags.slice() },
      clientNotes: draft.notes.trim() ? { ...s.clientNotes, [id]: draft.notes.trim() } : s.clientNotes,
      ...(sendWelcome &&
        welcome && {
          sentEmails: [
            {
              id: newId(),
              to: name,
              cid: id,
              subject: welcome.subject.split("{first_name}").join(draft.first.trim()),
              preview: welcome.body.split("{first_name}").join(draft.first.trim()).replace(/\n+/g, " ").slice(0, 90),
              date: TODAY_SHORT,
              status: "Sent" as const,
            },
            ...s.sentEmails,
          ],
        }),
      toast: `${name} was added${sendWelcome ? " and sent the Welcome email." : "."}`,
      addClientOpen: another,
      ...(!another && openAfter && { tab: "clients" as const, contactView: "all" as const }),
    }));

    setDraft(BLANK);
    setTried(false);
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
          <Button variant="accent" onClick={() => add(true)}>
            Save &amp; add another
          </Button>
          <Button type="submit" variant="primary">
            Add client
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
          {duplicate.name} already uses this email ({stages[duplicate.stage].label}).
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
            options={state.pipelines[0].stages.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(e) => set({ stage: e.target.value as CoreStage })}
          />
        </Field>
      </div>
      <Field label="Tags">
        <TagPicker tags={state.tags} selected={draft.tags} onChange={(tags) => set({ tags })} />
      </Field>
      <Field label="Notes" htmlFor="ac-notes">
        <Textarea id="ac-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering about this client" />
      </Field>

      <span className="kicker">03 · NEXT STEP</span>
      <div className="inset inset--soft">
        <Checkbox brand label="Send the “Welcome” email now" checked={sendWelcome} onChange={() => setSendWelcome(!sendWelcome)} />
        <Checkbox brand label="Open the Clients list after saving" checked={openAfter} onChange={() => setOpenAfter(!openAfter)} />
      </div>
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
