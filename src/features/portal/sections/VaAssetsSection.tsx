"use client";

import { useState, type FormEvent } from "react";
import {
  Avatar,
  Button,
  ConfirmDialog,
  Field,
  FormError,
  Icon,
  IconButton,
  IconTile,
  Input,
  LoadState,
  Modal,
  PasswordInput,
  SearchBox,
  SegmentedControl,
  StatGrid,
  Textarea,
} from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn, generatePassword, normalizeUrl } from "@/lib/utils";
import type { AssetOut, AssetVa } from "@/utils/api/models";
import { clientAssetPassword } from "@/utils/api/vaAssets";
import { useClientAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from "@/utils/hooks/useVaAssets";
import { ASSET_KINDS, AssetList, sortByCategory, matchesAsset, type AssetKind } from "../components/AssetList";
import { usePortal } from "../state/PortalContext";

type KindFilter = "" | AssetKind;

/**
 * Client portal › VA › Assets: logins, links and notes your VAs need, kept in one place. Each one is shared only with
 * the VAs you pick, and only while they work for you. Passwords are stored encrypted and shown on request.
 */
export function VaAssetsSection() {
  const { readOnly } = usePortal();
  const data = useClientAssets();
  const assets = data.data?.assets ?? [];
  const vas = data.data?.vas ?? [];
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("");
  const [editing, setEditing] = useState<AssetOut | "new" | null>(null);
  const [deleting, setDeleting] = useState<AssetOut | null>(null);
  const remove = useDeleteAsset();
  const { notify } = usePortal();

  const vaById = new Map(vas.map((v) => [v.id, v]));
  const shown = assets.filter((a) => (!kind || a.kind === kind) && matchesAsset(a, query));
  const categories = [...new Set(assets.map((a) => a.category).filter(Boolean))].sort();
  const count = (k: AssetKind) => assets.filter((a) => a.kind === k).length;
  const unshared = assets.filter((a) => !a.vaIds.length).length;

  return (
    <div className="page-stack">
      <LoadState query={data} loadingText="Loading your assets…">
        <StatGrid
          items={[
            { label: "Assets", value: String(assets.length), tone: "cyan" },
            { label: "Logins", value: String(count("login")), tone: "slate" },
            { label: "Links", value: String(count("link")), tone: "slate" },
            { label: "Not shared yet", value: String(unshared), tone: unshared ? "orange" : "slate" },
          ]}
        />

        <div className="cp-toolbar">
          <SearchBox value={query} onChange={setQuery} label="Search assets" placeholder="Search title, site or username" className="ast-search" />
          <SegmentedControl
            label="Type"
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: "", label: "All", count: assets.length },
              ...(Object.keys(ASSET_KINDS) as AssetKind[]).map((k) => ({ value: k, label: ASSET_KINDS[k].plural, count: count(k) })),
            ]}
          />
          <span className="u-spacer" />
          {!readOnly && (
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Icon name="plus" size={15} /> Add asset
            </Button>
          )}
        </div>

        {!assets.length ? (
          <EmptyAssets onAdd={readOnly ? undefined : () => setEditing("new")} />
        ) : !shown.length ? (
          <p className="ast-empty-line">No assets match your search.</p>
        ) : (
          <AssetList
            assets={sortByCategory(shown)}
            loadPassword={async (id) => (await clientAssetPassword(id)).password}
            passwordBlocked={readOnly ? "Your access to this portal is view-only, so passwords stay hidden." : null}
            asideLabel="Shared with"
            aside={(a) => <SharedWith ids={a.vaIds} vaById={vaById} />}
            actions={
              readOnly
                ? undefined
                : (a) => (
                    <>
                      <IconButton size="sm" ghost label={`Edit ${a.title}`} onClick={() => setEditing(a)}>
                        <Icon name="edit" size={14} />
                      </IconButton>
                      <IconButton size="sm" ghost danger label={`Delete ${a.title}`} onClick={() => setDeleting(a)}>
                        <Icon name="trash" size={14} />
                      </IconButton>
                    </>
                  )
            }
          />
        )}

        <p className="text-small cp-note">
          <Icon name="shield" size={13} /> Passwords are stored encrypted. A VA only sees the assets you share with them, and loses access when they stop
          working with you. Every time someone shows or copies a password, it’s logged.
        </p>
      </LoadState>

      {editing && <AssetModal asset={editing === "new" ? null : editing} vas={vas} categories={categories} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          confirmLabel="Delete asset"
          icon="trash"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => (notify(`${deleting.title} deleted.`), setDeleting(null)) })}
        >
          Your VAs won’t see it any more, and its saved password is removed. This can’t be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}

