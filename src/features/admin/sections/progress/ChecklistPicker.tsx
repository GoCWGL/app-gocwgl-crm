"use client";

import { useState } from "react";
import { Button, ErrorState, FormError, Loading } from "@/components/ui";
import type { ChecklistAdd, ProjectTemplateOut } from "@/utils/api/models";
import { useAddProjectChecklist, useProjectTemplates } from "@/utils/hooks/useDelivery";

export type TemplateKey = ChecklistAdd["template"];

const taskCount = (t: ProjectTemplateOut) => t.phases.reduce((n, p) => n + p.tasks.length, 0);

/** Pick a build checklist: Foundation Build, Full Bundle or VIP Repeat funnel, Simple CRM or Custom CRM, with what each one covers. */
export function ChecklistOptions({
  value,
  onChange,
  only,
}: {
  value: TemplateKey;
  onChange: (key: TemplateKey) => void;
  /** Limit the choices (e.g. only the CRM checklists when adding to a build). */
  only?: TemplateKey[];
}) {
  const query = useProjectTemplates();
  if (query.isPending) return <Loading inline text="Loading checklists…" />;
  if (query.isError) return <ErrorState error={query.error} inline onRetry={query.refetch} />;
  const templates = query.data.filter((t) => !only || only.includes(t.key as TemplateKey));
  const picked = templates.find((t) => t.key === value);

  return (
    <div className="stack stack--10 checklist-options">
      <div className="option-grid" role="radiogroup" aria-label="Build checklist">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={value === t.key}
            className="option-card"
            onClick={() => onChange(t.key as TemplateKey)}
          >
            <span className="option-card__head">{t.name}</span>
            <span className="option-card__desc">
              {t.phases.length} phases · {taskCount(t)} tasks
            </span>
          </button>
        ))}
      </div>
      {picked && (
        <ol className="inset checklist-preview">
          {picked.phases.map((p) => (
            <li key={p.name}>
              <span className="text-strong">{p.name}</span>
              <span className="text-small">{p.tasks.join(" · ")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** On an existing build: add a checklist after the phases already there (a funnel client who buys a CRM or a VIP repeat funnel). */
export function AddChecklist({ projectId }: { projectId: string }) {
  const add = useAddProjectChecklist();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<TemplateKey>("crm_simple");

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="u-self-start" onClick={() => setOpen(true)}>
        + Add a checklist (CRM or VIP funnel)
      </Button>
    );
  }
  return (
    <div className="card stack stack--10">
      <span className="kicker">ADD A CHECKLIST</span>
      <span className="text-small">Its phases are added after the ones above, named “CRM · …” or “VIP funnel · …”. You can rename or remove them after.</span>
      <ChecklistOptions value={template} onChange={setTemplate} only={["vip", "crm_simple", "crm_custom"]} />
      <FormError error={add.error} />
      <div className="cluster cluster--8">
        <Button
          variant="primary"
          disabled={add.isPending}
          onClick={() => add.mutate({ projectId, template }, { onSuccess: () => setOpen(false) })}
        >
          {add.isPending ? "Adding…" : "Add to this build"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
