"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Badge, Button, ConfirmDialog, FileCard, FormError, Icon, IconTile, LoadState, SegmentedControl } from "@/components/ui";
import { CRM_BOOKING_URL } from "@/data/portal";
import { formatFileSize } from "@/lib/utils";
import { downloadAsset } from "@/utils/api/delivery";
import type { FileOut } from "@/utils/api/models";
import { formatCall, formatLong, formatShort } from "@/utils/format/dates";
import { useMyAnnouncements, useMyAppointments, useMyForms, useMyRecordings } from "@/utils/hooks/useClientHub";
import { useAssets, useDeleteAsset, useUploadAsset } from "@/utils/hooks/useDelivery";
import { usePortal } from "../state/PortalContext";

/** A date-only value ("2026-11-20") as "Nov 20, 2026", without shifting a day across time zones. */
function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

// ------------------------------------------------------------------ My Sessions › My Recordings
/** Client portal › CRM › My Sessions › My Recordings: links to their recorded sessions with GoCWGL. */
export function RecordingsSection() {
  const query = useMyRecordings();
  const recordings = query.data ?? [];
  return (
    <LoadState
      query={query}
      loadingText="Loading your recordings…"
      isEmpty={!recordings.length}
      empty="No recordings yet. After a recorded session with GoCWGL, the recording shows up here."
    >
      <ul className="hub-list">
        {recordings.map((r) => (
          <li key={r.id} className="card hub-item">
            <IconTile tone="pink" size="md">
              <Icon name="video" size={18} />
            </IconTile>
            <div className="hub-item__body">
              <strong>{r.title}</strong>
              <span className="text-small">{r.recordedOn ? `Recorded ${formatDay(r.recordedOn)}` : `Added ${formatLong(r.createdAt)}`}</span>
              {r.notes && <p className="hub-item__text">{r.notes}</p>}
            </div>
            <Button size="sm" onClick={() => openLink(r.url)}>
              <Icon name="play" size={14} /> Watch
            </Button>
          </li>
        ))}
      </ul>
    </LoadState>
  );
}

// ------------------------------------------------------------------ My Sessions › My Appointments
type Period = "upcoming" | "past";

/** Client portal › CRM › My Sessions › My Appointments: calls they booked with GoCWGL. */
export function AppointmentsSection() {
  const query = useMyAppointments();
  const all = query.data ?? [];
  const upcoming = all.filter((a) => a.upcoming).reverse();
  const past = all.filter((a) => !a.upcoming);
  const [period, setPeriod] = useState<Period>("upcoming");
  const shown = period === "upcoming" ? upcoming : past;

  return (
    <div className="page-stack">
      <div className="hub-bar">
        <SegmentedControl<Period>
          kind="tabs"
          label="Appointments"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "upcoming", label: `Upcoming (${upcoming.length})` },
            { value: "past", label: `Past (${past.length})` },
          ]}
        />
        <Button variant="outline" size="sm" onClick={() => openLink(CRM_BOOKING_URL)}>
          <Icon name="calendar" size={14} /> Book a call
        </Button>
      </div>
      <LoadState
        query={query}
        loadingText="Loading your appointments…"
        isEmpty={!shown.length}
        empty={period === "upcoming" ? "No calls coming up. Book one whenever you'd like to talk with GoCWGL." : "No past calls yet."}
      >
        <ul className="hub-list">
          {shown.map((a) => (
            <li key={a.id} className="card hub-item">
              <IconTile tone={a.status === "cancelled" ? "slate" : "cyan"} size="md">
                <Icon name="calendar" size={18} />
              </IconTile>
              <div className="hub-item__body">
                <strong>{a.title}</strong>
                <span className="text-small">
                  {formatCall(a.startsAt)}
                  {a.location ? ` · ${a.location}` : ""}
                </span>
              </div>
              {a.status === "cancelled" ? (
                <Badge tone="slate">Cancelled</Badge>
              ) : a.meetingUrl ? (
                <Button size="sm" onClick={() => openLink(a.meetingUrl!)}>
                  Join call
                </Button>
              ) : a.upcoming ? (
                <Badge tone="cyan">Booked</Badge>
              ) : (
                <Badge tone="green">Done</Badge>
              )}
            </li>
          ))}
        </ul>
      </LoadState>
    </div>
  );
}

// ------------------------------------------------------------------ Updates & Resources › Announcements
/** Client portal › CRM › Updates & Resources › Announcements: what the GoCWGL team publishes. */
export function AnnouncementsSection() {
  const query = useMyAnnouncements();
  const items = query.data ?? [];
  return (
    <LoadState query={query} loadingText="Loading updates…" isEmpty={!items.length} empty="No updates yet. News from GoCWGL shows up here.">
      <div className="hub-list">
        {items.map((a) => (
          <article key={a.id} className="card hub-post">
            <div className="hub-post__head">
              <span className="text-tiny">{formatLong(a.publishedAt)}</span>
              {a.pinned && <Badge tone="brand">Pinned</Badge>}
            </div>
            <h3 className="hub-post__title">{a.title}</h3>
            {a.body && <p className="hub-item__text">{a.body}</p>}
            {a.linkUrl && (
              <span>
                <Button variant="outline" size="sm" onClick={() => openLink(a.linkUrl)}>
                  Read more <Icon name="arrowRight" size={12} />
                </Button>
              </span>
            )}
          </article>
        ))}
      </div>
    </LoadState>
  );
}

