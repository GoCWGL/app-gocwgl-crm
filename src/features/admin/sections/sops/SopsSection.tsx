"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Field,
  FormError,
  Icon,
  IconButton,
  IconTile,
  Input,
  LoadState,
  Modal,
  SearchBox,
  SegmentedControl,
  Tabs,
  Textarea,
} from "@/components/ui";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { SopAudience, SopOut, SopStatus } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useCreateSop, useDeleteSop, useSops, useUpdateSop } from "@/utils/hooks/useSops";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

const AUDIENCE = {
  client: { tab: "Client SOPs", hint: "Guides for your clients", icon: "users", tone: "orange", noun: "client" },
  va: { tab: "VA SOPs", hint: "Guides for your VAs", icon: "briefcase", tone: "cyan", noun: "VA" },
} as const;

const STATUS: Record<SopStatus, { label: string; tone: "green" | "slate" }> = {
  published: { label: "Published", tone: "green" },
  draft: { label: "Draft", tone: "slate" },
};

/** Engagement › SOPs: step-by-step guides for clients and for VAs. */
export function SopsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = useSops();
  const sops = query.data ?? [];
  const [tab, setTab] = useState<SopAudience>("va");
  const [search, setSearch] = useState("");
  const [reading, setReading] = useState<SopOut | null>(null);
  const [editing, setEditing] = useState<SopOut | "new" | null>(null);
  const q = search.trim().toLowerCase();

  const inTab = sops.filter((s) => s.audience === tab);
  const shown = inTab.filter((s) => !q || [s.title, s.category, s.summary, ...s.steps].some((x) => x.toLowerCase().includes(q)));
  const categories = [...new Set(sops.map((s) => s.category).filter(Boolean))].sort();
  // Group by category ("Other" last).
  const groups = [...new Set(shown.map((s) => s.category || "Other"))].sort((a, b) =>
    a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b),
  );
  const meta = AUDIENCE[tab];
  // Keep the open SOP fresh after an edit.
  const current = reading ? (sops.find((s) => s.id === reading.id) ?? null) : null;

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="board__bar">
          <Tabs<SopAudience>
            label="SOPs"
            value={tab}
            onChange={setTab}
            options={(Object.keys(AUDIENCE) as SopAudience[]).map((a) => ({
              value: a,
              label: AUDIENCE[a].tab,
              hint: AUDIENCE[a].hint,
              icon: AUDIENCE[a].icon,
              tone: AUDIENCE[a].tone,
              count: query.isPending ? "–" : sops.filter((s) => s.audience === a).length,
            }))}
          />
          <div className="board__actions">
            <SearchBox label="Search SOPs" placeholder="Search title, category or step" value={search} onChange={setSearch} />
            {canWrite && (
              <Button variant="primary" onClick={() => setEditing("new")}>
                <Icon name="plus" size={14} /> New SOP
              </Button>
            )}
          </div>
        </div>

        <LoadState query={query} loadingText="Loading SOPs…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className={cn("board__empty-icon", toneClass(meta.tone))} aria-hidden="true">
                <Icon name="clipboard" size={18} />
              </span>
              <span className="text-strong">{q ? `No matches for “${search.trim()}”` : `No ${meta.noun} SOPs yet`}</span>
              <span className="text-small">
                {q ? "Try another search." : `Write step-by-step guides for your ${meta.noun === "VA" ? "VAs" : "clients"} to follow.`}
              </span>
              {canWrite && !q && (
                <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
                  <Icon name="plus" size={13} /> New SOP
                </Button>
              )}
            </div>
          ) : (
            <div className="sop-groups">
              {groups.map((g) => (
                <section key={g} className="sop-group">
                  <h3 className="sop-group__title">
                    {g} <span>{shown.filter((s) => (s.category || "Other") === g).length}</span>
                  </h3>
                  <div className="sop-grid">
                    {shown
                      .filter((s) => (s.category || "Other") === g)
                      .map((s) => (
                        <button key={s.id} type="button" className={cn("sop-card", toneClass(meta.tone))} onClick={() => setReading(s)}>
                          <span className="sop-card__top">
                            <IconTile tone={meta.tone} size="sm">
                              <Icon name="clipboard" size={14} />
                            </IconTile>
                            <Badge tone={STATUS[s.status].tone} dot>
                              {STATUS[s.status].label}
                            </Badge>
                          </span>
                          <span className="sop-card__title">{s.title}</span>
                          {s.summary && <span className="sop-card__summary">{s.summary}</span>}
                          <span className="sop-card__meta">
                            <span>
                              <Icon name="check" size={12} /> {s.steps.length} step{s.steps.length === 1 ? "" : "s"}
                            </span>
                            {s.videoUrl && (
                              <span>
                                <Icon name="video" size={12} /> Video
                              </span>
                            )}
                            <span>Updated {formatShort(s.updatedAt)}</span>
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </LoadState>
      </div>

      {current && (
        <SopReader
          sop={current}
          canWrite={canWrite}
          onClose={() => setReading(null)}
          onEdit={() => {
            setEditing(current);
            setReading(null);
          }}
        />
      )}
      {editing && (
        <SopEditor
          sop={editing === "new" ? null : editing}
          audience={tab}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            setEditing(null);
            setTab(s.audience);
            setReading(s);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Reader

function SopReader({ sop, canWrite, onClose, onEdit }: { sop: SopOut; canWrite: boolean; onClose: () => void; onEdit: () => void }) {
  const { notify } = useAdmin();
  const save = useUpdateSop();
  const remove = useDeleteSop();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = AUDIENCE[sop.audience];
  const publish = (status: SopStatus) =>
    save.mutate(
      { id: sop.id, body: { status } },
      { onSuccess: () => notify(status === "published" ? `“${sop.title}” is published.` : `“${sop.title}” is back to draft.`) },
    );

  return (
    <Modal
      open
      variant="drawer"
      width={620}
      onClose={onClose}
      titleId="sop-reader"
      kicker={`${meta.tab.toUpperCase()}${sop.category ? ` · ${sop.category.toUpperCase()}` : ""}`}
      title={sop.title}
      subtitle={`${STATUS[sop.status].label} · updated ${formatShort(sop.updatedAt)}${sop.updatedByName ? ` by ${sop.updatedByName}` : ""}`}
      media={
        <IconTile tone={meta.tone} size="lg">
          <Icon name="clipboard" size={18} />
        </IconTile>
      }
      footer={
        canWrite ? (
          <>
            {confirmDelete ? (
              <Button
                variant="danger-solid"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(sop.id, {
                    onSuccess: () => {
                      notify(`“${sop.title}” was deleted.`);
                      onClose();
                    },
                  })
                }
              >
                Yes, delete
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <span className="u-spacer" />
            {sop.status === "draft" ? (
              <Button variant="outline" disabled={save.isPending} onClick={() => publish("published")}>
                <Icon name="send" size={13} /> Publish
              </Button>
            ) : (
              <Button variant="outline" disabled={save.isPending} onClick={() => publish("draft")}>
                Unpublish
              </Button>
            )}
            <Button variant="primary" onClick={onEdit}>
              <Icon name="edit" size={13} /> Edit
            </Button>
          </>
        ) : (
          <>
            <span className="u-spacer" />
            <Button onClick={onClose}>Close</Button>
          </>
        )
      }
    >
      <div className="stack stack--16">
        <FormError error={save.error ?? remove.error} />
        {sop.summary && <p className="sop-reader__summary">{sop.summary}</p>}
        {sop.videoUrl && (
          <a className="link-card" href={sop.videoUrl} target="_blank" rel="noopener noreferrer">
            <span className="link-card__icon" aria-hidden="true">
              <Icon name="video" size={17} />
            </span>
            <span className="stack stack--2 u-grow">
              <span className="text-strong">Watch the walkthrough</span>
              <span className="text-small">{sop.videoUrl.replace(/^https?:\/\//, "")}</span>
            </span>
            <Icon name="arrowRight" size={15} />
          </a>
        )}
        <div className="stack stack--8">
          <span className="kicker">STEPS · {sop.steps.length}</span>
          {sop.steps.length ? (
            <ol className="sop-steps">
              {sop.steps.map((step, i) => (
                <li key={i}>
                  <span className="sop-steps__n">{i + 1}</span>
                  <span className="va-pre">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="vp-empty">No steps yet.</span>
          )}
        </div>
        {sop.body && (
          <div className="stack stack--8">
            <span className="kicker">NOTES</span>
            <p className="va-pre">{sop.body}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Editor

function SopEditor({
  sop,
  audience,
  categories,
  onClose,
  onSaved,
}: {
  sop: SopOut | null;
  audience: SopAudience;
  categories: string[];
  onClose: () => void;
  onSaved: (s: SopOut) => void;
}) {
  const { notify } = useAdmin();
  const create = useCreateSop();
  const save = useUpdateSop();
  const isNew = !sop;
  const [f, setF] = useState({
    title: sop?.title ?? "",
    audience: sop?.audience ?? audience,
    category: sop?.category ?? "",
    summary: sop?.summary ?? "",
    body: sop?.body ?? "",
    video: sop?.videoUrl ?? "",
  });
  const [steps, setSteps] = useState<string[]>(sop?.steps.length ? sop.steps : ["", ""]);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));
  const setStep = (i: number, v: string) => setSteps((s) => s.map((x, j) => (j === i ? v : x)));
  const moveStep = (i: number, by: number) =>
    setSteps((s) => {
      const next = [...s];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const videoOk = !f.video.trim() || /^https?:\/\/\S+$/.test(f.video.trim());
  const pending = create.isPending || save.isPending;

  const submit = (status?: SopStatus) => {
    setTried(true);
    if (!f.title.trim() || !videoOk) return;
    const body = {
      title: f.title.trim(),
      audience: f.audience,
      category: f.category.trim(),
      summary: f.summary.trim(),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      body: f.body.trim(),
      videoUrl: f.video.trim(),
      ...(status && { status }),
    };
    const done = (s: SopOut) => {
      notify(isNew ? (s.status === "published" ? `“${s.title}” is published.` : `“${s.title}” is saved as a draft.`) : `“${s.title}” is saved.`);
      onSaved(s);
    };
    if (isNew) create.mutate({ ...body, status: status ?? "draft" }, { onSuccess: done });
    else save.mutate({ id: sop.id, body }, { onSuccess: done });
  };

  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
      titleId="sop-editor"
      kicker="SOP"
      title={isNew ? "New SOP" : "Edit SOP"}
      subtitle={isNew ? "Save it as a draft, or publish it when it's ready." : undefined}
      media={
        <IconTile brand size="lg">
          <Icon name="clipboard" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          {isNew ? (
            <>
              <Button type="submit" variant="outline" disabled={pending}>
                Save as draft
              </Button>
              <Button variant="primary" disabled={pending} onClick={() => submit("published")}>
                <Icon name="send" size={13} /> Publish
              </Button>
            </>
          ) : (
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={create.error ?? save.error} />
        <Field label="For">
          <SegmentedControl<SopAudience>
            kind="radio"
            variant="soft"
            size="sm"
            label="Who this SOP is for"
            value={f.audience}
            onChange={(audience) => set({ audience })}
            options={[
              { value: "va", label: "VAs" },
              { value: "client", label: "Clients" },
            ]}
          />
        </Field>
        <Field label="Title" htmlFor="sop-title" required error={tried && !f.title.trim() && "Give the SOP a title."}>
          <Input id="sop-title" placeholder="Daily inbox triage" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        </Field>
        <div className="form-grid">
          <Field label="Category" htmlFor="sop-cat" hint="Groups SOPs together, e.g. Email, Onboarding.">
            <Input id="sop-cat" list="sop-categories" value={f.category} onChange={(e) => set({ category: e.target.value })} />
            <datalist id="sop-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Video walkthrough" htmlFor="sop-video" error={tried && !videoOk && "Start with https://"}>
            <Input id="sop-video" type="url" placeholder="https://loom.com/…" value={f.video} onChange={(e) => set({ video: e.target.value })} />
          </Field>
        </div>
        <Field label="Summary" htmlFor="sop-summary" hint="One line: what this SOP gets done.">
          <Input id="sop-summary" maxLength={300} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
        </Field>

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
            <Button size="sm" variant="outline" onClick={() => setSteps((s) => [...s, ""])}>
              <Icon name="plus" size={13} /> Add step
            </Button>
          </span>
        </div>

        <Field label="Notes" htmlFor="sop-body" hint="Tips, links, and what “done” looks like.">
          <Textarea id="sop-body" rows={4} value={f.body} onChange={(e) => set({ body: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
