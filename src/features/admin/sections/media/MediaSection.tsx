"use client";

import { useState, type ChangeEvent, type CSSProperties } from "react";
import { Avatar, Badge, Button, Checkbox, FileCard, FolderGlyph, Input, StatGrid } from "@/components/ui";
import { BRAND_KITS, MEDIA_CATEGORIES, type Contact, type MediaCategory, type MediaFile } from "@/data/admin";
import { dayNumber, TODAY_SHORT } from "@/lib/dates";
import { avatarTone } from "@/lib/tones";
import { cn, fileExtension, formatFileSize, newId } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

/** Guess a folder for an uploaded file. */
function autoCategory(name: string): MediaCategory {
  const ext = fileExtension(name).toLowerCase();
  if (/logo/i.test(name)) return "logos";
  if (/^(png|jpg|jpeg|webp|gif|heic|svg)$/.test(ext)) return "photos";
  if (/^(mp4|mov|webm|m4v)$/.test(ext)) return "videos";
  if (/^(pdf|doc|docx|txt|ppt|pptx|xls|xlsx|csv)$/.test(ext)) return "docs";
  return "other";
}

/** One media folder per client: paid clients plus anyone with files. */
export function MediaSection() {
  const { state, update } = useAdmin();
  const client = state.mediaFolderId ? state.contacts.find((c) => c.id === state.mediaFolderId) : undefined;
  const [category, setCategory] = useState<MediaCategory | "all">("all");

  const categoryLabel = MEDIA_CATEGORIES.find((c) => c.value === category)?.label;
  const crumbs = client
    ? [
        { label: "Client Media", go: () => update({ mediaFolderId: 0 }) },
        { label: client.name, go: () => setCategory("all") },
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

      {client ? (
        <ClientFolder key={client.id} client={client} category={category} onCategory={setCategory} />
      ) : (
        <FolderList onOpen={(id) => update({ mediaFolderId: id })} />
      )}
    </div>
  );
}