function EmptyAssets({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="card ast-empty">
      <IconTile tone="cyan" size="lg">
        <Icon name="lock" size={24} />
      </IconTile>
      <h3>Keep your VAs’ logins and links in one place</h3>
      <p>Save the tools, websites and accounts your VAs work in. You choose which VA can see each one, and passwords stay encrypted.</p>
      {onAdd && (
        <Button variant="primary" onClick={onAdd}>
          <Icon name="plus" size={15} /> Add your first asset
        </Button>
      )}
    </div>
  );
}

function SharedWith({ ids, vaById }: { ids: string[]; vaById: Map<string, AssetVa> }) {
  const people = ids.map((id) => vaById.get(id)).filter((v): v is AssetVa => !!v);
  if (!people.length)
    return (
      <span className="ast-shared is-none">
        <Icon name="eye" size={13} /> Only you
      </span>
    );
  return (
    <span className="ast-shared" title={`Shared with ${people.map((p) => p.name).join(", ")}`}>
      <span className="ast-avatars">
        {people.slice(0, 3).map((p) => (
          <Avatar key={p.id} name={p.name} tone={avatarTone(p.id)} size="sm" ring />
        ))}
      </span>
      <span className="ast-shared__label">{people.length === 1 ? people[0].name.split(" ")[0] : `${people.length} VAs`}</span>
    </span>
  );
}

