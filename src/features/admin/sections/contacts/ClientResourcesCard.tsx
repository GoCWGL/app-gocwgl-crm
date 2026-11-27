"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconButton, Input, Select, Textarea } from "@/components/ui";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useAddClientRecording, useClientRecordings, useClientSharedForms, useDeleteRecording, useShareForm, useUnshareForm } from "@/utils/hooks/useClientHub";
import { useForms } from "@/utils/hooks/useForms";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

/**
 * Client profile › Portal resources: what shows in the client's portal under CRM › My Sessions › My Recordings and
 * Updates & Resources › My Forms. (Announcements go to every client from Clients › Announcements; documents are the
 * client's media folder.)
 */
export function ClientResourcesCard({ contactId }: { contactId: string }) {
  const canWrite = canWriteCrm(useMe().data);
  return (
    <div className="inset stack stack--16">
      <header className="cluster cluster--nowrap">
        <Icon name="video" size={16} />
        <span className="text-strong u-grow">Portal resources</span>
        <span className="text-small">CRM › My Sessions and My Forms</span>
      </header>
      <Recordings contactId={contactId} canWrite={canWrite} />
      <SharedForms contactId={contactId} canWrite={canWrite} />
    </div>
  );
}

function Recordings({ contactId, canWrite }: { contactId: string; canWrite: boolean }) {
  const { update } = useAdmin();
  const list = useClientRecordings(contactId).data ?? [];
  const add = useAddClientRecording();
  const remove = useDeleteRecording();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "", recordedOn: "", notes: "" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.url.trim()) return;
    add.mutate(
      { contactId, body: { title: draft.title.trim(), url: draft.url.trim(), recordedOn: draft.recordedOn || null, notes: draft.notes } },
      {
        onSuccess: () => {
          setDraft({ title: "", url: "", recordedOn: "", notes: "" });
          setAdding(false);
          update({ toast: "Recording added to their portal." });
        },
      },
    );
  };

  return (
    <section className="stack stack--8">
      <div className="cluster cluster--nowrap">
        <span className="kicker kicker--sm u-grow">RECORDINGS · {list.length}</span>
        {canWrite && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Icon name="plus" size={13} /> Add recording
          </Button>
        )}
      </div>
      {adding && (
        <form className="stack stack--8" onSubmit={submit}>
          <Field label="Title" htmlFor="rec-title" required>
            <Input id="rec-title" maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Blueprint call" />
          </Field>
          <Field label="Link" htmlFor="rec-url" required hint="Zoom, Loom, Google Drive, YouTube…">
            <Input id="rec-url" type="url" maxLength={1024} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Recorded on" htmlFor="rec-date">
            <Input id="rec-date" type="date" value={draft.recordedOn} onChange={(e) => setDraft({ ...draft, recordedOn: e.target.value })} />
          </Field>
          <Field label="Notes" htmlFor="rec-notes">
            <Textarea id="rec-notes" rows={2} maxLength={5000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <FormError error={add.error} />
          <div className="cluster cluster--6">
            <Button size="sm" variant="primary" type="submit" disabled={add.isPending || !draft.title.trim() || !draft.url.trim()}>
              {add.isPending ? "Adding…" : "Add"}
            </Button>
            <Button size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {list.length ? (
        <ul className="hub-list">
          {list.map((r) => (
            <li key={r.id} className="cluster cluster--nowrap">
              <span className="stack stack--2 u-grow">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-strong">
                  {r.title}
                </a>
                <span className="text-tiny">
                  {r.recordedOn ?? formatShort(r.createdAt)}
                  {r.addedByName ? ` · added by ${r.addedByName}` : ""}
                </span>
              </span>
              {canWrite && (
                <IconButton
                  label={`Remove ${r.title}`}
                  size="sm"
                  ghost
                  danger
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: r.id, contactId })}
                >
                  <Icon name="trash" size={14} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !adding && <span className="text-small">No recordings yet.</span>
      )}
    </section>
  );
}

function SharedForms({ contactId, canWrite }: { contactId: string; canWrite: boolean }) {
  const { update } = useAdmin();
  const shared = useClientSharedForms(contactId).data ?? [];
  const forms = (useForms().data ?? []).filter((f) => f.isActive && !shared.some((s) => s.formId === f.id));
  const share = useShareForm();
  const unshare = useUnshareForm();
  const [formId, setFormId] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!formId) return;
    share.mutate(
      { contactId, body: { formId, note: note.trim() } },
      {
        onSuccess: () => {
          setFormId("");
          setNote("");
          update({ toast: "Form shared. It shows in their portal under My Forms." });
        },
      },
    );
  };

  return (
    <section className="stack stack--8">
      <span className="kicker kicker--sm">FORMS TO FILL IN · {shared.length}</span>
      {shared.length > 0 && (
        <ul className="hub-list">
          {shared.map((s) => (
            <li key={s.id} className="cluster cluster--nowrap">
              <span className="stack stack--2 u-grow">
                <span className="text-strong">{s.name}</span>
                <span className="text-tiny">
                  {s.note || "No note"} · shared {formatShort(s.sharedAt)}
                  {!s.active && " · form is off"}
                </span>
              </span>
              {canWrite && (
                <IconButton
                  label={`Stop sharing ${s.name}`}
                  size="sm"
                  ghost
                  danger
                  disabled={unshare.isPending}
                  onClick={() => unshare.mutate({ id: s.id, contactId })}
                >
                  <Icon name="trash" size={14} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form className="stack stack--8" onSubmit={submit}>
          <div className="cluster cluster--nowrap cluster--6">
            <Select
              size="sm"
              aria-label="Form to share"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder={forms.length ? "Choose a form…" : "No other active forms"}
              options={forms.map((f) => ({ value: f.id, label: f.name }))}
            />
            <Button size="sm" variant="outline" type="submit" disabled={!formId || share.isPending}>
              Share
            </Button>
          </div>
          {formId && (
            <Input size="sm" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it's for (optional), e.g. Before your blueprint call" />
          )}
          <FormError error={share.error} />
        </form>
      )}
    </section>
  );
}