// ------------------------------------------------------------------ Updates & Resources › My Documents
/** Client portal › CRM › Updates & Resources › My Documents: files the client and the GoCWGL team share. */
export function DocumentsSection() {
  const { readOnly, update } = usePortal();
  const query = useAssets();
  const upload = useUploadAsset();
  const remove = useDeleteAsset();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState<FileOut | null>(null);
  const files = query.data ?? [];
  const fromTeam = files.filter((f) => f.uploadedBy !== "client");
  const mine = files.filter((f) => f.uploadedBy === "client");

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    upload.mutate({ file, category: "docs" }, { onSuccess: () => update({ toast: `Uploaded ${file.name}.` }), onError: setError });
  };

  const grid = (list: FileOut[], canDelete: boolean) => (
    <div className="file-grid">
      {list.map((f) => (
        <FileCard
          key={f.id}
          name={f.name}
          meta={`${formatFileSize(f.size)} · ${formatShort(f.createdAt)}`}
          onDownload={() => downloadAsset(f).catch(setError)}
          onDelete={canDelete && !readOnly ? () => setDeleting(f) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="page-stack">
      {!readOnly && (
        <div className="hub-bar">
          <span className="text-small">Share logos, spreadsheets or anything else GoCWGL needs for your CRM.</span>
          <input ref={input} type="file" hidden onChange={pick} />
          <Button size="sm" onClick={() => input.current?.click()} disabled={upload.isPending}>
            <Icon name="upload" size={14} /> {upload.isPending ? "Uploading…" : "Upload a file"}
          </Button>
        </div>
      )}
      <FormError error={error} />
      <LoadState query={query} loadingText="Loading your documents…" isEmpty={!files.length} empty="No documents yet. Files you and GoCWGL share show up here.">
        {fromTeam.length > 0 && (
          <section className="stack stack--10">
            <h3 className="hub-heading">From GoCWGL</h3>
            {grid(fromTeam, false)}
          </section>
        )}
        {mine.length > 0 && (
          <section className="stack stack--10">
            <h3 className="hub-heading">Uploaded by you</h3>
            {grid(mine, true)}
          </section>
        )}
      </LoadState>
      {deleting && (
        <ConfirmDialog
          title="Delete this file?"
          confirmLabel="Delete"
          icon="trash"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        >
          {deleting.name} will be removed for you and GoCWGL.
        </ConfirmDialog>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Updates & Resources › My Forms
/** Client portal › CRM › Updates & Resources › My Forms: forms to fill in, and the answers they sent. */
export function FormsSection() {
  const query = useMyForms();
  const shared = query.data?.shared ?? [];
  const sent = query.data?.submissions ?? [];
  const [open, setOpen] = useState("");

  return (
    <LoadState
      query={query}
      loadingText="Loading your forms…"
      isEmpty={!shared.length && !sent.length}
      empty="No forms yet. When GoCWGL needs information from you, the form shows up here."
    >
      <div className="page-stack">
        {shared.length > 0 && (
          <section className="stack stack--10">
            <h3 className="hub-heading">To fill in</h3>
            <ul className="hub-list">
              {shared.map((f) => (
                <li key={f.id} className="card hub-item">
                  <IconTile tone={f.lastSubmittedAt ? "green" : "orange"} size="md">
                    <Icon name="form" size={18} />
                  </IconTile>
                  <div className="hub-item__body">
                    <strong>{f.name}</strong>
                    <span className="text-small">
                      {f.note || `Shared ${formatLong(f.sharedAt)}`}
                      {f.lastSubmittedAt ? ` · Sent ${formatLong(f.lastSubmittedAt)}` : ""}
                    </span>
                  </div>
                  <Button size="sm" variant={f.lastSubmittedAt ? "outline" : undefined} onClick={() => openLink(`/form/${f.formId}`)}>
                    {f.lastSubmittedAt ? "Fill in again" : "Fill in"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {sent.length > 0 && (
          <section className="stack stack--10">
            <h3 className="hub-heading">Sent</h3>
            <ul className="hub-list">
              {sent.map((s) => (
                <li key={s.id} className="card hub-item hub-item--stack">
                  <button type="button" className="hub-item__toggle" onClick={() => setOpen(open === s.id ? "" : s.id)} aria-expanded={open === s.id}>
                    <span className="hub-item__body">
                      <strong>{s.formName}</strong>
                      <span className="text-small">Sent {formatLong(s.submittedAt)}</span>
                    </span>
                    <Icon name={open === s.id ? "chevronUp" : "chevronDown"} size={16} />
                  </button>
                  {open === s.id && (
                    <dl className="hub-answers">
                      {(s.answers ?? []).map((a, i) => (
                        <div key={i}>
                          <dt>{a.label}</dt>
                          <dd>{a.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </LoadState>
  );
}
