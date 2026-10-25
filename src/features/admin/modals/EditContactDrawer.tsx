"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, FolderGlyph, FormError, Icon, Input, Loading, Modal, Select, Textarea } from "@/components/ui";
import { CORE_STAGES, LEAD_SOURCES, SOCIAL_LABELS, SOURCE_LABELS, type CoreStage, type LeadSource } from "@/data/admin";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn, copyToClipboard, isEmail } from "@/lib/utils";
import * as contactsApi from "@/utils/api/contacts";
import * as billingApi from "@/utils/api/billing";
import type { ContactOut, PipelineDetail } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { formatPerInterval } from "@/utils/format/money";
import { errorMessage, fieldErrors, hasCode } from "@/utils/errors";
import { useSubscriptions } from "@/utils/hooks/useBilling";
import {
  useArchiveContact,
  useContact,
  useCustomPipelineDetails,
  useDeleteContact,
  usePipelines,
  useTags,
  useUnarchiveContact,
} from "@/utils/hooks/useContacts";
import { useClientLinks, useMediaFolders } from "@/utils/hooks/useDelivery";
import { useApiMutation } from "@/utils/hooks/mutation";
import { qk } from "@/utils/hooks/keys";
import { useMe } from "@/utils/hooks/useUsers";
import { ClientEmbedsCard } from "../components/ClientEmbedsCard";
import { ContactAnswersCard } from "../components/ContactAnswersCard";
import { PortalLoginCard } from "../components/PortalLoginCard";
import { ReferredByContactCard } from "../components/ReferredByContactCard";
import { TagPicker } from "../components/TagPicker";
import { CONTACT_STATUS, contactName, contactStatus, getSalesStages, salesPipeline, subscriptionOf, type ContactStatus } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

type Draft = {
  first: string;
  last: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  stage: CoreStage;
  paused: boolean;
  tags: string[];
  notes: string;
  /** Stage id in each custom pipeline ("" = not in it). */
  other: Record<string, string>;
};

export function EditContactDrawer() {
  const { state, update } = useAdmin();
  const id = state.editContactId;
  const contact = useContact(id);
  const pipelines = useCustomPipelineDetails();
  if (!id) return null;
  const onClose = () => update({ editContactId: "" });
  if (!contact.data || pipelines.isPending) {
    return (
      <Modal open variant="drawer" width={520} onClose={onClose} titleId="ec-title" kicker="EDIT PROFILE" title="Contact">
        {contact.isError ? <FormError error={contact.error} /> : <Loading text="Loading contact…" />}
      </Modal>
    );
  }
  return <EditContactForm key={contact.data.id} contact={contact.data} pipelines={pipelines.data} onClose={onClose} />;
}

function stageInPipeline(p: PipelineDetail, contactId: string): string {
  return p.items?.find((i) => i.contactId === contactId)?.stageId ?? "";
}

