"use client";

import { useState, type ChangeEvent, type CSSProperties } from "react";
import { Avatar, Badge, Button, Checkbox, FileCard, FolderGlyph, FormError, Input, LoadState, StatGrid } from "@/components/ui";
import { MEDIA_CATEGORIES, type MediaCategory } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { cn, formatFileSize, initials } from "@/lib/utils";
import { downloadMedia } from "@/utils/api/delivery";
import type { FolderOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { errorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useClientBrandKit, useDeleteMedia, useMedia, useMediaFolders, useUploadMedia } from "@/utils/hooks/useDelivery";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

/** One media folder per client (the API lists them). */
export function MediaSection() {
  const { state, update } = useAdmin();
  const folders = useMediaFolders();
  const contacts = useAllContacts().data;
  const folder = state.mediaFolderId ? folders.data?.find((f) => f.contactId === state.mediaFolderId) : undefined;
  // A client without files yet still has an (empty) folder.
  const contact = contacts?.find((c) => c.id === state.mediaFolderId);
  // The API lists folders that have files; paid clients get an empty folder so the team can upload to them.
  const allFolders: FolderOut[] = [
    ...(folders.data ?? []),
    ...(contacts ?? [])
      .filter((c) => c.stage === "paid" && !folders.data?.some((f) => f.contactId === c.id))
      .map((c) => ({ contactId: c.id, clientName: contactName(c), company: c.company, fileCount: 0, clientUploads: 0 })),
  ];
  const open: FolderOut | undefined =
    folder ??
    (contact ? { contactId: contact.id, clientName: contactName(contact), company: contact.company, fileCount: 0, clientUploads: 0 } : undefined);
  const [category, setCategory] = useState<MediaCategory | "all">("all");

  const categoryLabel = MEDIA_CATEGORIES.find((c) => c.value === category)?.label;
  const crumbs = open
    ? [
        { label: "Client Media", go: () => update({ mediaFolderId: "" }) },
        { label: open.clientName, go: () => setCategory("all") },
        ...(category !== "all" ? [{ label: categoryLabel ?? "", go: () => {} }] : []),
      ]
    : [{ label: "Client Media", go: () => {} }];

  return (
    <div className="page-stack">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span className="cluster cluster--6" key={c.label}>
              <button type="button" className="breadcrumbs__item" aria-current={last ? "page" : undefined} onClick={c.go}>
                {c.label}
              </button>
              {!last && (
                <span className="breadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {open ? (
        <ClientFolder key={open.contactId} folder={open} email={contact?.email ?? ""} category={category} onCategory={setCategory} />
      ) : (
        <LoadState query={folders} loadingText="Loading folders…">
          <FolderList folders={allFolders} onOpen={(id) => update({ mediaFolderId: id })} />
        </LoadState>
      )}
    </div>
  );
}

function FolderList({ folders, onOpen }: { folders: FolderOut[]; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [onlyWithFiles, setOnlyWithFiles] = useState(false);

  const totalFiles = folders.reduce((n, f) => n + f.fileCount, 0);
  const fromClients = folders.reduce((n, f) => n + f.clientUploads, 0);
  const q = query.trim().toLowerCase();
  const shown = folders.filter((f) => (!q || `${f.clientName} ${f.company}`.toLowerCase().includes(q)) && (!onlyWithFiles || f.fileCount));

  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: "Client folders", value: folders.length, tone: "cyan" },
          { label: "Files stored", value: totalFiles, tone: "purple" },
          { label: "Uploaded by clients", value: fromClients, tone: "brand" },
        ]}
      />
      <div className="toolbar">
        <label className="sr-only" htmlFor="md-q">
          Search clients
        </label>
        <Input id="md-q" type="search" className="toolbar__search" placeholder="Search client folders" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Checkbox brand label="Only folders with files" checked={onlyWithFiles} onChange={() => setOnlyWithFiles(!onlyWithFiles)} />
      </div>
      <div className="folder-grid">
        {shown.map((f) => {
          const has = f.fileCount > 0;
          return (
            <button key={f.contactId} type="button" className={cn("folder-card", has && "folder-card--filled")} onClick={() => onOpen(f.contactId)}>
              <div className="cluster cluster--nowrap">
                <span className="folder-card__icon" aria-hidden="true">
                  <FolderGlyph fill={has ? "rgba(255,153,0,0.18)" : "#F2F8FC"} stroke={has ? "#FF9900" : "rgba(8,145,178,0.35)"} />
                  <span className="folder-card__initials">{initials(f.clientName)}</span>
                </span>
                <div className="stack stack--2 u-grow">
                  <span className="text-strong u-truncate">{f.clientName}</span>
                  <span className="text-small">{has ? `${f.fileCount} files` : "No files yet"}</span>
                </div>
              </div>
              <div className="cluster cluster--6">
                {f.clientUploads > 0 && (
                  <Badge tone="neutral" size="xs">
                    From client {f.clientUploads}
                  </Badge>
                )}
                {!has && <span className="text-tiny">Empty folder</span>}
              </div>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <div className="empty-state">No client folders match.</div>}
    </div>
  );
}

function ClientFolder({
  folder,
  email,
  category,
  onCategory,
}: {
  folder: FolderOut;
  email: string;
  category: MediaCategory | "all";
  onCategory: (c: MediaCategory | "all") => void;
}) {
  const { update, notify } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const id = folder.contactId;
  const filesQuery = useMedia(id);
  const files = filesQuery.data ?? [];
  const shown = files.filter((f) => category === "all" || f.category === category);
  const kit = useClientBrandKit(id).data;
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const [error, setError] = useState<unknown>(null);

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    setError(null);
    let n = 0;
    for (const file of picked) {
      try {
        // With "All files" open the API picks the folder from the file type.
        await uploadMedia.mutateAsync({ contactId: id, file, category: category === "all" ? undefined : category });
        n++;
      } catch (err) {
        setError(new Error(`${file.name}: ${errorMessage(err)}`));
      }
    }
    if (n) notify(`${n} file${n > 1 ? "s" : ""} added to ${folder.clientName}’s folder. They can see ${n > 1 ? "them" : "it"} in their portal.`);
  };

  const tabs = [{ value: "all" as const, label: "All files" }, ...MEDIA_CATEGORIES];
  const uploadLabel = category === "all" ? "this folder" : MEDIA_CATEGORIES.find((c) => c.value === category)?.label;

  return (
    <div className="stack stack--16">
      <div className="card card--tight folder-header">
        <Avatar name={folder.clientName} tone={avatarTone(id)} size="lg" />
        <div className="stack stack--2 u-grow">
          <span className="folder-header__name">{folder.clientName}</span>
          <span className="text-small">
            {files.length} files{email && ` · ${email}`}
          </span>
        </div>
        <Button variant="outline" onClick={() => update({ tab: "clients", editContactId: id })}>
          Open profile
        </Button>
        {canWrite && (
          <>
            <label className="btn btn--primary" htmlFor="md-file" aria-disabled={uploadMedia.isPending}>
              {uploadMedia.isPending ? "Uploading…" : `Upload to ${uploadLabel}`}
            </label>
            <input className="sr-only" id="md-file" type="file" multiple onChange={upload} disabled={uploadMedia.isPending} />
          </>
        )}
      </div>
      <FormError error={error ?? deleteMedia.error} />

      <div className="subfolder-grid">
        {tabs.map((t) => {
          const n = t.value === "all" ? files.length : files.filter((f) => f.category === t.value).length;
          return (
            <button key={t.value} type="button" className="subfolder" aria-pressed={category === t.value} onClick={() => onCategory(t.value)}>
              <FolderGlyph width={22} height={19} strokeWidth={2.5} fill={n ? "rgba(255,153,0,0.2)" : "#F2F8FC"} stroke={n ? "#FF9900" : "rgba(8,145,178,0.4)"} />
              <span className="u-grow text-strong">{t.label}</span>
              <span className="subfolder__count">{n}</span>
            </button>
          );
        })}
      </div>

      <LoadState
        query={filesQuery}
        isEmpty={shown.length === 0}
        empty="No files here yet. Upload one, or ask the client to add files from their portal’s Assets page."
      >
        <div className="file-grid">
          {shown.map((f) => (
            <FileCard
              key={f.id}
              name={f.name}
              meta={`${formatFileSize(f.size)} · ${formatShort(f.createdAt)}`}
              onDownload={() => downloadMedia(id, f).catch((err) => setError(err))}
              onDelete={
                canWrite
                  ? () => deleteMedia.mutate({ contactId: id, fileId: f.id }, { onSuccess: () => notify(`${f.name} was deleted.`) })
                  : undefined
              }
              busy={deleteMedia.isPending}
            >
              <Badge tone={f.uploadedBy === "client" ? "purple" : "brand"} size="xs">
                {f.uploadedBy === "client" ? "FROM CLIENT" : "FROM YOUR TEAM"}
              </Badge>
            </FileCard>
          ))}
        </div>
      </LoadState>

      {kit && category === "all" && (kit.colors.length > 0 || kit.headingFont || kit.bodyFont) && (
        <section className="card card--tight brand-kit-row">
          <span className="kicker">BRAND KIT</span>
          <div className="cluster cluster--8">
            {kit.colors.map((hex) => (
              <span className="brand-kit-row__color" key={hex}>
                <span className="brand-kit-row__swatch" style={{ "--swatch": hex } as CSSProperties} />
                <span className="brand-kit-row__hex">{hex}</span>
              </span>
            ))}
          </div>
          <span className="text-body">
            Fonts: <strong>{[kit.headingFont, kit.bodyFont].filter(Boolean).join(" / ") || "not set"}</strong>
          </span>
        </section>
      )}
    </div>
  );
}
