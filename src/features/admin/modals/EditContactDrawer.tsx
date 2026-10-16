"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, FolderGlyph, Icon, Input, Modal, Select, Textarea } from "@/components/ui";
import { CLIENT_LINKS, LEAD_SOURCES, PLAN_PRICE, SOCIAL_LABELS, type Contact, type CoreStage, type LeadSource } from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn, copyToClipboard, formatMoney, isEmail } from "@/lib/utils";
import { TagPicker } from "../components/TagPicker";
import { CONTACT_STATUS, contactStatus, subscriptionOf, type ContactStatus } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

type Draft = {
  first: string;
  last: string;
  email: string;
  phone: string;
  source: LeadSource;
  stage: CoreStage;
  paused: boolean;
  tags: string[];
  notes: string;
  /** Stage in each custom pipeline ("" = not in it). */
  other: Record<string, string>;
};

export function EditContactDrawer() {
  const { state, update } = useAdmin();
  const contact = state.contacts.find((c) => c.id === state.editContactId);
  if (!contact) return null;
  return <EditContactForm key={contact.id} contact={contact} onClose={() => update({ editContactId: 0 })} />;
}

function EditContactForm({ contact: c, onClose }: { contact: Contact; onClose: () => void }) {
  const { state, update, openMediaFolder } = useAdmin();
  const sub = subscriptionOf(state.subscriptions, c.id);
  const [first, ...rest] = c.name.split(" ");

  const [draft, setDraft] = useState<Draft>({
    first: first ?? "",
    last: rest.join(" "),
    email: c.email,
    phone: c.phone === "—" ? "" : c.phone,
    source: c.source,
    stage: c.stage,
    paused: sub?.status === "Paused",
    tags: (state.contactTags[c.id] ?? []).slice(),
    notes: state.clientNotes[c.id] ?? "",
    other: Object.fromEntries(state.pipelines.slice(1).map((p) => [p.id, p.items?.[c.id] ?? ""])),
  });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linksCopied, setLinksCopied] = useState(false);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  const name = `${draft.first} ${draft.last}`.trim() || c.name;
  const status = contactStatus(draft.stage, draft.paused);
  const salesPipeline = state.pipelines[0];
  const files = state.media[c.id] ?? [];

  const pickStatus = (next: ContactStatus) => {
    if (next === "active") set({ stage: "paid", paused: false });
    else if (next === "inactive") set(sub && draft.stage === "paid" ? { paused: true } : { stage: "lost", paused: false });
    else set({ stage: draft.stage === "paid" || draft.stage === "lost" ? "lead" : draft.stage, paused: false });
  };

  const statusHint =
    status === "active"
      ? "Active clients are paying. They count toward MRR and appear under Contacts › Clients."
      : status === "inactive"
        ? draft.paused
          ? "Their subscription will be paused. They appear under Contacts › Inactive."
          : "Marked as lost. They appear under Contacts › Inactive."
        : "Leads are people who have not paid yet. Move them through the pipeline as they progress.";

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.first.trim() || !isEmail(draft.email)) return setError("Add a first name and a valid email.");
    const dup = state.contacts.find((x) => x.id !== c.id && x.email.toLowerCase() === draft.email.trim().toLowerCase());
    if (dup) return setError(`${dup.name} already uses this email.`);

    const fullName = `${draft.first.trim()} ${draft.last.trim()}`.trim();
    update((s) => ({
      contacts: s.contacts.map((x) =>
        x.id !== c.id
          ? x
          : {
              ...x,
              name: fullName,
              email: draft.email.trim(),
              phone: draft.phone.trim() || "—",
              source: draft.source,
              stage: draft.stage,
              paidOn: draft.stage === "paid" ? x.paidOn || TODAY_SHORT : x.paidOn,
              day: draft.stage === "lead" ? "" : x.day,
              time: draft.stage === "lead" ? "" : x.time,
            },
      ),
      subscriptions: s.subscriptions.map((x) =>
        x.cid !== c.id ? x : { ...x, status: draft.paused ? "Paused" : x.status === "Paused" ? "Active" : x.status },
      ),
      contactTags: { ...s.contactTags, [c.id]: draft.tags.slice() },
      clientNotes: { ...s.clientNotes, [c.id]: draft.notes.trim() },
      pipelines: s.pipelines.map((p, i) => {
        if (!i) return p;
        const stage = draft.other[p.id];
        const items = { ...(p.items ?? {}) };
        let order = (p.order ?? []).slice();
        if (stage) {
          items[c.id] = stage;
          if (!order.includes(c.id)) order.push(c.id);
        } else {
          delete items[c.id];
          order = order.filter((x) => x !== c.id);
        }
        return { ...p, items, order };
      }),
      editContactId: 0,
      toast: `${fullName}’s profile was updated.`,
    }));
  };

  const remove = () =>
    update((s) => ({
      contacts: s.contacts.filter((x) => x.id !== c.id),
      subscriptions: s.subscriptions.filter((x) => x.cid !== c.id),
      editContactId: 0,
      toast: `${c.name} was deleted.`,
    }));

  const links = CLIENT_LINKS[c.id];
  const linkItems = links
    ? [
        ...links.socials.map(([key, url]) => ({ ...SOCIAL_LABELS[key], url })),
        ...links.custom.map(([label, url]) => ({ label, short: "↗", tone: "brand" as const, url })),
      ]
    : [];

  return (
    <Modal
      open
      variant="drawer"
      width={520}
      onClose={onClose}
      onSubmit={save}
      titleId="ec-title"
      kicker="EDIT PROFILE"
      title={name}
      subtitle={`Signed up ${c.signed} · ${c.source}`}
      media={<Avatar name={name} tone={avatarTone(c.id)} size="lg" ring />}
      footer={
        <>
          {confirmDelete ? (
            <Button variant="danger-solid" onClick={remove}>
              Yes, delete contact
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save changes
          </Button>
        </>
      }
    >
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
        <Field label={`${salesPipeline.name} stage`} htmlFor="ec-stage">
          <Select
            id="ec-stage"
            className="u-strong"
            value={draft.stage}
            options={salesPipeline.stages.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(e) => {
              const stage = e.target.value as CoreStage;
              set({ stage, paused: stage === "paid" ? draft.paused : false });
            }}
          />
        </Field>
        {state.pipelines.slice(1).map((p) => (
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

      {links && linkItems.length > 0 && (
        <div className="inset inset--brand client-links">
          <div className="cluster cluster--nowrap">
            <span className="icon-tile tone-brand" aria-hidden="true">
              <Icon name="link" size={15} />
            </span>
            <span className="stack stack--2 u-grow">
              <span className="kicker kicker--brand">SOCIAL MEDIA &amp; LINKS · {linkItems.length}</span>
              <span className="text-tiny">
                Added by the client in their portal · updated {links.updated} — remember to use these on their pages and emails
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
                <a className="client-links__url" href={l.url} target="_blank" rel="noopener">
                  {l.url.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ))}
          </div>
          {links.funnels.length > 0 && (
            <div className="client-links__funnels">
              <span className="kicker kicker--sm kicker--brand">INCLUDE ON FUNNELS</span>
              {links.funnels.map(([funnel, labels]) => (
                <span className="text-small" key={funnel}>
                  <strong>{funnel}</strong> → {labels.join(", ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <button type="button" className="link-card link-card--glow" onClick={() => update({ viewAsId: c.id })}>
        <span className="link-card__icon" aria-hidden="true">
          <Icon name="eye" size={17} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="text-strong">View as client</span>
          <span className="text-small">See their client portal exactly as they do</span>
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
            {files.length ? `${files.length} files · logos, photos and documents` : "Empty — files the client uploads appear here"}
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
            <Select id="ec-source" value={draft.source} options={LEAD_SOURCES} onChange={(e) => set({ source: e.target.value as LeadSource })} />
          </Field>
        </div>
      </div>

      <div className="stack stack--8">
        <span className="kicker">TAGS</span>
        <TagPicker tags={state.tags} selected={draft.tags} onChange={(tags) => set({ tags })} />
      </div>

      <Field label={<span className="kicker">NOTES</span>} htmlFor="ec-notes">
        <Textarea id="ec-notes" rows={4} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering about this contact" />
      </Field>

      {sub && (
        <div className="inset inset--soft text-body">
          Subscription: {sub.plan} · {formatMoney(sub.amount || PLAN_PRICE)} per {sub.interval.toLowerCase()} ·{" "}
          {draft.paused ? "will be paused" : sub.status === "Paused" ? "will be resumed" : sub.status}
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
