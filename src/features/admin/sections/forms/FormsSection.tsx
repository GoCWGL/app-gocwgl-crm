"use client";

import { useState } from "react";
import { Badge, Button, Icon, IconButton, IconTile, StatGrid } from "@/components/ui";
import type { LeadForm } from "@/data/admin";
import { cn, copyToClipboard, newId } from "@/lib/utils";
import { getSalesStages } from "../../lib/contacts";
import { embedCode } from "../../lib/forms";
import { useAdmin } from "../../state/AdminContext";
import { FormBuilder } from "./FormBuilder";

const blankForm = (): LeadForm => ({
  id: 0,
  name: "",
  on: true,
  subs: 0,
  button: "Submit",
  success: "Thanks! We will be in touch soon.",
  stage: "lead",
  tag: "",
  fields: [
    { id: newId(), type: "text", label: "Full name", ph: "", req: true, opts: "" },
    { id: newId() + 1, type: "email", label: "Email", ph: "you@example.com", req: true, opts: "" },
  ],
});

export function FormsSection() {
  const { state, update } = useAdmin();
  const { forms, tags } = state;
  const stages = getSalesStages(state.pipelines);
  const [draft, setDraft] = useState<LeadForm | null>(null);
  const [copiedId, setCopiedId] = useState(0);

  if (draft) return <FormBuilder draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />;

  const onSubmitText = (f: LeadForm) => {
    const tag = tags.find((t) => t.id === f.tag);
    const parts = [f.stage ? `add to ${stages[f.stage as keyof typeof stages]?.label}` : "", tag ? `tag “${tag.name}”` : ""].filter(Boolean);
    return `${parts.join(" + ") || "save contact"} · then ${f.thanksMode === "redirect" ? "redirect to your page" : "show thank-you message"}`;
  };

  const setForms = (fn: (list: LeadForm[]) => LeadForm[]) => update((s) => ({ forms: fn(s.forms) }));

  return (
    <div className="page-stack">
      <StatGrid
        plain
        items={[
          { label: "Forms", value: forms.length },
          { label: "Live forms", value: forms.filter((f) => f.on).length },
          { label: "Total submissions", value: forms.reduce((n, f) => n + f.subs, 0) },
        ]}
      />

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Your forms</h2>
          <span className="text-muted">Every submission becomes a contact in Clients and the Pipeline</span>
        </div>
        <Button variant="primary" size="lg" onClick={() => setDraft(blankForm())}>
          <Icon name="plus" strokeWidth={2.4} />
          Create form
        </Button>
      </div>

      <div className="tile-grid tile-grid--wide">
        {forms.map((f) => (
          <article key={f.id} className={cn("card form-card", !f.on && "form-card--off")}>
            <div className="cluster cluster--nowrap form-card__head">
              <IconTile tone="indigo" size="lg">
                <Icon name="form" size={18} strokeWidth={1.8} />
              </IconTile>
              <div className="stack stack--2 u-grow">
                <h3 className="card-title u-strong">{f.name}</h3>
                <span className="text-small">
                  {f.fields.length} fields · {f.subs} submissions
                </span>
              </div>
              <Badge tone={f.on ? "green" : "neutral"} mono>
                {f.on ? "LIVE" : "DRAFT"}
              </Badge>
            </div>
            <div className="inset inset--soft form-card__fields">
              {f.fields.map((x) => (
                <span key={x.id} className="form-card__field">
                  {x.custom ? "✦ " : ""}
                  {x.label}
                  {x.req ? " *" : ""}
                </span>
              ))}
            </div>
            <span className="text-small">
              On submit: <strong className="u-ink-soft">{onSubmitText(f)}</strong>
            </span>
            <div className="cluster cluster--8">
              <Button size="sm" onClick={() => setDraft(structuredClone(f))}>
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyToClipboard(embedCode(f.name));
                  setCopiedId(f.id);
                }}
              >
                {copiedId === f.id ? "Embed code copied" : "Copy embed code"}
              </Button>
              <Button size="sm" onClick={() => setForms((list) => list.map((x) => (x.id === f.id ? { ...x, on: !x.on } : x)))}>
                {f.on ? "Unpublish" : "Publish"}
              </Button>
              <span className="u-spacer" />
              <IconButton
                label={`Duplicate ${f.name}`}
                size="lg"
                onClick={() => setForms((list) => [...list, { ...structuredClone(f), id: newId(), name: `${f.name} (copy)`, subs: 0, on: false }])}
              >
                <Icon name="copy" size={14} />
              </IconButton>
              <IconButton label={`Delete ${f.name}`} size="lg" danger onClick={() => setForms((list) => list.filter((x) => x.id !== f.id))}>
                <Icon name="trash" size={14} />
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
