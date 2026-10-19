"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, SegmentedControl, Select, Textarea } from "@/components/ui";
import { CORE_STAGES, type CoreStage } from "@/data/admin";
import { canWriteCrm } from "@/utils/auth/session";
import { useAllContacts, usePipelines, useTags } from "@/utils/hooks/useContacts";
import { useSendEmail, useTemplates } from "@/utils/hooks/useMarketing";
import { useSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName, getSalesStages } from "../../lib/contacts";
import { useAdmin, type ComposerDraft } from "../../state/AdminContext";

const MODES: Array<{ value: ComposerDraft["mode"]; label: string }> = [
  { value: "one", label: "One contact" },
  { value: "tag", label: "By tag" },
  { value: "stage", label: "By pipeline stage" },
];

export function EmailComposer() {
  const { state, update } = useAdmin();
  const { composer } = state;
  const canWrite = canWriteCrm(useMe().data);
  const contacts = useAllContacts().data ?? [];
  const tags = useTags().data ?? [];
  const templates = useTemplates().data ?? [];
  const stages = getSalesStages(usePipelines().data);
  const from = useSettings().data?.bizEmail;
  const sendEmail = useSendEmail();
  const [sentMessage, setSentMessage] = useState("");

  const setDraft = (patch: Partial<ComposerDraft>) => update((s) => ({ composer: { ...s.composer, ...patch } }));

  const target = composer.mode === "one" ? composer.contact : composer.mode === "tag" ? composer.tag : composer.stage;
  // A preview of who it goes to; the API resolves the real list when it sends.
  const byTag = useAllContacts({ tag_id: composer.tag }, composer.mode === "tag" && !!composer.tag);
  const recipients =
    composer.mode === "one"
      ? contacts.filter((c) => c.id === composer.contact)
      : composer.mode === "tag"
        ? composer.tag
          ? (byTag.data ?? [])
          : []
        : composer.stage
          ? contacts.filter((c) => c.stage === composer.stage)
          : [];

  const recipientText =
    recipients.length === 0
      ? "No recipients selected yet"
      : recipients.length === 1
        ? `Sending to ${contactName(recipients[0])} (${recipients[0].email})`
        : `Sending to ${recipients.length} contacts`;

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!target || !composer.subject.trim() || !composer.body.trim()) return;
    sendEmail.mutate(
      { mode: composer.mode, target, subject: composer.subject, body: composer.body },
      {
        onSuccess: (m) => {
          setDraft({ subject: "", body: "" });
          setSentMessage(`Email to ${m.toLabel} is queued and will send in a moment.`);
        },
      },
    );
  };

  return (
    <form className="card composer" onSubmit={send}>
      <div className="composer__header">
        <IconTile tone="sky" size="md">
          <Icon name="edit" />
        </IconTile>
        <h2 className="card-title">New email</h2>
        <span className="text-small u-push-right">From: {from || "your business email (Settings › Business)"}</span>
      </div>

      <div className="composer__body">
        {sentMessage && (
          <div className="notice notice--success" role="status">
            <Icon name="check" strokeWidth={2.4} />
            {sentMessage}
          </div>
        )}

        <Field label="Send to" strongLabel>
          <SegmentedControl variant="soft" size="sm" label="Recipient type" options={MODES} value={composer.mode} onChange={(mode) => setDraft({ mode })} />
        </Field>

        {composer.mode === "one" && (
          <Field label="Contact" htmlFor="em-to">
            <Select
              id="em-to"
              value={composer.contact}
              placeholder="Choose a contact…"
              options={contacts.map((c) => ({ value: c.id, label: `${contactName(c)} — ${c.email}` }))}
              onChange={(e) => setDraft({ contact: e.target.value })}
            />
          </Field>
        )}
        {composer.mode === "tag" && (
          <Field label="Everyone with tag" htmlFor="em-tag">
            <Select
              id="em-tag"
              value={composer.tag}
              placeholder="Choose a tag…"
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(e) => setDraft({ tag: e.target.value })}
            />
          </Field>
        )}
        {composer.mode === "stage" && (
          <Field label="Everyone in stage" htmlFor="em-stage">
            <Select
              id="em-stage"
              value={composer.stage}
              placeholder="Choose a stage…"
              options={CORE_STAGES.map((k: CoreStage) => ({ value: k, label: stages[k].label }))}
              onChange={(e) => setDraft({ stage: e.target.value })}
            />
          </Field>
        )}
        <span className={recipients.length ? "text-small u-strong u-green" : "text-small u-strong"}>{recipientText}</span>

        <Field label="Start from a template" strongLabel>
          <div className="cluster cluster--8">
            {templates.map((t) => (
              <button key={t.id} type="button" className="chip" onClick={() => setDraft({ subject: t.subject, body: t.body })}>
                {t.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Subject" htmlFor="em-subj">
          <Input id="em-subj" value={composer.subject} onChange={(e) => setDraft({ subject: e.target.value })} placeholder="Subject line" />
        </Field>

        <div className="field field--gap-6">
          <div className="cluster cluster--between">
            <label className="field__label" htmlFor="em-body">
              Message
            </label>
            <div className="cluster cluster--6">
              <span className="text-small">Insert:</span>
              <button type="button" className="insert-chip" onClick={() => setDraft({ body: composer.body + "{first_name}" })}>
                First name
              </button>
              <button type="button" className="insert-chip" onClick={() => setDraft({ body: composer.body + "[YOUR BOOKING LINK]" })}>
                Booking link
              </button>
            </div>
          </div>
          <Textarea id="em-body" rows={9} value={composer.body} onChange={(e) => setDraft({ body: e.target.value })} placeholder="Write your message…" />
          <span className="field__hint">
            {"{first_name}"}, {"{last_name}"} and {"{email}"} are filled in for each contact when it sends.
          </span>
        </div>
      </div>

      <div className="composer__footer">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setDraft({ subject: "", body: "" });
            setSentMessage("");
          }}
        >
          Discard
        </Button>
        <FormError error={sendEmail.error} />
        <Button type="submit" variant="primary" size="lg" disabled={!canWrite || sendEmail.isPending || !target}>
          <Icon name="send" />
          {sendEmail.isPending ? "Sending…" : "Send email"}
        </Button>
      </div>
    </form>
  );
}
