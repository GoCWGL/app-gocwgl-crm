"use client";

import { useState } from "react";
import { Avatar, Button, ConfirmDialog, Field, Icon, IconButton, LoadState, SearchBox, SegmentedControl, Select, Toast } from "@/components/ui";
import { VA_PAGES } from "@/data/va";
import { ASSET_KINDS, AssetList, sortByCategory, matchesAsset, type AssetKind } from "@/features/portal/components/AssetList";
import { AssetModal, type AssetModalCopy } from "@/features/portal/components/AssetModal";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { AssetVa, VaAssetClient, VaAssetOut } from "@/utils/api/models";
import { myAssetPassword } from "@/utils/api/vaAssets";
import { useAddMyAsset, useDeleteMyAsset, useLockAssets, useMyAssets, useUnlockStatus, useUpdateMyAsset } from "@/utils/hooks/useVaAssets";
import { useAssetUnlockGate } from "../components/AssetUnlock";
import { useVaAccess } from "../lib/access";
import { clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";

type KindFilter = "" | AssetKind;
const NO_CATEGORY = "__none";

/**
 * VA portal › Assets: the logins, links and notes your clients shared with you, and the ones you added. Pick a client
 * to see only theirs (the server only sends that client's assets, and refuses a client you don't work for), then
 * narrow by category. You can add your own for a client: the client sees it in their Assets, and you pick which
 * teammates on their team can see it. The client's own assets are theirs to change. Passwords load only when you show
 * or copy them, after you confirm it's you on this device (lasts while you're online, locks after 24 hours away);
 * each look is logged and rate-limited.
 */
export function AssetsSection() {
  const { ready, staff } = useVaAccess();
  // The client picked under Active clients in the menu; the picker here is only for when none is picked.
  const { client } = useVa();
  const [picked, setPicked] = useState("");
  const clientId = client || picked;
  const data = useMyAssets(clientId, ready);
  const clients = data.data?.clients ?? [];
  const assets = data.data?.assets ?? [];
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("");
  const [category, setCategory] = useState("");
  // Passwords need "confirm it's you" on this device; it lasts while you're online and locks after 24 hours away.
  // The VA, or a super admin viewing as them (confirming with their own password); other staff never see passwords.
  const unlockStatus = useUnlockStatus(ready);
  const allowed = !!unlockStatus.data?.allowed;
  const lock = useLockAssets();
  const gate = useAssetUnlockGate(unlockStatus.data);
  const unlocked = !!unlockStatus.data?.unlocked;
  const [editing, setEditing] = useState<VaAssetOut | "new" | null>(null);
  const [deleting, setDeleting] = useState<VaAssetOut | null>(null);
  const remove = useDeleteMyAsset();
  const [toast, setToast] = useState("");

  const pickClient = (id: string) => (setPicked(id), setCategory(""));
  const categories = categoryCounts(assets);
  const shown = assets.filter(
    (a) => (!kind || a.kind === kind) && (!category || (a.category || NO_CATEGORY) === category) && matchesAsset(a, query),
  );
  const count = (k: AssetKind) => assets.filter((a) => a.kind === k).length;
  const total = clients.reduce((n, c) => n + c.assetCount, 0);
  const current = clients.find((c) => c.id === clientId);
  const teamOf = (id: string) => clients.find((c) => c.id === id)?.team ?? [];

  return (
    <div className="page-stack">
      <LoadState query={data} loadingText="Loading your assets…" isEmpty={!clients.length} empty={VA_PAGES.assets.empty}>
        <div className="card ast-picker">
          <Avatar name={current ? clientLabel(current) : "All"} tone={current ? avatarTone(current.id) : "slate"} />
          <div className="ast-picker__text">
            <label htmlFor={client ? undefined : "ast-client"} className="ast-picker__label">
              Client
            </label>
            {client ? (
              <strong className="ast-picker__name">
                {current ? clientLabel(current) : "This client"}
              </strong>
            ) : (
              <Select
                id="ast-client"
                value={clientId}
                onChange={(e) => pickClient(e.target.value)}
                options={[
                  { value: "", label: `All clients (${total})` },
                  ...clients.map((c) => ({ value: c.id, label: `${clientLabel(c)} (${c.assetCount})` })),
                ]}
              />
            )}
          </div>
          <div className="ast-picker__stats">
            <span>
              <b>{assets.length}</b> assets
            </span>
            <span>
              <b>{count("login")}</b> logins
            </span>
            <span>
              <b>{count("link")}</b> links
            </span>
            <span>
              <b>{count("note")}</b> notes
            </span>
          </div>
          {unlockStatus.data && !allowed ? (
            <div className="ast-lock is-staff">
              <Icon name="eye" size={14} />
              <span>You’re viewing as this VA. Only the VA and super admins can view or copy passwords.</span>
            </div>
          ) : (
            <div className={cn("ast-lock", unlocked && "is-open")}>
              <Icon name={unlocked ? "check" : "lock"} size={14} />
              <span>
                {unlocked ? "Passwords unlocked on this device" : "Passwords locked"}
                {staff && (unlocked ? " · viewing as this VA" : " · viewing as this VA, confirm with your own password")}
              </span>
              {unlocked ? (
                <Button size="sm" variant="link" onClick={() => lock.mutate()} disabled={lock.isPending}>
                  Lock
                </Button>
              ) : (
                <Button size="sm" variant="link" onClick={() => gate.ask().catch(() => undefined)} disabled={!unlockStatus.data}>
                  Unlock
                </Button>
              )}
            </div>
          )}
        </div>

        {assets.length > 0 && (
            <div className="ast-cats" role="group" aria-label="Category">
              <button type="button" className={cn("ast-cats__chip", !category && "is-on")} aria-pressed={!category} onClick={() => setCategory("")}>
                All categories <span>{assets.length}</span>
              </button>
              {categories.map(([key, n]) => (
                <button
                  key={key}
                  type="button"
                  className={cn("ast-cats__chip", category === key && "is-on")}
                  aria-pressed={category === key}
                  onClick={() => setCategory(category === key ? "" : key)}
                >
                  {key === NO_CATEGORY ? "No category" : key} <span>{n}</span>
                </button>
              ))}
            </div>
        )}

        <div className="cp-toolbar">
          {assets.length > 0 && (
            <>
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
            </>
          )}
          <span className="u-spacer" />
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={15} /> Add asset
          </Button>
        </div>

        {!assets.length ? (
          <p className="ast-empty-line">
            {current ? `Nothing for ${clientLabel(current)} yet.` : "Nothing here yet."} Add a login, link or note your client and teammates need.
          </p>
        ) : shown.length ? (
          <AssetList
            assets={sortByCategory(shown)}
            loadPassword={(id) => gate.guard(async () => (await myAssetPassword(id)).password)}
            passwordBlocked={unlockStatus.data && !allowed ? "Only the VA and super admins can view or copy passwords" : null}
            asideLabel={current ? "Who sees it" : "Client"}
            aside={(a) =>
              current ? (
                <Teammates asset={a} team={teamOf(a.client.id)} />
              ) : (
                <span className="ast-client" title={clientLabel(a.client)}>
                  <Avatar name={clientLabel(a.client)} tone={avatarTone(a.client.id)} size="sm" />
                  <span>{clientLabel(a.client)}</span>
                </span>
              )
            }
            actions={(a) =>
              a.mine && (
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
        ) : (
          <p className="ast-empty-line">No assets match your search.</p>
        )}

        <p className="text-small cp-note">
          <Icon name="shield" size={13} /> Keep these private: don’t share them outside the client’s work. What you add, the client sees too. Each
          time you show or copy a password, it’s logged.
        </p>
      </LoadState>
      {gate.modal}
      {editing && (
        <VaAssetModal
          asset={editing === "new" ? null : editing}
          clients={clients}
          clientId={editing === "new" ? clientId : editing.client.id}
          lockClient={editing !== "new" || !!client}
          categories={[...new Set(assets.map((a) => a.category).filter(Boolean))].sort()}
          onClose={() => setEditing(null)}
          onSaved={setToast}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          confirmLabel="Delete asset"
          icon="trash"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => (setToast(`${deleting.title} deleted.`), setDeleting(null)) })}
        >
          It’s removed for {clientLabel(deleting.client)} and your teammates too, with its saved password. This can’t be undone.
        </ConfirmDialog>
      )}
      <Toast message={toast} onClose={() => setToast("")} floating />
    </div>
  );
}