/** Add or edit an asset: what it is, the login details, and which VAs can see it. */
function AssetModal({ asset, vas, categories, onClose }: { asset: AssetOut | null; vas: AssetVa[]; categories: string[]; onClose: () => void }) {
  const { notify } = usePortal();
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? "login");
  const [title, setTitle] = useState(asset?.title ?? "");
  const [category, setCategory] = useState(asset?.category ?? "");
  const [url, setUrl] = useState(asset?.url ?? "");
  const [username, setUsername] = useState(asset?.username ?? "");
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [vaIds, setVaIds] = useState<string[]>(asset?.vaIds ?? []);
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const save = asset ? update : create;

  const link = normalizeUrl(url);
  const error = !title.trim() ? "Give it a name." : kind === "link" && !link ? "Add the link’s web address." : "";
  const allOn = vas.length > 0 && vas.every((v) => vaIds.includes(v.id));
  const toggle = (id: string) => setVaIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    const isLogin = kind === "login";
    const body = {
      kind,
      title: title.trim(),
      category: category.trim(),
      url: kind === "note" ? "" : link,
      username: isLogin ? username.trim() : "",
      notes,
      vaIds,
    };
    const done = () => (notify(asset ? `${body.title} saved.` : `${body.title} added.`), onClose());
    if (asset) {
      // Leave the password out to keep it; "" removes it.
      const pw = !isLogin || clearPassword ? { password: "" } : password ? { password } : {};
      update.mutate({ id: asset.id, body: { ...body, ...pw } }, { onSuccess: done });
    } else {
      create.mutate({ ...body, password: isLogin ? password : "" }, { onSuccess: done });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="asset-modal"
      kicker="ASSETS"
      title={asset ? `Edit ${asset.title}` : "Add an asset"}
      subtitle="Save a login, a link or a note, and pick the VAs who can see it."
      media={
        <IconTile tone={ASSET_KINDS[kind].tone}>
          <Icon name={ASSET_KINDS[kind].icon} size={18} />
        </IconTile>
      }
      width={600}
      onSubmit={submit}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!!error || save.isPending}>
            {save.isPending ? "Saving…" : asset ? "Save changes" : "Add asset"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        <SegmentedControl
          label="Type"
          variant="soft"
          value={kind}
          onChange={setKind}
          options={(Object.keys(ASSET_KINDS) as AssetKind[]).map((k) => ({ value: k, label: ASSET_KINDS[k].label }))}
        />
        <div className="ast-form-row">
          <Field label="Name" htmlFor="ast-title" required>
            <Input
              id="ast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={kind === "login" ? "Shopify admin" : kind === "link" ? "Brand guidelines" : "Refund policy"}
              autoFocus
            />
          </Field>
          <Field label="Category" htmlFor="ast-category" hint="e.g. Social media, Store">
            <Input id="ast-category" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="Social media" list="ast-categories" />
            <datalist id="ast-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        {kind !== "note" && (
          <Field label={kind === "login" ? "Website" : "Web address"} htmlFor="ast-url" required={kind === "link"}>
            <Input id="ast-url" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrl(link)} maxLength={500} placeholder="https://" inputMode="url" />
          </Field>
        )}

        {kind === "login" && (
          <div className="ast-form-row">
            <Field label="Username or email" htmlFor="ast-user">
              <Input id="ast-user" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={200} autoComplete="off" />
            </Field>
            <Field
              label="Password"
              htmlFor="ast-pass"
              hint={
                asset?.hasPassword && !clearPassword ? (
                  <>
                    Saved. Leave blank to keep it.{" "}
                    <button type="button" className="btn btn--link" onClick={() => (setClearPassword(true), setPassword(""))}>
                      Remove it
                    </button>
                  </>
                ) : clearPassword ? (
                  <>
                    The saved password will be removed.{" "}
                    <button type="button" className="btn btn--link" onClick={() => setClearPassword(false)}>
                      Undo
                    </button>
                  </>
                ) : undefined
              }
            >
              <div className="ast-pass">
                <PasswordInput
                  id="ast-pass"
                  value={password}
                  onChange={(e) => (setPassword(e.target.value), setClearPassword(false))}
                  maxLength={500}
                  autoComplete="new-password"
                  placeholder={asset?.hasPassword && !clearPassword ? "••••••••" : ""}
                />
                <IconButton label="Generate a strong password" onClick={() => (setPassword(generatePassword(16)), setClearPassword(false))}>
                  <Icon name="sparkle" size={15} />
                </IconButton>
              </div>
            </Field>
          </div>
        )}

        <Field label="Notes" htmlFor="ast-notes" hint={kind === "login" ? "2-step codes, who to ask, what it’s for…" : undefined}>
          <Textarea id="ast-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={kind === "note" ? 6 : 3} maxLength={5000} />
        </Field>

        <Field label="Who can see this">
          {vas.length ? (
            <div className="ast-share">
              <div className="ast-share__head">
                <span className="text-small">{vaIds.length ? `${vaIds.length} of ${vas.length} VAs` : "Only you, for now"}</span>
                <button type="button" className="btn btn--link" onClick={() => setVaIds(allOn ? [] : vas.map((v) => v.id))}>
                  {allOn ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="ast-share__list" role="group" aria-label="VAs who can see this">
                {vas.map((v) => {
                  const on = vaIds.includes(v.id);
                  return (
                    <button key={v.id} type="button" className={cn("ast-va-pick", on && "is-on")} aria-pressed={on} onClick={() => toggle(v.id)}>
                      <Avatar name={v.name} tone={avatarTone(v.id)} size="sm" />
                      <span className="ast-va-pick__text">
                        <strong>{v.name}</strong>
                        {v.headline && <span>{v.headline}</span>}
                      </span>
                      <span className="ast-va-pick__check" aria-hidden="true">
                        {on && <Icon name="check" size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-small ast-share__none">No VA is working with you yet. Save it now and share it once you have a VA.</p>
          )}
        </Field>
        {error && title && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
        <FormError error={save.error} />
      </div>
    </Modal>
  );
}
