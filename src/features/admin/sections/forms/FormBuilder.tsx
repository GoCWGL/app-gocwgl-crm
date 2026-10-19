"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, Field, Icon, IconButton, IconTile, Input, SegmentedControl, Select, Textarea } from "@/components/ui";
import { FIELD_TYPES, type FieldType, type FormField, type LeadForm } from "@/data/admin";
import { moveItem } from "@/lib/utils";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useTags } from "@/utils/hooks/useContacts";
import { useCreateForm, useUpdateForm } from "@/utils/hooks/useForms";
import { draftToForm, newFieldId } from "@/utils/mappers/forms";
import { embedCode } from "../../lib/forms";
import { useAdmin } from "../../state/AdminContext";

type FormBuilderProps = {
  draft: LeadForm;
  onChange: (draft: LeadForm) => void;
  onClose: () => void;
};

/** Three columns: field palette · field settings · live preview. */
export function FormBuilder({ draft, onChange, onClose }: FormBuilderProps) {
  const { notify } = useAdmin();
  const tags = useTags().data ?? [];
  const create = useCreateForm();
  const update = useUpdateForm();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (patch: Partial<LeadForm>) => {
    onChange({ ...draft, ...patch });
    setError("");
    setSubmitted(false);
  };
  const setFields = (fields: FormField[]) => set({ fields });
  const patchField = (i: number, patch: Partial<FormField>) => setFields(draft.fields.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const mode = draft.thanksMode === "redirect" ? "redirect" : "message";

  const addField = (type: FieldType) =>
    setFields([
      ...draft.fields,
      {
        id: newFieldId(),
        type,
        label: type === "checkbox" ? "I agree" : FIELD_TYPES[type].label,
        ph: "",
        req: false,
        opts: type === "select" ? "Option 1, Option 2, Option 3" : "",
      },
    ]);

  const addCustomField = () => {
    const n = draft.fields.filter((f) => f.custom).length + 1;
    setFields([...draft.fields, { id: newFieldId(), type: "text", label: `Custom question ${n}`, ph: "", req: false, opts: "", custom: true, key: `custom_field_${n}` }]);
  };

  const save = () => {
    if (!draft.name.trim()) return setError("Give your form a name before saving.");
    if (!draft.fields.length) return setError("Add at least one field.");
    if (!draft.fields.some((f) => f.type === "email")) return setError("A form needs an Email field so each submission becomes a contact.");
    const body = draftToForm(draft);
    const opts = {
      onSuccess: () => {
        notify(`${body.name} was saved.`);
        onClose();
      },
      onError: (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err)),
    };
    if (draft.id) update.mutate({ id: draft.id, body }, opts);
    else create.mutate(body, opts);
  };

  const previewSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="page-stack">
      <div className="toolbar toolbar--card">
        <Button variant="soft" onClick={onClose}>
          <Icon name="arrowLeft" size={14} strokeWidth={2.4} />
          All forms
        </Button>
        <label className="sr-only" htmlFor="fm-name">
          Form name
        </label>
        <input id="fm-name" className="title-input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name your form" />
        <Button variant="primary" onClick={save} disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending ? "Saving…" : "Save form"}
        </Button>
      </div>
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}

      <div className="builder">
        {/* Palette */}
        <section className="card card--tight builder__palette">
          <span className="kicker">ADD A FIELD</span>
          {(Object.keys(FIELD_TYPES) as FieldType[]).map((type) => (
            <button key={type} type="button" className="palette-item" onClick={() => addField(type)}>
              <IconTile tone="cyan" size="xs">
                <Icon name={FIELD_TYPES[type].icon} size={14} />
              </IconTile>
              {FIELD_TYPES[type].label}
              <span className="palette-item__plus" aria-hidden="true">
                +
              </span>
            </button>
          ))}
          <hr className="divider" />
          <span className="kicker kicker--violet">CUSTOM</span>
          <button type="button" className="palette-item palette-item--custom" onClick={addCustomField}>
            <IconTile tone="purple" size="xs">
              <Icon name="sparkle" size={14} />
            </IconTile>
            Custom field
            <span className="palette-item__plus" aria-hidden="true">
              +
            </span>
          </button>
          <span className="text-small">Ask anything else and save the answer to the contact, like company size or how they heard about you.</span>
        </section>

        {/* Field settings */}
        <section className="stack stack--12 builder__fields">
          <span className="kicker">FIELDS · {draft.fields.length}</span>
          {draft.fields.map((f, i) => {
            const type = FIELD_TYPES[f.type];
            const hasPlaceholder = !["select", "checkbox", "date"].includes(f.type);
            return (
              <div className="card card--tight field-editor" key={f.id}>
                <div className="cluster cluster--nowrap">
                  <IconTile tone="cyan" size="sm">
                    <Icon name={type.icon} size={15} />
                  </IconTile>
                  <span className="kicker kicker--muted u-grow cluster cluster--8">
                    {type.label.toUpperCase()}
                    {f.custom && (
                      <Badge tone="purple" mono size="xs">
                        CUSTOM
                      </Badge>
                    )}
                  </span>
                  <IconButton label="Move field up" disabled={i === 0} onClick={() => setFields(moveItem(draft.fields, i, i - 1))}>
                    <Icon name="chevronUp" size={12} strokeWidth={2.4} />
                  </IconButton>
                  <IconButton label="Move field down" disabled={i === draft.fields.length - 1} onClick={() => setFields(moveItem(draft.fields, i, i + 1))}>
                    <Icon name="chevronDown" size={12} strokeWidth={2.4} />
                  </IconButton>
                  <IconButton label="Delete field" danger onClick={() => setFields(draft.fields.filter((_, k) => k !== i))}>
                    <Icon name="trash" size={12} />
                  </IconButton>
                </div>
                <div className="form-grid form-grid--narrow">
                  <Field label="Label">
                    <Input size="sm" aria-label="Field label" value={f.label} onChange={(e) => patchField(i, { label: e.target.value })} />
                  </Field>
                  {hasPlaceholder && (
                    <Field label="Placeholder">
                      <Input size="sm" aria-label="Field placeholder" value={f.ph} onChange={(e) => patchField(i, { ph: e.target.value })} />
                    </Field>
                  )}
                  {f.type === "select" && (
                    <Field label="Choices (separate with commas)">
                      <Input size="sm" aria-label="Dropdown choices" value={f.opts} onChange={(e) => patchField(i, { opts: e.target.value })} />
                    </Field>
                  )}
                </div>
                {f.custom && (
                  <div className="form-grid form-grid--narrow custom-field">
                    <Field label="Answer type">
                      <Select
                        size="sm"
                        aria-label="Answer type"
                        value={f.type}
                        options={(Object.keys(FIELD_TYPES) as FieldType[]).map((k) => ({ value: k, label: FIELD_TYPES[k].label }))}
                        onChange={(e) => patchField(i, { type: e.target.value as FieldType })}
                      />
                    </Field>
                    <Field label="Save to contact as">
                      <Input
                        size="sm"
                        mono
                        aria-label="Contact field key"
                        placeholder="e.g. company_size"
                        value={f.key ?? ""}
                        onChange={(e) => patchField(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() })}
                      />
                    </Field>
                  </div>
                )}
                <Checkbox label="Required field" checked={f.req} onChange={() => patchField(i, { req: !f.req })} />
              </div>
            );
          })}
          {draft.fields.length === 0 && <div className="empty-state">Add your first field from the left.</div>}

          <div className="card card--tight">
            <span className="kicker">AFTER SUBMIT</span>
            <div className="form-grid form-grid--narrow">
              <Field label="Button text" htmlFor="fm-btn">
                <Input id="fm-btn" size="sm" value={draft.button} onChange={(e) => set({ button: e.target.value })} />
              </Field>
              <Field label="Add to pipeline stage" htmlFor="fm-stage">
                <Select id="fm-stage" size="sm" value={draft.stage} onChange={(e) => set({ stage: e.target.value as LeadForm["stage"] })}>
                  <option value="lead">New lead</option>
                  <option value="booked">Call booked</option>
                  <option value="paid">Paid subscriber</option>
                </Select>
              </Field>
              <Field label="Add tag" htmlFor="fm-tag">
                <Select
                  id="fm-tag"
                  size="sm"
                  value={draft.tag}
                  placeholder="No tag"
                  options={tags.map((t) => ({ value: t.id, label: t.name }))}
                  onChange={(e) => set({ tag: e.target.value })}
                />
              </Field>
            </div>
            <Field label="After someone submits, show">
              <SegmentedControl
                variant="soft"
                size="sm"
                label="Thank-you type"
                value={mode}
                onChange={(m) => set({ thanksMode: m })}
                options={[
                  { value: "message", label: "Thank-you message" },
                  { value: "redirect", label: "Redirect to my page" },
                ]}
              />
            </Field>
            {mode === "message" ? (
              <Field label="Thank-you message" htmlFor="fm-success">
                <Input id="fm-success" size="sm" value={draft.success} onChange={(e) => set({ success: e.target.value })} />
              </Field>
            ) : (
              <Field label="Send visitors to this page (URL)" htmlFor="ty-url" hint="Use this if you already have your own thank-you page.">
                <Input
                  id="ty-url"
                  size="sm"
                  type="url"
                  placeholder="https://yourdomain.com/thank-you"
                  value={draft.redirectUrl ?? ""}
                  onChange={(e) => set({ redirectUrl: e.target.value })}
                />
              </Field>
            )}
            <Field label="Embed code for your landing page">
              <code className="code-block">{draft.id ? embedCode(draft.id) : "Save the form to get its embed code."}</code>
            </Field>
          </div>
        </section>

        {/* Live preview */}
        <section className="stack stack--10 builder__preview" aria-label="Form preview">
          <span className="kicker">LIVE PREVIEW</span>
          <form className="card form-preview" onSubmit={previewSubmit}>
            <h3 className="modal__title">{draft.name || "Untitled form"}</h3>
            {submitted && mode === "message" && (
              <div className="notice notice--success u-strong" role="status">
                {draft.success}
              </div>
            )}
            {submitted && mode === "redirect" && (
              <div className="notice notice--info u-strong" role="status">
                Visitor is now sent to {draft.redirectUrl || "your thank-you page (add the URL)"}
              </div>
            )}
            {draft.fields.map((f) => (
              <PreviewField key={f.id} field={f} />
            ))}
            <Button type="submit" variant="primary" size="lg" block>
              {draft.button}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function PreviewField({ field: f }: { field: FormField }) {
  const id = `pv-${f.id}`;
  const html = FIELD_TYPES[f.type].html;

  if (f.type === "checkbox") return <Checkbox label={f.label} />;

  return (
    <Field label={f.label} htmlFor={id} required={f.req} strongLabel>
      {f.type === "textarea" ? (
        <Textarea id={id} rows={3} placeholder={f.ph} />
      ) : f.type === "select" ? (
        <Select
          id={id}
          placeholder="Choose…"
          options={f.opts
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)}
        />
      ) : (
        <Input id={id} type={html || "text"} placeholder={f.ph} />
      )}
    </Field>
  );
}
