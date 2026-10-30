"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmbedThread } from "@/components/embeds/EmbedThread";
import { Badge, Button, Field, FormError, Icon, IconTile, Input, Modal, SegmentedControl, Textarea } from "@/components/ui";
import { EMBED_KINDS, type EmbedKind } from "@/data/embeds";
import { copyToClipboard } from "@/lib/utils";
import type { EmbedOut, FunnelOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { useCommentOnEmbed, useCreateEmbed, useDeleteEmbed, useEmbeds, useUpdateEmbed } from "@/utils/hooks/useDelivery";
import { usePortalFunnels } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

type Draft = { id: string; kind: EmbedKind; label: string; code: string };

const EMBED_PREVIEW_READY = "gocwgl:embed-preview-ready";

const kindOf = (k: string) => EMBED_KINDS.find((x) => x.kind === k) ?? EMBED_KINDS[3];

/** Embed codes look like HTML (<iframe>, <script>, <div>…) or a plain widget link. */
const looksLikeEmbed = (code: string) => /<[a-z!][\s\S]*>/i.test(code) || /^https?:\/\/\S+$/i.test(code.trim());

/**
 * Embed code is untrusted HTML: it is only ever rendered inside a sandboxed iframe
 * (scripts and forms run, but it can't reach this page, its cookies or the access token).
 * The frame is /embed-preview.html rather than srcdoc, so the code gets that page's looser
 * Content-Security-Policy instead of inheriting this one. The page says when it's ready for the code.
 */
function SandboxedPreview({ code }: { code: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = /^https?:\/\/\S+$/i.test(code.trim())
    ? `<iframe src="${code.trim().replace(/"/g, "&quot;")}" style="width:100%;height:100%;border:0"></iframe>`
    : code;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const target = frame.current?.contentWindow;
      // The sandboxed page has no origin of its own, so "*" is the only target that reaches it.
      if (target && e.source === target && e.data === EMBED_PREVIEW_READY) target.postMessage(html, "*");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [html]);
  return (
    <iframe
      key={html}
      ref={frame}
      className="embed-preview"
      title="Embed code preview"
      sandbox="allow-scripts allow-forms"
      src="/embed-preview.html"
    />
  );
}

export function EmbedCodeDialog() {
  const { state, update } = usePortal();
  const funnel = usePortalFunnels().data?.find((f) => f.id === state.embedFunnelId);
  if (!funnel) return null;
  return <EmbedCodePanel key={funnel.id} funnel={funnel} onClose={() => update({ embedFunnelId: "" })} />;
}

function EmbedCodePanel({ funnel, onClose }: { funnel: FunnelOut; onClose: () => void }) {
  const { notify, readOnly } = usePortal();
  const all = useEmbeds();
  const embeds = (all.data ?? []).filter((e) => e.funnelId === funnel.id);
  const create = useCreateEmbed();
  const update = useUpdateEmbed();
  const remove = useDeleteEmbed();
  const comment = useCommentOnEmbed();
  const blank = (): Draft => ({ id: "", kind: "form", label: "", code: "" });
  const [draft, setDraft] = useState<Draft | null>(() => (embeds.length || readOnly ? null : blank()));
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [previewId, setPreviewId] = useState("");

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setError("");
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const label = draft.label.trim();
    const code = draft.code.trim();
    if (!label || !code) return setError("Add a name and paste the embed code.");
    if (!looksLikeEmbed(code)) {
      return setError("That doesn’t look like embed code. Copy the full snippet from your CRM (it usually starts with <iframe or <script).");
    }
    const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));
    const existing = embeds.find((x) => x.id === draft.id);
    if (existing) {
      // Edits keep the team's comments; let the team know a flagged code was replaced so they can check it again.
      update.mutate(
        { id: existing.id, body: { label, code } },
        {
          onSuccess: () => {
            if (existing.hasIssue && code !== existing.code) comment.mutate({ id: existing.id, text: "I updated the code — can you check it again?" });
            setDraft(null);
            notify(`Updated “${label}”.`);
          },
          onError,
        },
      );
    } else {
      create.mutate(
        { funnelId: funnel.id, kind: draft.kind, label, code },
        {
          onSuccess: () => {
            setDraft(null);
            notify(`Saved “${label}”. Your GoCWGL team can now see it.`);
          },
          onError,
        },
      );
    }
  };

  const removeEmbed = (x: EmbedOut) => {
    if (confirmId !== x.id) return setConfirmId(x.id);
    remove.mutate(x.id, {
      onSuccess: () => {
        setConfirmId("");
        notify(`Removed “${x.label}”.`);
      },
    });
  };

  return (
    <Modal
      open
      width={660}
      onClose={onClose}
      onSubmit={save}
      titleId="embed-title"
      kicker="EMBED CODES"
      title={funnel.name}
      subtitle="Paste the embed codes for your forms, surveys, calendars or other widgets from your CRM. Your GoCWGL team uses them to build and connect this funnel."
      media={
        <IconTile brand size="lg">
          <Icon name="code" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-small">
            {embeds.length} embed code{embeds.length === 1 ? "" : "s"} on this funnel
          </span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      {embeds.length > 0 && (
        <div className="stack stack--8">
          {embeds.map((x) => (
            <div className="embed-item" data-issue={x.hasIssue || undefined} key={x.id}>
              <div className="embed-item__head">
                <Badge tone="cyan" mono>
                  {kindOf(x.kind).label.toUpperCase()}
                </Badge>
                <span className="text-strong u-grow">{x.label}</span>
                {x.hasIssue && (
                  <Badge tone="red" mono dot>
                    NEEDS FIX
                  </Badge>
                )}
                <span className="text-tiny">Updated {formatShort(x.updatedAt)}</span>
              </div>
              <pre className="code-block embed-code embed-code--short">{x.code}</pre>
              {previewId === x.id && <SandboxedPreview code={x.code} />}
              <div className="cluster cluster--8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    copyToClipboard(x.code);
                    setCopiedId(x.id);
                  }}
                >
                  <Icon name={copiedId === x.id ? "check" : "copy"} size={14} />
                  {copiedId === x.id ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" aria-pressed={previewId === x.id} onClick={() => setPreviewId(previewId === x.id ? "" : x.id)}>
                  <Icon name="eye" size={14} />
                  {previewId === x.id ? "Hide preview" : "Preview"}
                </Button>
                {!readOnly && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setDraft({ id: x.id, kind: x.kind as EmbedKind, label: x.label, code: x.code });
                        setError("");
                      }}
                    >
                      <Icon name="edit" size={14} />
                      Edit
                    </Button>
                    <Button variant={confirmId === x.id ? "danger" : "link"} size="sm" disabled={remove.isPending} onClick={() => removeEmbed(x)}>
                      {confirmId === x.id ? "Click again to remove" : "Remove"}
                    </Button>
                  </>
                )}
              </div>
              {(x.comments?.length ?? 0) > 0 && (
                <div className="embed-item__thread">
                  <span className="kicker kicker--sm kicker--muted">
                    {x.hasIssue ? "YOUR TEAM FOUND A PROBLEM — EDIT THE CODE TO FIX IT" : "COMMENTS FROM YOUR TEAM"}
                  </span>
                  <EmbedThread embed={x} as="client" readOnly={readOnly} onPost={(text) => comment.mutateAsync({ id: x.id, text })} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="inset embed-form">
          <span className="kicker">{draft.id ? "EDIT EMBED CODE" : "ADD AN EMBED CODE"}</span>
          {!draft.id && (
          <SegmentedControl
            label="What is it?"
            kind="radio"
            size="sm"
            variant="soft"
            value={draft.kind}
            onChange={(kind) => set({ kind })}
            options={EMBED_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
          />
          )}
          <Field label="Name" htmlFor="embed-label" required>
            <Input
              id="embed-label"
              value={draft.label}
              aria-invalid={!!error && !draft.label.trim()}
              onChange={(e) => set({ label: e.target.value })}
              placeholder={kindOf(draft.kind).placeholder}
            />
          </Field>
          <Field label="Embed code" htmlFor="embed-code" required>
            <Textarea
              id="embed-code"
              rows={6}
              className="embed-paste"
              spellCheck={false}
              value={draft.code}
              aria-invalid={!!error && (!draft.code.trim() || !looksLikeEmbed(draft.code))}
              onChange={(e) => set({ code: e.target.value })}
              placeholder={'<iframe src="https://…"></iframe>\n<script src="https://…"></script>'}
            />
          </Field>
          <span className="text-small">
            In your CRM, open the form, survey or calendar and look for <strong>Embed</strong>, <strong>Share</strong> or <strong>Integrate</strong>.
            Copy the whole snippet and paste it here.
          </span>
          {error && (
            <p className="text-error" role="alert">
              {error}
            </p>
          )}
          {draft.code.trim() && looksLikeEmbed(draft.code) && <SandboxedPreview code={draft.code} />}
          <FormError error={remove.error} />
          <div className="cluster cluster--8">
            <Button type="submit" variant="primary" size="sm" disabled={create.isPending || update.isPending}>
              {draft.id ? "Save changes" : "Save embed code"}
            </Button>
            {(embeds.length > 0 || !!draft.id) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(null);
                  setError("");
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        !readOnly && (
          <Button variant="dashed" onClick={() => setDraft(blank())}>
            + Add an embed code
          </Button>
        )
      )}
    </Modal>
  );
}
