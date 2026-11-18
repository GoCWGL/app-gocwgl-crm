"use client";

import { useState } from "react";
import { Avatar, Button, ConfirmDialog, Icon, IconButton, IconTile, LoadState, SearchBox, SegmentedControl, StatGrid } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { AssetOut, AssetVa } from "@/utils/api/models";
import { clientAssetPassword } from "@/utils/api/vaAssets";
import { useClientAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from "@/utils/hooks/useVaAssets";
import { ASSET_KINDS, AssetList, sortByCategory, matchesAsset, type AssetKind } from "../components/AssetList";
import { AssetModal, type AssetModalCopy } from "../components/AssetModal";
import { isSuperAdmin, useSession } from "@/utils/auth/session";
import { usePortal } from "../state/PortalContext";

type KindFilter = "" | AssetKind;

/**
 * Client portal › VA › Assets: logins, links and notes your VAs need, kept in one place. Each one is shared only with
 * the VAs you pick, and only while they work for you. Passwords are stored encrypted and shown on request.
 */
export function VaAssetsSection() {
  const { readOnly } = usePortal();
  const { user } = useSession();
  // Of the GoCWGL team, only super admins (in "View as client") can see a client's passwords.
  const staffBlocked = !!user?.isStaff && !isSuperAdmin(user);
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
  // A VA's own asset is never "not shared": the VA who added it sees it.
  const unshared = assets.filter((a) => !a.vaIds.length && !a.addedByVa).length;

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
            passwordBlocked={
              staffBlocked
                ? "Only super admins can view or copy a client’s passwords."
                : readOnly
                  ? "Your access to this portal is view-only, so passwords stay hidden."
                  : null
            }
            asideLabel="Shared with"
            aside={(a) => <SharedWith ids={a.vaIds} vaById={vaById} addedBy={a.addedByVa ? a.addedByName : ""} />}
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

      {editing && <ClientAssetModal asset={editing === "new" ? null : editing} vas={vas} categories={categories} onClose={() => setEditing(null)} />}
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

/** The VAs who can see an asset; one a VA added is also seen by that VA (`addedBy`), whoever it's shared with. */
function SharedWith({ ids, vaById, addedBy }: { ids: string[]; vaById: Map<string, AssetVa>; addedBy?: string }) {
  const people = ids.map((id) => vaById.get(id)).filter((v): v is AssetVa => !!v);
  if (!people.length)
    return (
      <span className="ast-shared is-none" title={addedBy ? `You and ${addedBy}, who added it` : undefined}>
        <Icon name="eye" size={13} /> {addedBy ? `You & ${addedBy.split(" ")[0]}` : "Only you"}
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

const CLIENT_COPY: AssetModalCopy = {
  subtitle: "Save a login, a link or a note, and pick the VAs who can see it.",
  shareLabel: "Who can see this",
  people: "VAs",
  onlyYou: "Only you, for now",
  nobody: "No VA is working with you yet. Save it now and share it once you have a VA.",
};

/** Add or edit one of your assets (including ones your VAs added), and pick the VAs who can see it. */
function ClientAssetModal({ asset, vas, categories, onClose }: { asset: AssetOut | null; vas: AssetVa[]; categories: string[]; onClose: () => void }) {
  const { notify } = usePortal();
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const save = asset ? update : create;
  return (
    <AssetModal
      asset={asset}
      vas={vas}
      categories={categories}
      copy={CLIENT_COPY}
      pending={save.isPending}
      error={save.error}
      onClose={onClose}
      onSave={(body) => {
        const done = () => (notify(asset ? `${body.title} saved.` : `${body.title} added.`), onClose());
        if (asset) update.mutate({ id: asset.id, body }, { onSuccess: done });
        else create.mutate({ ...body, password: body.password ?? "" }, { onSuccess: done });
      }}
    />
  );
}
