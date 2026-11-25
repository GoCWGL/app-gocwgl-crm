"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, ConfirmDialog, Field, FormError, Input, LoadState, Select, Textarea } from "@/components/ui";
import { UpdateBody } from "@/features/shareholder/UpdateBody";
import type { InvestorUpdateIn, InvestorUpdateOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { useInvestorUpdates, usePublishUpdate, useSaveRecord, useUnpublishUpdate } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { FormModal, RowActions, SectionCard } from "./shared";

/** Shareholders › Investor Updates & KPIs: write, publish and keep the archive. */
export function InvestorUpdatesSection() {
  const query = useInvestorUpdates();
  const { notify } = useAdmin();
  const [editing, setEditing] = useState<InvestorUpdateOut | "new" | null>(null);
  const updates = query.data ?? [];
  return (
    <div className="stack stack--16">
      <div className="cluster cluster--end">
        <Button variant="primary" aria-haspopup="dialog" onClick={() => setEditing("new")}>
          + Write an update
        </Button>
      </div>
      <LoadState query={query} isEmpty={!updates.length} empty="No updates yet. Write one each month or quarter; shareholders see it once you publish.">
        {updates.map((u) => (
          <UpdateCard key={u.id} update={u} onEdit={() => setEditing(u)} />
        ))}
      </LoadState>
      {editing && (
        <UpdateModal
          update={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            notify(m);
          }}
        />
      )}
    </div>
  );
}

function UpdateCard({ update: u, onEdit }: { update: InvestorUpdateOut; onEdit: () => void }) {
  const { notify } = useAdmin();
  const publish = usePublishUpdate();
  const unpublish = useUnpublishUpdate();
  const [asking, setAsking] = useState(false);
  const [withNumbers, setWithNumbers] = useState(true);
  return (
    <SectionCard
      kicker={`${u.cadence.toUpperCase()} · ${u.period.toUpperCase()}`}
      action={
        <span className="cluster">
          <Badge tone={u.publishedAt ? "green" : "amber"}>{u.publishedAt ? `Published ${formatLong(u.publishedAt)}` : "Draft"}</Badge>
          {u.publishedAt ? (
            <Button
              size="sm"
              variant="outline"
              disabled={unpublish.isPending}
              onClick={() => unpublish.mutate(u.id, { onSuccess: () => notify("Back to draft. Shareholders no longer see it.") })}
            >
              Unpublish
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => setAsking(true)}>
              Publish
            </Button>
          )}
          <RowActions kind="updates" id={u.id} name={u.title} onEdit={onEdit} />
        </span>
      }
    >
      <h3>{u.title}</h3>
      <FormError error={unpublish.error} />
      <UpdateBody update={u} />
      {asking && (
        <ConfirmDialog
          title="Publish this update?"
          icon="send"
          confirmLabel="Publish"
          pending={publish.isPending}
          error={publish.error}
          onClose={() => (setAsking(false), publish.reset())}
          onConfirm={() =>
            publish.mutate(
              { id: u.id, withNumbers },
              {
                onSuccess: () => {
                  setAsking(false);
                  notify("Published. Every shareholder with a login can read it.");
                },
              },
            )
          }
        >
          <div className="stack stack--10">
            <span>Every shareholder with a login will see it on their page. No email is sent.</span>
            <Checkbox label="Include MRR, ARR, cash, net burn and runway as they are today" checked={withNumbers} onChange={(e) => setWithNumbers(e.target.checked)} />
          </div>
        </ConfirmDialog>
      )}
    </SectionCard>
  );
}

const TEXTS: Array<{ key: "wins" | "challenges" | "roadmap" | "asks"; label: string; hint: string }> = [
  { key: "wins", label: "Key wins", hint: "What went well." },
  { key: "challenges", label: "Challenges and blockers", hint: "What’s hard right now." },
  { key: "roadmap", label: "Product roadmap", hint: "What shipped and what’s next." },
  { key: "asks", label: "Asks", hint: "Hiring, customer intros, partnerships." },
];

function UpdateModal({ update, onClose, onSaved }: { update?: InvestorUpdateOut; onClose: () => void; onSaved: (message: string) => void }) {
  const save = useSaveRecord("updates");
  const [d, setD] = useState<InvestorUpdateIn>({
    title: update?.title ?? "",
    cadence: (update?.cadence as InvestorUpdateIn["cadence"]) ?? "monthly",
    period: update?.period ?? "",
    wins: update?.wins ?? "",
    challenges: update?.challenges ?? "",
    roadmap: update?.roadmap ?? "",
    asks: update?.asks ?? "",
  });
  const [error, setError] = useState("");
  const set = (p: Partial<InvestorUpdateIn>) => setD((x) => ({ ...x, ...p }));
  const submit = () => {
    if (!d.title.trim() || !d.period.trim()) return setError("Enter a title and the period it covers.");
    save.mutate(
      { id: update?.id, body: { ...d, title: d.title.trim(), period: d.period.trim() } },
      { onSuccess: () => onSaved(update?.publishedAt ? "Update saved. Shareholders see the change." : "Draft saved. Publish it when it’s ready.") },
    );
  };
  return (
    <FormModal
      id="up-title"
      kicker="INVESTOR UPDATE"
      title={update ? "Edit update" : "Write an update"}
      subtitle={update?.publishedAt ? "This is published: shareholders see changes straight away." : undefined}
      width={720}
      submitLabel={update?.publishedAt ? "Save changes" : "Save draft"}
      mutation={save}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Title" htmlFor="up-name" required>
        <Input id="up-name" maxLength={160} value={d.title} placeholder="e.g. November: two new clients" onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="form-grid">
        <Field label="How often" htmlFor="up-cad">
          <Select
            id="up-cad"
            value={d.cadence}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
            ]}
            onChange={(e) => set({ cadence: e.target.value as InvestorUpdateIn["cadence"] })}
          />
        </Field>
        <Field label="Period" htmlFor="up-per" required>
          <Input id="up-per" maxLength={40} value={d.period} placeholder="e.g. Nov 2026 or Q4 2026" onChange={(e) => set({ period: e.target.value })} />
        </Field>
      </div>
      {TEXTS.map((t) => (
        <Field key={t.key} label={t.label} htmlFor={`up-${t.key}`} hint={t.hint}>
          <Textarea id={`up-${t.key}`} rows={4} maxLength={10000} value={d[t.key]} onChange={(e) => set({ [t.key]: e.target.value })} />
        </Field>
      ))}
    </FormModal>
  );
}
