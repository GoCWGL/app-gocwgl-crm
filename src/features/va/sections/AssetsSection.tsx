"use client";

import { useState } from "react";
import { Avatar, Button, Icon, LoadState, SearchBox, SegmentedControl, Select } from "@/components/ui";
import { VA_PAGES } from "@/data/va";
import { ASSET_KINDS, AssetList, sortByCategory, matchesAsset, type AssetKind } from "@/features/portal/components/AssetList";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaAssetOut } from "@/utils/api/models";
import { myAssetPassword } from "@/utils/api/vaAssets";
import { useLockAssets, useMyAssets, useUnlockStatus } from "@/utils/hooks/useVaAssets";
import { useAssetUnlockGate } from "../components/AssetUnlock";
import { useVaAccess } from "../lib/access";
import { clientLabel } from "../lib/time";

type KindFilter = "" | AssetKind;
const NO_CATEGORY = "__none";

/**
 * VA portal › Assets: the logins, links and notes your clients shared with you. Pick a client to see only theirs
 * (the server only sends that client's assets, and refuses a client you don't work for), then narrow by category.
 * Read only: the client adds and changes them. Passwords load only when you show or copy them, after you confirm it's
 * you on this device (lasts while you're online, locks after 24 hours away); each look is logged and rate-limited.
 */
export function AssetsSection() {
  const { ready, staff } = useVaAccess();
  const [clientId, setClientId] = useState("");
  const data = useMyAssets(clientId, ready);
  const clients = data.data?.clients ?? [];
  const assets = data.data?.assets ?? [];
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("");
  const [category, setCategory] = useState("");
  // Passwords need "confirm it's you" on this device; it lasts while you're online and locks after 24 hours away.
  const unlockStatus = useUnlockStatus(ready && !staff);
  const lock = useLockAssets();
  const gate = useAssetUnlockGate(unlockStatus.data);
  const unlocked = !!unlockStatus.data?.unlocked;

  const pickClient = (id: string) => (setClientId(id), setCategory(""));
  const categories = categoryCounts(assets);
  const shown = assets.filter(
    (a) => (!kind || a.kind === kind) && (!category || (a.category || NO_CATEGORY) === category) && matchesAsset(a, query),
  );
  const count = (k: AssetKind) => assets.filter((a) => a.kind === k).length;
  const total = clients.reduce((n, c) => n + c.assetCount, 0);
  const current = clients.find((c) => c.id === clientId);

  return (
    <div className="page-stack">
      <LoadState query={data} loadingText="Loading your assets…" isEmpty={!clients.length} empty={VA_PAGES.assets.empty}>
        <div className="card ast-picker">
          <Avatar name={current ? clientLabel(current) : "All"} tone={current ? avatarTone(current.id) : "slate"} />
          <div className="ast-picker__text">
            <label htmlFor="ast-client" className="ast-picker__label">
              Client
            </label>
            <Select
              id="ast-client"
              value={clientId}
              onChange={(e) => pickClient(e.target.value)}
              options={[
                { value: "", label: `All clients (${total})` },
                ...clients.map((c) => ({ value: c.id, label: `${clientLabel(c)} (${c.assetCount})` })),
              ]}
            />
          </div>
          <div className="ast-picker__stats">
            <span>
              <b>{assets.length}</b> shared
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
          {!staff && (
            <div className={cn("ast-lock", unlocked && "is-open")}>
              <Icon name={unlocked ? "check" : "lock"} size={14} />
              <span>{unlocked ? "Passwords unlocked on this device" : "Passwords locked"}</span>
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
          <>
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
            </div>
          </>
        )}

        {!assets.length ? (
          <p className="ast-empty-line">{current ? `${clientLabel(current)} hasn’t shared anything with you yet.` : "Nothing shared with you yet."}</p>
        ) : shown.length ? (
          <AssetList
            assets={sortByCategory(shown)}
            loadPassword={(id) => gate.guard(async () => (await myAssetPassword(id)).password)}
            passwordBlocked={staff ? "Passwords are only shown to the VA." : null}
            asideLabel={current ? undefined : "Client"}
            aside={current ? undefined : (a) => (
              <span className="ast-client" title={clientLabel(a.client)}>
                <Avatar name={clientLabel(a.client)} tone={avatarTone(a.client.id)} size="sm" />
                <span>{clientLabel(a.client)}</span>
              </span>
            )}
          />
        ) : (
          <p className="ast-empty-line">No assets match your search.</p>
        )}

        <p className="text-small cp-note">
          <Icon name="shield" size={13} /> Keep these private: don’t share them outside the client’s work. Each time you show or copy a password, it’s logged.
        </p>
      </LoadState>
      {gate.modal}
    </div>
  );
}

/** Each category with how many assets it has, A–Z ("No category" last). */
function categoryCounts(assets: VaAssetOut[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const a of assets) counts.set(a.category || NO_CATEGORY, (counts.get(a.category || NO_CATEGORY) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b)));
}