function EditContactForm({ contact: c, pipelines, onClose }: { contact: ContactOut; pipelines: PipelineDetail[]; onClose: () => void }) {
  const { update, openMediaFolder } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const subs = useSubscriptions(c.id).data;
  const sub = subscriptionOf(subs, c.id);
  const allPipelines = usePipelines().data;
  const sales = salesPipeline(allPipelines);
  const stages = getSalesStages(allPipelines);
  const tags = useTags().data ?? [];
  const links = useClientLinks(c.id).data;
  const folder = useMediaFolders().data?.find((f) => f.contactId === c.id);
  const archive = useArchiveContact();
  const unarchive = useUnarchiveContact();
  const remove = useDeleteContact();

  const [draft, setDraft] = useState<Draft>({
    first: c.firstName,
    last: c.lastName,
    email: c.email,
    phone: c.phone,
    company: c.company,
    source: c.source,
    stage: (CORE_STAGES.includes(c.stage as CoreStage) ? c.stage : "lead") as CoreStage,
    paused: sub?.status === "Paused",
    tags: c.tags.map((t) => t.id),
    notes: c.notes,
    other: Object.fromEntries(pipelines.map((p) => [p.id, stageInPipeline(p, c.id)])),
  });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linksCopied, setLinksCopied] = useState(false);

  // One save = the contact itself, then the subscription pause and custom pipeline moves that changed.
  const save = useApiMutation(
    async (d: Draft) => {
      await contactsApi.updateContact(c.id, {
        firstName: d.first.trim(),
        lastName: d.last.trim(),
        email: d.email.trim(),
        phone: d.phone.trim(),
        company: d.company.trim(),
        source: d.source as LeadSource,
        stage: d.stage,
        notes: d.notes.trim(),
        tagIds: d.tags,
      });
      const wasPaused = sub?.status === "Paused";
      if (sub && d.paused !== wasPaused) {
        await billingApi.updateSubscription(sub.id, { status: d.paused ? "Paused" : "Active" });
      }
      for (const p of pipelines) {
        const before = stageInPipeline(p, c.id);
        const after = d.other[p.id] ?? "";
        if (after && after !== before) await contactsApi.movePipelineItem(p.id, { contactId: c.id, stageId: after });
        else if (!after && before) await contactsApi.removePipelineItem(p.id, c.id);
      }
    },
    { invalidate: [qk.contacts, qk.salesBoard, qk.pipelines, qk.tags, qk.subscriptions, ["dashboard"]] },
  );

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
    if (save.isError) save.reset();
  };

  const name = `${draft.first} ${draft.last}`.trim() || contactName(c);
  const status = contactStatus(draft.stage, draft.paused, !!c.archivedAt);

  const pickStatus = (next: ContactStatus) => {
    if (next === "active") set({ stage: "paid", paused: false });
    else if (next === "inactive") set(sub && draft.stage === "paid" ? { paused: true } : { stage: "lost", paused: false });
    else set({ stage: draft.stage === "paid" || draft.stage === "lost" ? "lead" : draft.stage, paused: false });
  };

  const statusHint = c.archivedAt
    ? "Archived: hidden from lists and the sales board. Their history is kept."
    : status === "active"
      ? "Active clients are paying. They count toward MRR and appear under Contacts › Clients."
      : status === "inactive"
        ? draft.paused
          ? "Their subscription will be paused. They appear under Contacts › Inactive."
          : "Marked as lost. They appear under Contacts › Inactive."
        : "Leads are people who have not paid yet. Move them through the pipeline as they progress.";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.first.trim() || !isEmail(draft.email)) return setError("Add a first name and a valid email.");
    save.mutate(draft, {
      onSuccess: () => update({ editContactId: "", toast: `${name}’s profile was updated.` }),
      onError: (err) => {
        const f = fieldErrors(err);
        setError(Object.values(f)[0] || errorMessage(err));
      },
    });
  };

  // Contacts with invoices or subscriptions can't be deleted (409 contact_has_billing): archive them instead.
  const hasBilling = hasCode(remove.error, "contact_has_billing");
  const doDelete = () =>
    remove.mutate(c.id, { onSuccess: () => update({ editContactId: "", toast: `${contactName(c)} was deleted.` }) });
  const doArchive = () =>
    archive.mutate(c.id, { onSuccess: () => update({ editContactId: "", toast: `${contactName(c)} was archived.` }) });

  const socials = Object.entries(links?.socials ?? {}).filter(([, url]) => !!url);
  const custom = (links?.custom ?? []) as Array<{ label: string; url: string }>;
  const linkItems = [
    ...socials.map(([key, url]) => ({ ...(SOCIAL_LABELS[key] ?? { label: key, short: key.slice(0, 2), tone: "brand" as const }), url })),
    ...custom.map((l) => ({ label: l.label, short: "↗", tone: "brand" as const, url: l.url })),
  ];

  const sourceOptions = LEAD_SOURCES.some((s) => s.value === draft.source)
    ? LEAD_SOURCES
    : [{ value: draft.source, label: SOURCE_LABELS[draft.source as LeadSource] ?? draft.source }, ...LEAD_SOURCES];

  return (
    <Modal
      open
      variant="drawer"
      width={520}
      onClose={onClose}
      onSubmit={submit}
      titleId="ec-title"
      kicker={c.archivedAt ? "ARCHIVED CONTACT" : "EDIT PROFILE"}
      title={name}
      subtitle={`Signed up ${formatShort(c.createdAt)} · ${SOURCE_LABELS[c.source as LeadSource] ?? c.source}`}
      media={<Avatar name={name} tone={avatarTone(c.id)} size="lg" ring />}
      footer={
        canWrite ? (
          <>
            {hasBilling ? (
              <Button variant="danger-solid" onClick={doArchive} disabled={archive.isPending}>
                Archive instead
              </Button>
            ) : confirmDelete ? (
              <Button variant="danger-solid" onClick={doDelete} disabled={remove.isPending}>
                Yes, delete contact
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            {c.archivedAt ? (
              <Button
                onClick={() => unarchive.mutate(c.id, { onSuccess: () => update({ toast: `${contactName(c)} is back in your lists.` }) })}
                disabled={unarchive.isPending}
              >
                Unarchive
              </Button>
            ) : (
              <Button onClick={doArchive} disabled={archive.isPending}>
                Archive
              </Button>
            )}
            <span className="u-spacer" />
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </>
        ) : (
          <>
            <span className="text-small">Your role can view but not change contacts.</span>
            <span className="u-spacer" />
            <Button onClick={onClose}>Close</Button>
          </>
        )
      }
    >
      {hasBilling && (
        <div className="notice notice--warning" role="status">
          {errorMessage(remove.error)} Archive hides them from lists and keeps their history.
        </div>
      )}
      <FormError error={archive.error ?? unarchive.error ?? (hasBilling ? null : remove.error)} />

      <div className="inset inset--brand status-box">
        <span className="kicker kicker--brand">STATUS &amp; STAGE</span>
        <Field label="Status">
          <div className="cluster cluster--6" role="radiogroup" aria-label="Status">
            {(["lead", "active", "inactive"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={status === k}
                className={cn("status-choice", toneClass(CONTACT_STATUS[k].tone))}
                onClick={() => pickStatus(k)}
              >
                <span className="status-choice__dot" aria-hidden="true" />
                {k === "lead" ? "Lead" : CONTACT_STATUS[k].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`${sales?.name ?? "Sales pipeline"} stage`} htmlFor="ec-stage">
          <Select
            id="ec-stage"
            className="u-strong"
            value={draft.stage}
            options={CORE_STAGES.map((st) => ({ value: st, label: stages[st].label }))}
            onChange={(e) => {
              const stage = e.target.value as CoreStage;
              set({ stage, paused: stage === "paid" ? draft.paused : false });
            }}
          />
        </Field>
        {pipelines.map((p) => (
          <Field key={p.id} label={`${p.name} stage`} htmlFor={`ec-pl-${p.id}`}>
            <Select
              id={`ec-pl-${p.id}`}
              value={draft.other[p.id] ?? ""}
              placeholder="Not in this pipeline"
              options={p.stages.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(e) => set({ other: { ...draft.other, [p.id]: e.target.value } })}
            />
          </Field>
        ))}
        <span className="text-small">{statusHint}</span>
      </div>

      <PortalLoginCard contact={c} />
      <ReferredByContactCard contact={c} />

      {linkItems.length > 0 && (
        <div className="inset inset--brand client-links">
          <div className="cluster cluster--nowrap">
            <span className="icon-tile tone-brand" aria-hidden="true">
              <Icon name="link" size={15} />
            </span>
            <span className="stack stack--2 u-grow">
              <span className="kicker kicker--brand">SOCIAL MEDIA &amp; LINKS · {linkItems.length}</span>
              <span className="text-tiny">
                Added by the client in their portal{links?.updatedAt ? ` · updated ${formatShort(links.updatedAt)}` : ""} — remember to
                use these on their pages and emails
              </span>
            </span>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                copyToClipboard(linkItems.map((x) => `${x.label}: ${x.url}`).join("\n"));
                setLinksCopied(true);
              }}
            >
              {linksCopied ? "Copied" : "Copy all"}
            </Button>
          </div>
          <div className="stack stack--4">
            {linkItems.map((l) => (
              <div className="client-links__row" key={l.url}>
                <span className={cn("client-links__badge", toneClass(l.tone))} aria-hidden="true">
                  {l.short}
                </span>
                <span className="client-links__label">{l.label}</span>
                <a className="client-links__url" href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.url.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientEmbedsCard clientId={c.id} />

      <button type="button" className="link-card link-card--glow" onClick={() => update({ viewAsId: c.id })}>
        <span className="link-card__icon" aria-hidden="true">
          <Icon name="eye" size={17} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="text-strong">View as client</span>
          <span className="text-small">See their client portal exactly as they do (read-only)</span>
        </span>
        <span className="link-card__arrow" aria-hidden="true">
          →
        </span>
      </button>
      <button type="button" className="link-card" onClick={() => openMediaFolder(c.id)}>
        <FolderGlyph width={26} height={22} strokeWidth={2.5} fill="rgba(255,153,0,0.18)" stroke="#FF9900" />
        <span className="stack stack--2 u-grow">
          <span className="text-strong">Media folder</span>
          <span className="text-small">
            {folder?.fileCount ? `${folder.fileCount} files · logos, photos and documents` : "Empty — files the client uploads appear here"}
          </span>
        </span>
        <span className="link-card__arrow" aria-hidden="true">
          →
        </span>
      </button>

      <div className="stack stack--10">
        <span className="kicker">PROFILE</span>
        <div className="form-grid form-grid--narrow">
          {(
            [
              ["first", "First name", "text"],
              ["last", "Last name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
              ["company", "Business name", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <Field key={key} label={label} htmlFor={`ec-${key}`}>
              <Input
                id={`ec-${key}`}
                type={type}
                autoComplete="off"
                value={draft[key]}
                aria-invalid={!!error && ((key === "first" && !draft.first.trim()) || (key === "email" && !isEmail(draft.email)))}
                onChange={(e) => set({ [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="Lead source" htmlFor="ec-source">
            <Select id="ec-source" value={draft.source} options={sourceOptions} onChange={(e) => set({ source: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="stack stack--8">
        <span className="kicker">TAGS</span>
        <TagPicker tags={tags} selected={draft.tags} onChange={(ids) => set({ tags: ids })} />
      </div>

      <ContactAnswersCard contact={c} />

      <Field label={<span className="kicker">NOTES</span>} htmlFor="ec-notes">
        <Textarea id="ec-notes" rows={4} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering about this contact" />
      </Field>

      {sub && (
        <div className="inset inset--soft text-body">
          Subscription: {sub.plan} · {formatPerInterval(sub.amountCents, sub.interval, sub.currency)} ·{" "}
          {draft.paused && sub.status !== "Paused" ? "will be paused" : !draft.paused && sub.status === "Paused" ? "will be resumed" : sub.status}
        </div>
      )}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