/** Who sees an asset: for yours, the teammates you picked (the client always does); for the client's, just you. */
function Teammates({ asset, team }: { asset: VaAssetOut; team: AssetVa[] }) {
  if (!asset.mine)
    return (
      <span className="ast-shared is-none">
        <Icon name="eye" size={13} /> Shared with you
      </span>
    );
  const people = (asset.vaIds ?? []).map((id) => team.find((v) => v.id === id)).filter((v): v is AssetVa => !!v);
  if (!people.length)
    return (
      <span className="ast-shared is-none" title="You and the client">
        <Icon name="eye" size={13} /> You & client
      </span>
    );
  return (
    <span className="ast-shared" title={`You, the client and ${people.map((p) => p.name).join(", ")}`}>
      <span className="ast-avatars">
        {people.slice(0, 3).map((p) => (
          <Avatar key={p.id} name={p.name} tone={avatarTone(p.id)} size="sm" ring />
        ))}
      </span>
      <span className="ast-shared__label">{people.length === 1 ? `+ ${people[0].name.split(" ")[0]}` : `+ ${people.length} teammates`}</span>
    </span>
  );
}

const VA_COPY: AssetModalCopy = {
  subtitle: "Save a login, a link or a note for this client. They’ll see it in their Assets; pick the teammates who can see it too.",
  shareLabel: "Teammates who can see this",
  people: "teammates",
  onlyYou: "You and the client, for now",
  nobody: "No other VA works for this client yet. You and the client can see it.",
};

