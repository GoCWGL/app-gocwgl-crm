"use client";

import { useState, type FormEvent } from "react";
import { EmbedThread } from "@/components/embeds/EmbedThread";
import { Badge, Button, Field, Icon, IconTile, Input, Modal, SegmentedControl, Textarea } from "@/components/ui";
import { EMBED_KINDS, type ClientEmbed, type EmbedKind } from "@/data/embeds";
import { PORTAL_CLIENT_ID, type Funnel } from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import { commentOnEmbed, setClientEmbeds, useClientEmbeds } from "@/lib/embedStore";
import { copyToClipboard, newId } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

type Draft = { id: number; kind: EmbedKind; label: string; code: string };

const kindOf = (k: EmbedKind) => EMBED_KINDS.find((x) => x.kind === k)!;

/** Embed codes look like HTML (<iframe>, <script>, <div>…) or a plain widget link. */
const looksLikeEmbed = (code: string) => /<[a-z!][\s\S]*>/i.test(code) || /^https?:\/\/\S+$/i.test(code.trim());

export function EmbedCodeDialog() {
  const { state, update } = usePortal();
  const funnel = state.funnels.find((f) => f.id === state.embedFunnelId);
  if (!funnel) return null;
  return <EmbedCodePanel key={funnel.id} funnel={funnel} onClose={() => update({ embedFunnelId: 0 })} />;
}

function EmbedCodePanel({ funnel, onClose }: { funnel: Funnel; onClose: () => void }) {
  const { state, notify } = usePortal();
  const clientName = state.profile.name.split(" ")[0] || "You";
  const embeds = useClientEmbeds(PORTAL_CLIENT_ID).filter((e) => e.funnelId === funnel.id);
  const blank = (): Draft => ({ id: 0, kind: "form", label: "", code: "" });
  const [draft, setDraft] = useState<Draft | null>(() => (embeds.length ? null : blank()));
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(0);
  const [confirmId, setConfirmId] = useState(0);

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

    const fields = { funnelId: funnel.id, funnel: funnel.name, kind: draft.kind, label, code, updated: TODAY_SHORT };
    const existing = embeds.find((x) => x.id === draft.id);
    setClientEmbeds(PORTAL_CLIENT_ID, (list) =>
      // Edits keep the team's comments and error flag.
      existing ? list.map((x) => (x.id === existing.id ? { ...x, ...fields } : x)) : [...list, { id: newId(), ...fields } satisfies ClientEmbed],
    );
    // Let the team know a flagged code was replaced so they can check it again.
    if (existing?.issue && code !== existing.code) {
      commentOnEmbed(PORTAL_CLIENT_ID, draft.id, { from: "client", who: clientName, text: "I updated the code — can you check it again?" });
    }
    setDraft(null);
    notify(draft.id ? `Updated “${label}”.` : `Saved “${label}”. Your GoCWGL team can now see it.`);
  };

  const remove = (x: ClientEmbed) => {
    if (confirmId !== x.id) return setConfirmId(x.id);
    setClientEmbeds(PORTAL_CLIENT_ID, (list) => list.filter((y) => y.id !== x.id));
    setConfirmId(0);
    notify(`Removed “${x.label}”.`);
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
            <div className="embed-item" data-issue={x.issue || undefined} key={x.id}>
              <div className="embed-item__head">
                <Badge tone="cyan" mono>
                  {kindOf(x.kind).label.toUpperCase()}
                </Badge>
                <span className="text-strong u-grow">{x.label}</span>
                {x.issue && (
                  <Badge tone="red" mono dot>
                    NEEDS FIX
                  </Badge>
                )}
                <span className="text-tiny">Updated {x.updated}</span>
              </div>
              <pre className="code-block embed-code embed-code--short">{x.code}</pre>
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
                <Button
                  size="sm"
                  onClick={() => {
                    setDraft({ id: x.id, kind: x.kind, label: x.label, code: x.code });
                    setError("");
                  }}
                >
                  <Icon name="edit" size={14} />
                  Edit
                </Button>
                <Button variant={confirmId === x.id ? "danger" : "link"} size="sm" onClick={() => remove(x)}>
                  {confirmId === x.id ? "Click again to remove" : "Remove"}
                </Button>
              </div>
              {(x.comments?.length ?? 0) > 0 && (
                <div className="embed-item__thread">
                  <span className="kicker kicker--sm kicker--muted">
                    {x.issue ? "YOUR TEAM FOUND A PROBLEM — EDIT THE CODE TO FIX IT" : "COMMENTS FROM YOUR TEAM"}
                  </span>
                  <EmbedThread clientId={PORTAL_CLIENT_ID} embed={x} as="client" who={clientName} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="inset embed-form">
          <span className="kicker">{draft.id ? "EDIT EMBED CODE" : "ADD AN EMBED CODE"}</span>
          <SegmentedControl
            label="What is it?"
            kind="radio"
            size="sm"
            variant="soft"
            value={draft.kind}
            onChange={(kind) => set({ kind })}
            options={EMBED_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
          />
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
          <div className="cluster cluster--8">
            <Button type="submit" variant="primary" size="sm">
              {draft.id ? "Save changes" : "Save embed code"}
            </Button>
            {(embeds.length > 0 || draft.id > 0) && (
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
        <Button variant="dashed" onClick={() => setDraft(blank())}>
          + Add an embed code
        </Button>
      )}
    </Modal>
  );
}