function FolderList({ onOpen }: { onOpen: (id: number) => void }) {
  const { state } = useAdmin();
  const { media, contacts } = state;
  const [query, setQuery] = useState("");
  const [onlyWithFiles, setOnlyWithFiles] = useState(false);

  const filesOf = (id: number) => media[id] ?? [];
  const folders = contacts.filter((c) => c.stage === "paid" || filesOf(c.id).length);
  const totalFiles = Object.values(media).reduce((n, list) => n + list.length, 0);
  const fromClientsThisWeek = Object.values(media)
    .flat()
    .filter((f) => f.by === "client" && /Oct (8|9|1[0-4])/.test(f.date)).length;

  const q = query.trim().toLowerCase();
  const shown = folders.filter((c) => (!q || c.name.toLowerCase().includes(q)) && (!onlyWithFiles || filesOf(c.id).length));

  return (
    <div className="stack stack--16">
      <StatGrid
        items={[
          { label: "Client folders", value: folders.length, tone: "cyan" },
          { label: "Files stored", value: totalFiles, tone: "purple" },
          { label: "Uploaded by clients this week", value: fromClientsThisWeek, tone: "brand" },
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
        {shown.map((c) => {
          const files = filesOf(c.id);
          const has = files.length > 0;
          const counts = MEDIA_CATEGORIES.map((cat) => [cat.label, files.filter((f) => f.cat === cat.value).length] as const).filter(([, n]) => n);
          const last = files.map((f) => f.date).sort((a, b) => dayNumber(b) - dayNumber(a))[0];
          return (
            <button key={c.id} type="button" className={cn("folder-card", has && "folder-card--filled")} onClick={() => onOpen(c.id)}>
              <div className="cluster cluster--nowrap">
                <span className="folder-card__icon" aria-hidden="true">
                  <FolderGlyph fill={has ? "rgba(255,153,0,0.18)" : "#F2F8FC"} stroke={has ? "#FF9900" : "rgba(8,145,178,0.35)"} />
                  <span className="folder-card__initials">{c.name.split(" ").map((w) => w[0]).join("")}</span>
                </span>
                <div className="stack stack--2 u-grow">
                  <span className="text-strong u-truncate">{c.name}</span>
                  <span className="text-small">{has ? `${files.length} files · updated ${last}` : "No files yet"}</span>
                </div>
              </div>
              <div className="cluster cluster--6">
                {counts.slice(0, 4).map(([label, n]) => (
                  <Badge key={label} tone="neutral" size="xs">
                    {label} {n}
                  </Badge>
                ))}
                {!has && <span className="text-tiny">Empty folder</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClientFolder({
  client,
  category,
  onCategory,
}: {
  client: Contact;
  category: MediaCategory | "all";
  onCategory: (c: MediaCategory | "all") => void;
}) {
  const { state, update, notify } = useAdmin();
  const files = state.media[client.id] ?? [];
  const shown = files.filter((f) => category === "all" || f.cat === category);
  const kit = BRAND_KITS[client.id];
  const setFiles = (fn: (list: MediaFile[]) => MediaFile[]) =>
    update((s) => ({ media: { ...s.media, [client.id]: fn(s.media[client.id] ?? []) } }));

  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const added: MediaFile[] = picked.map((f) => ({
      id: newId(),
      name: f.name,
      cat: category === "all" ? autoCategory(f.name) : category,
      size: f.size,
      date: TODAY_SHORT,
      by: "team",
      url: URL.createObjectURL(f),
    }));
    setFiles((list) => [...added, ...list]);
    const n = added.length;
    notify(`${n} file${n > 1 ? "s" : ""} added to ${client.name}’s folder. They can see ${n > 1 ? "them" : "it"} in their portal.`);
    e.target.value = "";
  };

  const tabs = [{ value: "all" as const, label: "All files" }, ...MEDIA_CATEGORIES];
  const uploadLabel = category === "all" ? "this folder" : MEDIA_CATEGORIES.find((c) => c.value === category)?.label;

  return (
    <div className="stack stack--16">
      <div className="card card--tight folder-header">
        <Avatar name={client.name} tone={avatarTone(client.id)} size="lg" />
        <div className="stack stack--2 u-grow">
          <span className="folder-header__name">{client.name}</span>
          <span className="text-small">
            {files.length} files · {client.email}
          </span>
        </div>
        <Button variant="outline" onClick={() => update({ tab: "clients", editContactId: client.id })}>
          Open profile
        </Button>
        <label className="btn btn--primary" htmlFor="md-file">
          Upload to {uploadLabel}
        </label>
        <input className="sr-only" id="md-file" type="file" multiple onChange={upload} />
      </div>

      <div className="subfolder-grid">
        {tabs.map((t) => {
          const n = t.value === "all" ? files.length : files.filter((f) => f.cat === t.value).length;
          return (
            <button key={t.value} type="button" className="subfolder" aria-pressed={category === t.value} onClick={() => onCategory(t.value)}>
              <FolderGlyph width={22} height={19} strokeWidth={2.5} fill={n ? "rgba(255,153,0,0.2)" : "#F2F8FC"} stroke={n ? "#FF9900" : "rgba(8,145,178,0.4)"} />
              <span className="u-grow text-strong">{t.label}</span>
              <span className="subfolder__count">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="file-grid">
        {shown.map((f) => (
          <FileCard
            key={f.id}
            name={f.name}
            meta={`${formatFileSize(f.size)} · ${f.date}`}
            url={f.url}
            onDelete={() => {
              setFiles((list) => list.filter((x) => x.id !== f.id));
              notify(`${f.name} was deleted.`);
            }}
          >
            <Badge tone={f.by === "client" ? "purple" : "brand"} size="xs">
              {f.by === "client" ? "FROM CLIENT" : "FROM YOUR TEAM"}
            </Badge>
          </FileCard>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="empty-state">No files here yet. Upload one, or ask the client to add files from their portal’s Assets page.</div>
      )}

      {kit && category === "all" && (
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
            Fonts: <strong>{kit.fonts}</strong>
          </span>
        </section>
      )}
    </div>
  );
}
