"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import { LEAD_SOURCES, type LeadSource } from "@/data/admin";
import { isEmail } from "@/lib/utils";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useAddLead, useTags } from "@/utils/hooks/useContacts";
import { TagPicker } from "../components/TagPicker";
import { useAdmin } from "../state/AdminContext";

type Draft = { first: string; last: string; email: string; phone: string; company: string; source: LeadSource; tags: string[]; notes: string };

const BLANK: Draft = { first: "", last: "", email: "", phone: "", company: "", source: "Manual entry", tags: [], notes: "" };

const FIELDS: Array<{ key: "first" | "last" | "email" | "phone" | "company"; label: string; type: string; placeholder: string; required?: boolean }> = [
  { key: "first", label: "First name", type: "text", placeholder: "Jane", required: true },
  { key: "last", label: "Last name", type: "text", placeholder: "Doe" },
  { key: "email", label: "Email", type: "email", placeholder: "jane@company.com", required: true },
  { key: "phone", label: "Phone", type: "tel", placeholder: "(555) 000-0000" },
  { key: "company", label: "Business name", type: "text", placeholder: "Optional" },
];

/** People › Leads › Add a lead: someone to follow up with, listed on Leads before they book a call. */
export function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { notify } = useAdmin();
  const tags = useTags().data ?? [];
  const create = useAddLead();
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
    if (create.isError) create.reset();
  };

  const duplicate = hasCode(create.error, "duplicate_email");
  const api = fieldErrors(create.error);
  const apiKey: Record<string, string> = { first: "firstName", last: "lastName", email: "email", phone: "phone", company: "company" };
  const invalid = (key: string) =>
    (tried && ((key === "first" && !draft.first.trim()) || (key === "email" && !isEmail(draft.email)))) ||
    (key === "email" && duplicate) ||
    !!api[apiKey[key]];

  const add = (another: boolean) => {
    const missing = [!draft.first.trim() && "first name", !isEmail(draft.email) && "a valid email"].filter(Boolean);
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
        notes: draft.notes.trim(),
        tagIds: draft.tags,
      },
      {
        onSuccess: () => {
          notify(`${name} was added to your leads.`);
          setDraft(BLANK);
          setTried(false);
          if (!another) onClose();
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
      titleId="al-title"
      kicker="NEW LEAD"
      title="Add a lead"
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
            {create.isPending ? "Adding…" : "Add lead"}
          </Button>
        </>
      }
    >
      <span className="kicker">01 · CONTACT DETAILS</span>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`al-${f.key}`} required={f.required}>
            <Input
              id={`al-${f.key}`}
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

      <span className="kicker">02 · MORE ABOUT THEM</span>
      <Field label="Lead source" htmlFor="al-source">
        <Select id="al-source" value={draft.source} options={LEAD_SOURCES} onChange={(e) => set({ source: e.target.value as LeadSource })} />
      </Field>
      <Field label="Tags">
        <TagPicker tags={tags} selected={draft.tags} onChange={(ids) => set({ tags: ids })} />
      </Field>
      <Field label="Notes" htmlFor="al-notes">
        <Textarea id="al-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Where you met them, what they need…" />
      </Field>
      {error && !duplicate && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
