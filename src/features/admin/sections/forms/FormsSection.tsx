"use client";

import { useState } from "react";
import { Badge, Button, FormError, Icon, IconButton, IconTile, LoadState, StatGrid } from "@/components/ui";
import type { LeadForm } from "@/data/admin";
import { cn, copyToClipboard } from "@/lib/utils";
import { canWriteCrm } from "@/utils/auth/session";
import { useCreateForm, useDeleteForm, useForms, useUpdateForm } from "@/utils/hooks/useForms";
import { usePipelines, useTags } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { draftToForm, formToDraft, newFieldId } from "@/utils/mappers/forms";
import { getSalesStages, stageOf } from "../../lib/contacts";
import { embedCode } from "../../lib/forms";
import { FormBuilder } from "./FormBuilder";

const blankForm = (): LeadForm => ({
  id: "",
  name: "",
  on: true,
  subs: 0,
  button: "Submit",
  success: "Thanks! We will be in touch soon.",
  stage: "lead",
  tag: "",
  fields: [
    { id: newFieldId(), type: "text", label: "Full name", ph: "", req: true, opts: "" },
    { id: newFieldId(), type: "email", label: "Email", ph: "you@example.com", req: true, opts: "" },
  ],
});

export function FormsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = useForms();
  const tags = useTags().data ?? [];
  const stages = getSalesStages(usePipelines().data);
  const create = useCreateForm();
  const update = useUpdateForm();
  const remove = useDeleteForm();
  const [draft, setDraft] = useState<LeadForm | null>(null);
  const [copiedId, setCopiedId] = useState("");
  const forms = (query.data ?? []).map(formToDraft);

  if (draft) return <FormBuilder draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />;

  const onSubmitText = (f: LeadForm) => {
    const tag = tags.find((t) => t.id === f.tag);
    const parts = [`add to ${stageOf(stages, f.stage).label}`, tag ? `tag “${tag.name}”` : ""].filter(Boolean);
    return `${parts.join(" + ")} · then ${f.thanksMode === "redirect" ? "redirect to your page" : "show thank-you message"}`;
  };

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
        {canWrite && (
          <Button variant="primary" size="lg" onClick={() => setDraft(blankForm())}>
            <Icon name="plus" strokeWidth={2.4} />
            Create form
          </Button>
        )}
      </div>
      <FormError error={create.error ?? update.error ?? remove.error} />

      <LoadState query={query} isEmpty={!forms.length} empty="No forms yet. Create your first one.">
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
              {canWrite && (
                <Button size="sm" onClick={() => setDraft(structuredClone(f))}>
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyToClipboard(embedCode(f.id));
                  setCopiedId(f.id);
                }}
              >
                {copiedId === f.id ? "Embed code copied" : "Copy embed code"}
              </Button>
              {canWrite && (
                <>
                  <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: f.id, body: { isActive: !f.on } })}>
                    {f.on ? "Unpublish" : "Publish"}
                  </Button>
                  <span className="u-spacer" />
                  <IconButton
                    label={`Duplicate ${f.name}`}
                    size="lg"
                    disabled={create.isPending}
                    onClick={() => create.mutate(draftToForm({ ...f, name: `${f.name} (copy)`, on: false }))}
                  >
                    <Icon name="copy" size={14} />
                  </IconButton>
                  <IconButton label={`Delete ${f.name}`} size="lg" danger disabled={remove.isPending} onClick={() => remove.mutate(f.id)}>
                    <Icon name="trash" size={14} />
                  </IconButton>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      </LoadState>
    </div>
  );
}
