"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, Icon, IconButton, IconTile, Input, Select, Textarea } from "@/components/ui";
import { MERGE_FIELDS, TEMPLATE_KINDS, type EmailTemplate, type TemplateKind } from "@/data/admin";
import { cn, newId } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

/** Fill merge fields with a sample contact for the live preview. */
const fillDemo = (text: string) =>
  text.split("{first_name}").join("James").split("{last_name}").join("Carter").split("{email}").join("james.carter@example.com");

export function TemplatesView() {
  const { state, update } = useAdmin();
  const { templates } = state;
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState("");

  const edit = (patch: Partial<EmailTemplate>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setError("");
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) return setError("Give the template a name.");
    if (!draft.subject.trim() || !draft.body.trim()) return setError("Add a subject line and a message.");
    const saved = { ...draft, name: draft.name.trim() };
    update((s) => ({
      templates: draft.id
        ? s.templates.map((t) => (t.id === draft.id ? saved : t))
        : [...s.templates, { ...saved, id: newId(), starter: false }],
    }));
    setDraft(null);
  };

  return (
    <div className="card-row">
      <section className="stack stack--12 template-list" aria-label="Email templates">
        <div className="cluster cluster--between">
          <span className="kicker">TEMPLATES · {templates.length}</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setDraft({ id: 0, kind: "other", name: "", subject: "", body: "Hi {first_name},\n\n\n\nBest,\n[Your Name]" });
              setError("");
            }}
          >
            + New template
          </Button>
        </div>
        {templates.map((t) => {
          const kind = TEMPLATE_KINDS[t.kind] ?? TEMPLATE_KINDS.other;
          return (
            <article key={t.id} className={cn("card card--tight template-card", draft?.id === t.id && "card--active")}>
              <div className="cluster cluster--nowrap">
                <IconTile tone={kind.tone} size="md">
                  <Icon name={kind.icon} strokeWidth={1.9} />
                </IconTile>
                <div className="stack stack--2 u-grow">
                  <span className="text-strong">{t.name}</span>
                  <span className="text-small u-truncate">{t.subject}</span>
                </div>
                {t.starter && (
                  <Badge tone="cyan" mono size="xs">
                    STARTER
                  </Badge>
                )}
              </div>
              <span className="text-small u-truncate">{t.body.replace(/\n+/g, " ")}</span>
              <div className="cluster cluster--6">
                <Button size="sm" onClick={() => setDraft({ ...t })}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => update((s) => ({ emailView: "compose", composer: { ...s.composer, subject: t.subject, body: t.body } }))}
                >
                  Use in new email
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    update((s) => ({ templates: [...s.templates, { ...t, id: newId(), name: `${t.name} (copy)`, starter: false }] }))
                  }
                >
                  Duplicate
                </Button>
                {!t.starter && (
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`Delete template ${t.name}`}
                    onClick={() => {
                      update((s) => ({ templates: s.templates.filter((x) => x.id !== t.id) }));
                      if (draft?.id === t.id) setDraft(null);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {draft ? (
        <form className="card card--glow template-editor" onSubmit={save}>
          <div className="cluster cluster--nowrap">
            <span className="kicker u-grow">{draft.id ? "EDIT TEMPLATE" : "NEW TEMPLATE"}</span>
            <IconButton label="Close editor" size="lg" onClick={() => setDraft(null)}>
              ×
            </IconButton>
          </div>
          <div className="form-grid">
            <Field label="Template name" htmlFor="tpl-name">
              <Input id="tpl-name" className="u-strong" value={draft.name} onChange={(e) => edit({ name: e.target.value })} placeholder="e.g. Proposal sent" />
            </Field>
            <Field label="Type" htmlFor="tpl-kind">
              <Select
                id="tpl-kind"
                value={draft.kind}
                options={(Object.keys(TEMPLATE_KINDS) as TemplateKind[]).map((k) => ({ value: k, label: TEMPLATE_KINDS[k].label }))}
                onChange={(e) => edit({ kind: e.target.value as TemplateKind })}
              />
            </Field>
          </div>
          <Field label="Subject line" htmlFor="tpl-subj">
            <Input id="tpl-subj" value={draft.subject} onChange={(e) => edit({ subject: e.target.value })} />
          </Field>
          <div className="field field--gap-6">
            <div className="cluster cluster--between">
              <label className="field__label" htmlFor="tpl-body">
                Message
              </label>
              <div className="cluster cluster--6">
                <span className="text-small">Insert:</span>
                {MERGE_FIELDS.map((f) => (
                  <button key={f.value} type="button" className="insert-chip insert-chip--mono" onClick={() => edit({ body: draft.body + f.value })}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea id="tpl-body" rows={10} value={draft.body} onChange={(e) => edit({ body: e.target.value })} />
          </div>
          <div className="inset inset--soft">
            <span className="kicker">PREVIEW · AS JAMES SEES IT</span>
            <span className="text-strong">{fillDemo(draft.subject) || "(no subject)"}</span>
            <p className="text-body u-pre-line">{fillDemo(draft.body)}</p>
          </div>
          {error && (
            <p className="text-error" role="alert">
              {error}
            </p>
          )}
          <div className="cluster cluster--end">
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="submit" variant="primary">
              Save template
            </Button>
          </div>
        </form>
      ) : (
        <section className="empty-state template-editor template-editor--idle">
          Pick a template to edit it, or create a new one. Saved templates show up in the email composer and in Automation
          “Send email” steps.
        </section>
      )}
    </div>
  );
}
