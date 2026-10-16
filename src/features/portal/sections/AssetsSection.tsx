"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { Button, Field, FileCard, Icon, Input, Select } from "@/components/ui";
import { ASSET_CATEGORIES, type Asset, type AssetCategory } from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import { cn, fileExtension, formatFileSize, newId } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

/** Guess a folder from the file name and extension. */
function autoCategory(name: string): AssetCategory {
  const ext = fileExtension(name).toLowerCase();
  if (/logo|brand-mark|icon/i.test(name) && /svg|png|jpg|jpeg|webp|ai|eps|pdf/.test(ext)) return "logos";
  if (/^(png|jpg|jpeg|webp|gif|heic|svg)$/.test(ext)) return "photos";
  if (/^(mp4|mov|webm|avi|m4v)$/.test(ext)) return "videos";
  if (/^(pdf|doc|docx|txt|ppt|pptx|xls|xlsx|csv)$/.test(ext)) return "docs";
  return "other";
}

export function AssetsSection() {
  const { state, update, notify } = usePortal();
  const [folder, setFolder] = useState<AssetCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [uploadTo, setUploadTo] = useState<AssetCategory | "auto">("auto");
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const added: Asset[] = files.map((f) => ({
      id: newId(),
      name: f.name,
      cat: uploadTo === "auto" ? autoCategory(f.name) : uploadTo,
      size: f.size,
      date: TODAY_SHORT,
      url: URL.createObjectURL(f),
      isImage: f.type.startsWith("image/"),
    }));
    const n = added.length;
    update((s) => ({
      assets: [...added, ...s.assets],
      toast: `${n} file${n > 1 ? "s" : ""} uploaded. Your GoCWGL team can see ${n > 1 ? "them" : "it"} now.`,
    }));
    setDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const q = query.trim().toLowerCase();
  const files = state.assets.filter((a) => (folder === "all" || a.cat === folder) && (!q || a.name.toLowerCase().includes(q)));
  const folders = [{ value: "all" as const, label: "All files" }, ...ASSET_CATEGORIES];

  const setColors = (colors: string[]) => update((s) => ({ brandKit: { ...s.brandKit, colors } }));
  const { brandKit } = state;

  return (
    <div className="page-stack">
      <div
        className={cn("drop-zone", dragging && "drop-zone--active")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="drop-zone__icon" aria-hidden="true">
          <Icon name="upload" size={26} />
        </span>
        <div className="stack stack--4 u-grow">
          <span className="drop-zone__title">Drop your files here</span>
          <span className="text-muted">
            Logos, photos, videos, brand guides, anything we should use in your system. Up to 50 MB per file.
          </span>
        </div>
        <Field label={<span className="kicker kicker--sm">SAVE TO</span>} htmlFor="as-cat">
          <Select id="as-cat" value={uploadTo} onChange={(e) => setUploadTo(e.target.value as AssetCategory | "auto")}>
            <option value="auto">Sort automatically</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <label className="btn btn--primary btn--lg" htmlFor="as-file">
          Browse files
        </label>
        <input className="sr-only" id="as-file" type="file" multiple onChange={onPick} />
      </div>

      <div className="toolbar">
        <div className="cluster cluster--6" role="group" aria-label="Folders">
          {folders.map((f) => (
            <button
              key={f.value}
              type="button"
              className="chip chip--square"
              aria-pressed={folder === f.value}
              onClick={() => setFolder(f.value)}
            >
              <Icon name="folder" size={15} />
              {f.label}
              <span className="chip__count">
                {f.value === "all" ? state.assets.length : state.assets.filter((a) => a.cat === f.value).length}
              </span>
            </button>
          ))}
        </div>
        <span className="u-spacer" />
        <label className="sr-only" htmlFor="as-q">
          Search files
        </label>
        <Input id="as-q" type="search" placeholder="Search files" className="toolbar__search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="file-grid">
        {files.map((a) => (
          <FileCard
            key={a.id}
            name={a.name}
            meta={`${formatFileSize(a.size)} · ${a.date}`}
            url={a.url}
            onDelete={() => update((s) => ({ assets: s.assets.filter((x) => x.id !== a.id), toast: `${a.name} was deleted.` }))}
          >
            <Select
              size="sm"
              aria-label={`Folder for ${a.name}`}
              value={a.cat}
              options={ASSET_CATEGORIES}
              onChange={(e) =>
                update((s) => ({
                  assets: s.assets.map((x) => (x.id === a.id ? { ...x, cat: e.target.value as AssetCategory } : x)),
                }))
              }
            />
          </FileCard>
        ))}
      </div>
      {files.length === 0 && <div className="empty-state">Nothing in this folder yet.</div>}

      <section className="card">
        <div className="stack stack--2">
          <span className="kicker">BRAND KIT</span>
          <span className="text-muted">Your colors and fonts. We use these on your pages, forms and emails.</span>
        </div>
        <div className="brand-colors">
          {brandKit.colors.map((hex, i) => (
            <div className="brand-colors__item" key={i}>
              <input
                className="brand-colors__picker"
                type="color"
                aria-label={`Brand color ${i + 1}`}
                value={hex}
                onChange={(e) => setColors(brandKit.colors.map((c, k) => (k === i ? e.target.value : c)))}
              />
              <span className="brand-colors__hex">{hex.toUpperCase()}</span>
              <button
                type="button"
                className="brand-colors__remove"
                onClick={() => setColors(brandKit.colors.filter((_, k) => k !== i))}
                aria-label={`Remove color ${hex}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="brand-colors__add" onClick={() => setColors([...brandKit.colors, "#FF9900"])} aria-label="Add a color">
            +
          </button>
        </div>
        <div className="form-grid">
          <Field label="Heading font" htmlFor="as-fh">
            <Input
              id="as-fh"
              value={brandKit.headingFont}
              onChange={(e) => update((s) => ({ brandKit: { ...s.brandKit, headingFont: e.target.value } }))}
            />
          </Field>
          <Field label="Body font" htmlFor="as-fb">
            <Input
              id="as-fb"
              value={brandKit.bodyFont}
              onChange={(e) => update((s) => ({ brandKit: { ...s.brandKit, bodyFont: e.target.value } }))}
            />
          </Field>
        </div>
        <Button variant="primary" className="u-self-end" onClick={() => notify("Brand kit saved and shared with your GoCWGL team.")}>
          Save brand kit
        </Button>
      </section>
      <p className="text-small">Everything here is shared with your GoCWGL team automatically.</p>
    </div>
  );
}