/** Add (for one of your clients) or edit one of your assets, and pick teammates on that client's team. */
function VaAssetModal({
  asset,
  clients,
  clientId: initial,
  lockClient,
  categories,
  onClose,
  onSaved,
}: {
  asset: VaAssetOut | null;
  clients: VaAssetClient[];
  clientId: string;
  /** The client is set (editing, or a client picked under Active clients). */
  lockClient: boolean;
  categories: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [clientId, setClientId] = useState(initial || (clients.length === 1 ? clients[0].id : ""));
  const [tried, setTried] = useState(false);
  const add = useAddMyAsset();
  const update = useUpdateMyAsset();
  const save = asset ? update : add;
  const client = clients.find((c) => c.id === clientId);
  return (
    <AssetModal
      key={clientId}
      asset={asset}
      vas={client?.team ?? []}
      categories={categories}
      copy={{ ...VA_COPY, ...(client && { subtitle: `For ${clientLabel(client)}. They’ll see it in their Assets; pick the teammates who can see it too.` }) }}
      pending={save.isPending}
      error={save.error}
      onClose={onClose}
      onSave={(body) => {
        const done = () => (onSaved(asset ? `${body.title} saved.` : `${body.title} added.`), onClose());
        if (asset) return update.mutate({ id: asset.id, body }, { onSuccess: done });
        setTried(true);
        if (!clientId) return;
        add.mutate({ ...body, password: body.password ?? "", clientId }, { onSuccess: done });
      }}
    >
      {!lockClient && (
        <Field label="Client" htmlFor="ast-for" required error={tried && !clientId ? "Pick the client it’s for." : undefined}>
          <Select
            id="ast-for"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Choose a client"
            options={clients.map((c) => ({ value: c.id, label: clientLabel(c) }))}
          />
        </Field>
      )}
    </AssetModal>
  );
}

/** Each category with how many assets it has, A–Z ("No category" last). */
function categoryCounts(assets: VaAssetOut[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const a of assets) counts.set(a.category || NO_CATEGORY, (counts.get(a.category || NO_CATEGORY) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b)));
}
