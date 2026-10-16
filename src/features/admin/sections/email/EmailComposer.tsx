"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, IconTile, Input, SegmentedControl, Select, Textarea } from "@/components/ui";
import type { CoreStage } from "@/data/admin";
import { TODAY_SHORT } from "@/lib/dates";
import { firstName, newId } from "@/lib/utils";
import { getSalesStages } from "../../lib/contacts";
import { useAdmin, type ComposerDraft } from "../../state/AdminContext";

const MODES: Array<{ value: ComposerDraft["mode"]; label: string }> = [
  { value: "one", label: "One contact" },
  { value: "tag", label: "By tag" },
  { value: "stage", label: "By pipeline stage" },
];

export function EmailComposer() {
  const { state, update } = useAdmin();
  const { composer, contacts, contactTags, tags, templates } = state;
  const stages = getSalesStages(state.pipelines);
  const [sentMessage, setSentMessage] = useState("");

  const setDraft = (patch: Partial<ComposerDraft>) => update((s) => ({ composer: { ...s.composer, ...patch } }));

  const recipients =
    composer.mode === "one"
      ? contacts.filter((c) => String(c.id) === composer.contact)
      : composer.mode === "tag"
        ? composer.tag
          ? contacts.filter((c) => (contactTags[c.id] ?? []).includes(composer.tag))
          : []
        : composer.stage
          ? contacts.filter((c) => c.stage === composer.stage)
          : [];

  const recipientText =
    recipients.length === 0
      ? "No recipients selected yet"
      : recipients.length === 1
        ? `Sending to ${recipients[0].name} (${recipients[0].email})`
        : `Sending to ${recipients.length} contacts`;

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!recipients.length || !composer.subject.trim() || !composer.body.trim()) return;

    const one = recipients.length === 1;
    const fill = (text: string) => text.split("{first_name}").join(one ? firstName(recipients[0].name) : "there");
    const label = one
      ? recipients[0].name
      : composer.mode === "tag"
        ? `Tag: ${tags.find((t) => t.id === composer.tag)?.name ?? ""} (${recipients.length})`
        : `${stages[composer.stage as CoreStage].label} (${recipients.length})`;

    update((s) => ({
      sentEmails: [
        {
          id: newId(),
          to: label,
          cid: one ? recipients[0].id : 0,
          count: recipients.length,
          subject: fill(composer.subject),
          preview: fill(composer.body).replace(/\n+/g, " ").slice(0, 90),
          date: TODAY_SHORT,
          status: "Sent",
        },
        ...s.sentEmails,
      ],
      composer: { ...s.composer, subject: "", body: "" },
    }));
    setSentMessage(`Email sent to ${one ? recipients[0].name : `${recipients.length} contacts`}`);
  };

  return (
    <form className="card composer" onSubmit={send}>
      <div className="composer__header">
        <IconTile tone="sky" size="md">
          <Icon name="edit" />
        </IconTile>
        <h2 className="card-title">New email</h2>
        <span className="text-small u-push-right">From: [you@yourdomain.com]</span>
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
              options={contacts.map((c) => ({ value: String(c.id), label: `${c.name} — ${c.email}` }))}
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
              options={(Object.keys(stages) as CoreStage[]).map((k) => ({ value: k, label: stages[k].label }))}
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
          <span className="field__hint">{"{first_name}"} is replaced with each contact&apos;s first name when it sends.</span>
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
        <Button type="submit" variant="primary" size="lg">
          <Icon name="send" />
          Send email
        </Button>
      </div>
    </form>
  );
}
