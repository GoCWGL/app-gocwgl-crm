"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { Badge, Button, Field, FileCard, FormError, Icon, Input, LoadState, Select } from "@/components/ui";
import { ASSET_CATEGORIES, type AssetCategory } from "@/data/portal";
import { cn, formatFileSize } from "@/lib/utils";
import { downloadAsset } from "@/utils/api/delivery";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useAssets, useBrandKit, useDeleteAsset, useSaveBrandKit, useUploadAsset } from "@/utils/hooks/useDelivery";
import { usePortal } from "../state/PortalContext";

type BrandKitDraft = { colors: string[]; headingFont: string; bodyFont: string };

export function AssetsSection() {
  const { notify, readOnly } = usePortal();
  const assetsQuery = useAssets();
  const assets = assetsQuery.data ?? [];
  const upload = useUploadAsset();
  const remove = useDeleteAsset();
  const kitQuery = useBrandKit();
  const saveKit = useSaveBrandKit();
  const [folder, setFolder] = useState<AssetCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [uploadTo, setUploadTo] = useState<AssetCategory | "auto">("auto");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [kitDraft, setKitDraft] = useState<BrandKitDraft | null>(null);

  // Uploads go one by one; the API refuses HTML and executables (422) and files over 50 MB.
  const addFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    setDragging(false);
    if (!files.length || readOnly) return;
    setError(null);
    let n = 0;
    for (const file of files) {
      try {
        await upload.mutateAsync({ file, category: uploadTo === "auto" ? undefined : uploadTo });
        n++;
      } catch (err) {
        setError(new Error(`${file.name}: ${fieldErrors(err).file || errorMessage(err)}`));
      }
    }
    if (n) notify(`${n} file${n > 1 ? "s" : ""} uploaded. Your GoCWGL team can see ${n > 1 ? "them" : "it"} now.`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    void addFiles(list).finally(() => (e.target.value = ""));
  };

  const q = query.trim().toLowerCase();
  const files = assets.filter((a) => (folder === "all" || a.category === folder) && (!q || a.name.toLowerCase().includes(q)));
  const folders = [{ value: "all" as const, label: "All files" }, ...ASSET_CATEGORIES];
  const categoryLabel = (c: string) => ASSET_CATEGORIES.find((x) => x.value === c)?.label ?? (c === "deliverables" ? "From your team" : c);

  const brandKit: BrandKitDraft = kitDraft ?? {
    colors: kitQuery.data?.colors ?? [],
    headingFont: kitQuery.data?.headingFont ?? "",
    bodyFont: kitQuery.data?.bodyFont ?? "",
  };
  const editKit = (patch: Partial<BrandKitDraft>) => setKitDraft({ ...brandKit, ...patch });
  const setColors = (colors: string[]) => editKit({ colors });

  return (
    <div className="page-stack">
      {!readOnly && (
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
        <label className="btn btn--primary btn--lg" htmlFor="as-file" aria-disabled={upload.isPending}>
          {upload.isPending ? "Uploading…" : "Browse files"}
        </label>
        <input className="sr-only" id="as-file" type="file" multiple onChange={onPick} disabled={upload.isPending} />
      </div>
      )}
      <FormError error={error ?? remove.error} />

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
                {f.value === "all" ? assets.length : assets.filter((a) => a.category === f.value).length}
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

      <LoadState query={assetsQuery} isEmpty={files.length === 0} empty="Nothing in this folder yet.">
        <div className="file-grid">
          {files.map((a) => (
            <FileCard
              key={a.id}
              name={a.name}
              meta={`${formatFileSize(a.size)} · ${formatShort(a.createdAt)}`}
              onDownload={() => downloadAsset(a).catch(setError)}
              // Clients can delete their own uploads only.
              onDelete={
                !readOnly && a.uploadedBy === "client"
                  ? () => remove.mutate(a.id, { onSuccess: () => notify(`${a.name} was deleted.`) })
                  : undefined
              }
              busy={remove.isPending}
            >
              <Badge tone={a.uploadedBy === "client" ? "neutral" : "brand"} size="xs">
                {a.uploadedBy === "client" ? categoryLabel(a.category) : "FROM YOUR TEAM"}
              </Badge>
            </FileCard>
          ))}
        </div>
      </LoadState>

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
                disabled={readOnly}
                onChange={(e) => setColors(brandKit.colors.map((c, k) => (k === i ? e.target.value : c)))}
              />
              <span className="brand-colors__hex">{hex.toUpperCase()}</span>
              {!readOnly && (
              <button
                type="button"
                className="brand-colors__remove"
                onClick={() => setColors(brandKit.colors.filter((_, k) => k !== i))}
                aria-label={`Remove color ${hex}`}
              >
                Remove
              </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button type="button" className="brand-colors__add" onClick={() => setColors([...brandKit.colors, "#FF9900"])} aria-label="Add a color">
              +
            </button>
          )}
        </div>
        <div className="form-grid">
          <Field label="Heading font" htmlFor="as-fh">
            <Input
              id="as-fh"
              value={brandKit.headingFont}
              readOnly={readOnly}
              onChange={(e) => editKit({ headingFont: e.target.value })}
            />
          </Field>
          <Field label="Body font" htmlFor="as-fb">
            <Input
              id="as-fb"
              value={brandKit.bodyFont}
              readOnly={readOnly}
              onChange={(e) => editKit({ bodyFont: e.target.value })}
            />
          </Field>
        </div>
        <FormError error={saveKit.error} />
        {!readOnly && (
          <Button
            variant="primary"
            className="u-self-end"
            disabled={!kitDraft || saveKit.isPending}
            onClick={() =>
              saveKit.mutate(
                { colors: brandKit.colors.map((c) => c.toUpperCase()), headingFont: brandKit.headingFont, bodyFont: brandKit.bodyFont },
                { onSuccess: () => (setKitDraft(null), notify("Brand kit saved and shared with your GoCWGL team.")) },
              )
            }
          >
            {saveKit.isPending ? "Saving…" : "Save brand kit"}
          </Button>
        )}
      </section>
      <p className="text-small">Everything here is shared with your GoCWGL team automatically.</p>
    </div>
  );
}
