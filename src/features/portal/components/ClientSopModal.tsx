"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconButton, IconTile, Input, Modal, SegmentedControl, Textarea } from "@/components/ui";
import { formatFileSize, normalizeUrl } from "@/lib/utils";
import type { ClientSopKind, ClientSopOut, SopVa } from "@/utils/api/models";
import { useAddClientSop, useReplaceClientSopFile, useUpdateClientSop, useUploadClientSop } from "@/utils/hooks/useSops";
import { CLIENT_SOP_KINDS } from "./ClientSopList";
import { VaSharePicker } from "./VaSharePicker";

const ACCEPT = ".pdf,.doc,.docx,.txt,.csv,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm";
const MAX_MB = 50;

/**
 * Client portal › SOPs: add or edit one of your SOPs. Write it here (steps and notes), upload a document, or link to
 * one elsewhere (Google Docs, Notion, Loom…), then pick the VAs who can see it. The type is set when it's added.
 */
export function ClientSopModal({
  sop,
  vas,
  categories,
  onClose,
  onSaved,
}: {
  sop: ClientSopOut | null;
  vas: SopVa[];
  categories: string[];
  onClose: () => void;
  onSaved: (title: string, isNew: boolean) => void;
}) {
  const [kind, setKind] = useState<ClientSopKind>(sop?.kind ?? "written");
  const [title, setTitle] = useState(sop?.title ?? "");
  const [category, setCategory] = useState(sop?.category ?? "");
  const [summary, setSummary] = useState(sop?.summary ?? "");
  const [steps, setSteps] = useState<string[]>(sop?.steps.length ? sop.steps : ["", ""]);
  const [body, setBody] = useState(sop?.body ?? "");
  const [url, setUrl] = useState(sop?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [vaIds, setVaIds] = useState<string[]>(sop?.vaIds ?? []);
  const [tried, setTried] = useState(false);

  const add = useAddClientSop();
  const upload = useUploadClientSop();
  const update = useUpdateClientSop();
  const replace = useReplaceClientSopFile();
  const pending = add.isPending || upload.isPending || update.isPending || replace.isPending;
  const saveError = add.error ?? upload.error ?? update.error ?? replace.error;

  const link = normalizeUrl(url);
  const linkOk = !link || /^https?:\/\/\S+$/.test(link);
  const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
  const tooBig = !!file && file.size > MAX_MB * 1024 * 1024;
  const error =
    kind !== "file" && !title.trim()
      ? "Give your SOP a name."
      : kind === "written" && !cleanSteps.length && !body.trim()
        ? "Add at least one step or some notes."
        : kind === "link" && !link
          ? "Add the link to your SOP."
          : !linkOk
            ? "Links start with https://"
            : kind === "file" && !sop && !file
              ? "Choose the file to upload."
              : tooBig
                ? `That file is over ${MAX_MB} MB.`
                : "";

  const setStep = (i: number, v: string) => setSteps((s) => s.map((x, j) => (j === i ? v : x)));
  const moveStep = (i: number, by: number) =>
    setSteps((s) => {
      const next = [...s];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (error) return;
    const common = { title: title.trim(), category: category.trim(), summary: summary.trim(), vaIds };
    const written = kind === "written" ? { steps: cleanSteps, body: body.trim(), url: link } : {};
    const linked = kind === "link" ? { url: link } : {};
    try {
      if (!sop) {
        const saved =
          kind === "file" && file
            ? await upload.mutateAsync({ file, meta: common })
            : await add.mutateAsync({ kind: kind === "link" ? "link" : "written", ...common, ...written, ...linked });
        onSaved(saved.title, true);
      } else {
        // A file SOP keeps its name when left blank (it was the file's name).
        let saved = await update.mutateAsync({ id: sop.id, body: { ...common, title: common.title || sop.title, ...written, ...linked } });
        if (file) saved = await replace.mutateAsync({ id: sop.id, file });
        onSaved(saved.title, false);
      }
    } catch {
      // Shown by FormError.
    }
  };

  const k = CLIENT_SOP_KINDS[kind];
  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      onSubmit={submit}
      titleId="client-sop"
      kicker="YOUR SOPS"
      title={sop ? `Edit ${sop.title}` : "Add an SOP"}
      subtitle={sop ? undefined : "Write it here, upload a document, or link to one. Then pick the VAs who can see it."}
      media={
        <IconTile tone={k.tone} size="lg">
          <Icon name={k.icon} size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending || (tried && !!error)}>
            {pending ? (file ? "Uploading…" : "Saving…") : sop ? "Save changes" : "Add SOP"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        {!sop && (
          <SegmentedControl<ClientSopKind>
            kind="radio"
            label="How you’ll add it"
            variant="soft"
            value={kind}
            onChange={(v) => (setKind(v), setTried(false))}
            options={(Object.keys(CLIENT_SOP_KINDS) as ClientSopKind[]).map((v) => ({ value: v, label: CLIENT_SOP_KINDS[v].label }))}
          />
        )}

        {kind === "file" && (
          <Field
            label={sop ? "File" : "Document"}
            htmlFor="csop-file"
            required={!sop}
            hint={`PDF, Word, PowerPoint, Excel, an image or a video, up to ${MAX_MB} MB.`}
          >
            <label className="csop-file" htmlFor="csop-file">
              <Icon name="upload" size={16} />
              <span className="stack stack--2 u-grow u-minw0">
                <span className="text-strong u-truncate">
                  {file ? file.name : sop?.fileName || "Choose a file"}
                </span>
                <span className="text-small">
                  {file ? formatFileSize(file.size) : sop ? "Choose a new file to replace it" : "Click to pick one from your computer"}
                </span>
              </span>
              <span className="btn btn--outline btn--sm">{file || sop ? "Change" : "Browse"}</span>
            </label>
            <input
              id="csop-file"
              className="sr-only"
              type="file"
              accept={ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title.trim() && !sop) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </Field>
        )}

        <div className="form-grid">
          <Field label="Name" htmlFor="csop-title" required={kind !== "file"}>
            <Input
              id="csop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder={kind === "link" ? "Refund process" : kind === "file" ? "Uses the file’s name if left blank" : "Daily inbox check"}
              autoFocus={kind !== "file"}
            />
          </Field>
          <Field label="Category" htmlFor="csop-cat" hint="e.g. Email, Social media">
            <Input id="csop-cat" list="csop-categories" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
            <datalist id="csop-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        {kind === "link" && (
          <Field label="Link" htmlFor="csop-url" required hint="Google Docs, Notion, Loom, Dropbox… Make sure your VAs can open it.">
            <Input
              id="csop-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrl(link)}
              maxLength={500}
              placeholder="https://docs.google.com/…"
              inputMode="url"
            />
          </Field>
        )}

        <Field label="Summary" htmlFor="csop-summary" hint="One line: what this SOP is for.">
          <Input id="csop-summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} />
        </Field>

        {kind === "written" && (
          <>
            <div className="stack stack--8">
              <span className="field__label">Steps</span>
              <ol className="sop-step-editor">
                {steps.map((step, i) => (
                  <li key={i}>
                    <span className="sop-steps__n">{i + 1}</span>
                    <Textarea
                      rows={2}
                      aria-label={`Step ${i + 1}`}
                      placeholder={i === 0 ? "Open the shared inbox" : "Next step"}
                      value={step}
                      maxLength={2000}
                      onChange={(e) => setStep(i, e.target.value)}
                    />
                    <span className="sop-step-editor__tools">
                      <IconButton label="Move up" size="sm" ghost disabled={i === 0} onClick={() => moveStep(i, -1)}>
                        <Icon name="chevronUp" size={14} />
                      </IconButton>
                      <IconButton label="Move down" size="sm" ghost disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)}>
                        <Icon name="chevronDown" size={14} />
                      </IconButton>
                      <IconButton label="Remove step" size="sm" ghost onClick={() => setSteps((s) => s.filter((_, j) => j !== i))}>
                        <Icon name="close" size={14} />
                      </IconButton>
                    </span>
                  </li>
                ))}
              </ol>
              <span>
                <Button size="sm" variant="outline" onClick={() => setSteps((s) => [...s, ""])} disabled={steps.length >= 100}>
                  <Icon name="plus" size={13} /> Add step
                </Button>
              </span>
            </div>
            <Field label="Notes" htmlFor="csop-body" hint="Tips, who to ask, and what “done” looks like.">
              <Textarea id="csop-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
            </Field>
            <Field label="Video walkthrough" htmlFor="csop-video" hint="Optional: a Loom or YouTube link.">
              <Input id="csop-video" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrl(link)} maxLength={500} placeholder="https://loom.com/…" inputMode="url" />
            </Field>
          </>
        )}

        <Field label="Who can see this">
          <VaSharePicker
            vas={vas}
            value={vaIds}
            onChange={setVaIds}
            label="Who can see this"
            people="VAs"
            onlyYou="Only you, for now"
            nobody="No VA is working with you yet. Save it now and share it once you have a VA."
          />
        </Field>

        {tried && error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
        <FormError error={saveError} />
      </div>
    </Modal>
  );
}
