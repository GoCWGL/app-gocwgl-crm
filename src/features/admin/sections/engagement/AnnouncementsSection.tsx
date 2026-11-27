"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, ConfirmDialog, Field, FormError, Icon, Input, LoadState, Modal, Select, Textarea } from "@/components/ui";
import type { AnnouncementAudience, AnnouncementOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from "@/utils/hooks/useClientHub";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

const AUDIENCES: Array<{ value: AnnouncementAudience; label: string }> = [
  { value: "all", label: "Every client" },
  { value: "crm", label: "Clients with the CRM service" },
  { value: "va", label: "Clients with the VA service" },
];
const audienceLabel = (a: AnnouncementAudience) => AUDIENCES.find((x) => x.value === a)?.label ?? a;

type Draft = { title: string; body: string; linkUrl: string; audience: AnnouncementAudience; pinned: boolean };
const EMPTY: Draft = { title: "", body: "", linkUrl: "", audience: "crm", pinned: false };

/**
 * Clients › Announcements: updates the team posts to clients' portals (CRM › Updates & Resources › Updates &
 * Announcements). Drafts stay with the team until published.
 */
export function AnnouncementsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const { update } = useAdmin();
  const query = useAnnouncements();
  const save = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();
  const [editing, setEditing] = useState<AnnouncementOut | "new" | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementOut | null>(null);
  const items = query.data ?? [];

  const togglePublished = (a: AnnouncementOut) =>
    save.mutate(
      { id: a.id, body: { published: !a.publishedAt } },
      { onSuccess: () => update({ toast: a.publishedAt ? "Moved back to drafts." : "Published to clients’ portals." }) },
    );

  return (
    <div className="page-stack">
      {canWrite && (
        <div className="cluster">
          <span className="text-small u-grow">Clients see published announcements in their portal: CRM › Updates &amp; Resources.</span>
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={14} /> New announcement
          </Button>
        </div>
      )}
      <FormError error={save.error} />
      <LoadState query={query} loadingText="Loading announcements…" isEmpty={!items.length} empty="No announcements yet.">
        <div className="hub-list">
          {items.map((a) => (
            <article key={a.id} className="card hub-post">
              <div className="hub-post__head">
                <Badge tone={a.publishedAt ? "green" : "neutral"} dot>
                  {a.publishedAt ? `Published ${formatShort(a.publishedAt)}` : "Draft"}
                </Badge>
                {a.pinned && <Badge tone="brand">Pinned</Badge>}
                <span className="text-tiny u-grow">{audienceLabel(a.audience)}</span>
                {canWrite && (
                  <>
                    <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => togglePublished(a)}>
                      {a.publishedAt ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="link" onClick={() => setDeleting(a)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
              <h3 className="hub-post__title">{a.title}</h3>
              {a.body && <p className="hub-item__text">{a.body}</p>}
              {a.linkUrl && (
                <a className="text-small" href={a.linkUrl} target="_blank" rel="noopener noreferrer">
                  {a.linkUrl}
                </a>
              )}
            </article>
          ))}
        </div>
      </LoadState>
      {editing && <AnnouncementModal announcement={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this announcement?"
          confirmLabel="Delete"
          icon="trash"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        >
          “{deleting.title}” will be removed from every client’s portal.
        </ConfirmDialog>
      )}
    </div>
  );
}

function AnnouncementModal({ announcement, onClose }: { announcement: AnnouncementOut | null; onClose: () => void }) {
  const { update } = useAdmin();
  const create = useCreateAnnouncement();
  const save = useUpdateAnnouncement();
  const [draft, setDraft] = useState<Draft>(
    announcement
      ? { title: announcement.title, body: announcement.body, linkUrl: announcement.linkUrl, audience: announcement.audience, pinned: announcement.pinned }
      : EMPTY,
  );
  const [publish, setPublish] = useState(announcement ? !!announcement.publishedAt : true);
  const pending = create.isPending || save.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const body = { ...draft, title: draft.title.trim(), linkUrl: draft.linkUrl.trim(), published: publish };
    const done = () => {
      update({ toast: publish ? "Announcement published." : "Saved as a draft." });
      onClose();
    };
    if (announcement) save.mutate({ id: announcement.id, body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="announcement-title"
      kicker="CLIENT PORTAL"
      title={announcement ? "Edit announcement" : "New announcement"}
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending || !draft.title.trim()}>
            {pending ? "Saving…" : publish ? "Publish" : "Save draft"}
          </Button>
        </>
      }
    >
      <Field label="Title" htmlFor="ann-title" required>
        <Input id="ann-title" maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </Field>
      <Field label="Message" htmlFor="ann-body">
        <Textarea id="ann-body" rows={6} maxLength={20000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      </Field>
      <Field label="Link (optional)" htmlFor="ann-link" hint="Shown as “Read more”.">
        <Input id="ann-link" type="url" maxLength={1024} value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} placeholder="https://" />
      </Field>
      <Field label="Who sees it" htmlFor="ann-audience">
        <Select
          id="ann-audience"
          value={draft.audience}
          onChange={(e) => setDraft({ ...draft, audience: e.target.value as AnnouncementAudience })}
          options={AUDIENCES}
        />
      </Field>
      <Checkbox label="Pin to the top" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
      <Checkbox label="Publish now (clients see it)" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
      <FormError error={create.error ?? save.error} />
    </Modal>
  );
}
