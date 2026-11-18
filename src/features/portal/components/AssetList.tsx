"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, IconButton, IconTile, type IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { cn, copyToClipboard } from "@/lib/utils";
import type { AssetOut } from "@/utils/api/models";
import { errorMessage, isApiError } from "@/utils/errors";

/** What both portals get for an asset (the client also gets who can see it). */
export type AssetBase = Omit<AssetOut, "vaIds">;

export type AssetKind = AssetBase["kind"];

export const ASSET_KINDS: Record<AssetKind, { label: string; plural: string; icon: IconName; tone: Tone }> = {
  login: { label: "Login", plural: "Logins", icon: "lock", tone: "cyan" },
  link: { label: "Link", plural: "Links", icon: "link", tone: "sky" },
  note: { label: "Note", plural: "Notes", icon: "form", tone: "amber" },
};

/** "https://shop.example.com/admin" → "shop.example.com". */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Search by title, category, web address, username or notes. */
export function matchesAsset(a: AssetBase, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [a.title, a.category, a.url, a.username, a.notes].some((v) => v.toLowerCase().includes(q));
}

/** By category (A–Z, uncategorized last), then by name, so assets of one category sit together. */
export function sortByCategory<T extends { category: string; title: string }>(assets: T[]): T[] {
  return [...assets].sort(
    (x, y) => (x.category ? 0 : 1) - (y.category ? 0 : 1) || x.category.localeCompare(y.category) || x.title.localeCompare(y.title),
  );
}

/** How long a shown password stays on screen. */
const SHOW_FOR_MS = 20_000;
/** A copied password is wiped from the clipboard after this long (like a password manager). */
const CLEAR_CLIPBOARD_MS = 30_000;
let clipboardTimer: ReturnType<typeof setTimeout> | null = null;

/** Empty the clipboard later; a newer copied password restarts the wait. Kept outside the row so it still runs after you leave the page. */
function clearClipboardLater() {
  if (clipboardTimer) clearTimeout(clipboardTimer);
  clipboardTimer = setTimeout(() => {
    clipboardTimer = null;
    navigator.clipboard?.writeText("").catch(() => undefined);
  }, CLEAR_CLIPBOARD_MS);
}

type AssetListProps<T extends AssetBase> = {
  /** In display order (see sortByCategory). */
  assets: T[];
  /** Fetches the password (each look is in the audit log). */
  loadPassword: (id: string) => Promise<string>;
  /** Why the password can't be shown here (e.g. view-only access); null = it can. */
  passwordBlocked?: string | null;
  /** The last column's heading and content: who can see it (client) or whose it is (VA). */
  asideLabel?: string;
  aside?: (asset: T) => ReactNode;
  /** Edit / delete buttons. */
  actions?: (asset: T) => ReactNode;
};

/** The assets list: one row per login, link or note, with name, username, password and category columns. */
export function AssetList<T extends AssetBase>({ assets, loadPassword, passwordBlocked, asideLabel, aside, actions }: AssetListProps<T>) {
  return (
    <div className="ast-table" role="table" aria-label="Assets">
      <div className="ast-table__head" role="row">
        <span role="columnheader">Name</span>
        <span role="columnheader">Username</span>
        <span role="columnheader">Password</span>
        <span role="columnheader">Category</span>
        <span role="columnheader">{aside ? asideLabel : ""}</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {assets.map((a) => (
        <AssetRow key={a.id} asset={a} loadPassword={loadPassword} passwordBlocked={passwordBlocked} aside={aside?.(a)} actions={actions?.(a)} />
      ))}
    </div>
  );
}

function AssetRow<T extends AssetBase>({
  asset,
  loadPassword,
  passwordBlocked,
  aside,
  actions,
}: {
  asset: T;
  loadPassword: (id: string) => Promise<string>;
  passwordBlocked?: string | null;
  aside?: ReactNode;
  actions?: ReactNode;
}) {
  const kind = ASSET_KINDS[asset.kind];
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className={cn("ast-row", `is-${asset.kind}`, notesOpen && "is-open")} role="row">
      <div className="ast-row__main" role="cell">
        <IconTile tone={kind.tone} size="sm">
          <Icon name={kind.icon} size={15} />
        </IconTile>
        <div className="ast-row__titles">
          <strong className="ast-row__title">{asset.title}</strong>
          {asset.url ? (
            <a className="ast-row__url" href={asset.url} target="_blank" rel="noopener noreferrer">
              {hostOf(asset.url)} <Icon name="arrowRight" size={11} />
            </a>
          ) : (
            <span className="ast-row__url is-muted">{kind.label}</span>
          )}
        </div>
      </div>

      <div className="ast-row__cell" role="cell" data-label="Username">
        {asset.username ? <CopyField label="Username" value={asset.username} /> : <span className="ast-row__none">—</span>}
      </div>
      <div className="ast-row__cell" role="cell" data-label="Password">
        {asset.hasPassword ? <PasswordField id={asset.id} load={loadPassword} blocked={passwordBlocked} /> : <span className="ast-row__none">—</span>}
      </div>
      <div className="ast-row__category" role="cell" data-label="Category">
        {asset.category ? <span className="ast-chip">{asset.category}</span> : <span className="ast-row__none">—</span>}
      </div>
      <div className="ast-row__aside" role="cell">
        {aside}
      </div>
      <div className="ast-row__actions" role="cell">
        {asset.notes && (
          <IconButton size="sm" ghost label={notesOpen ? "Hide notes" : "Show notes"} onClick={() => setNotesOpen((o) => !o)} aria-expanded={notesOpen} className={cn(notesOpen && "is-active")}>
            <Icon name="form" size={14} />
          </IconButton>
        )}
        {actions}
      </div>

      {notesOpen && asset.notes && <p className="ast-row__notes">{asset.notes}</p>}
    </div>
  );
}

/** A copy button that shows a check for a moment after copying. */
function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return [
    copied,
    (text) => {
      copyToClipboard(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    },
  ];
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, copy] = useCopied();
  return (
    <div className="ast-field">
      <span className="ast-field__value" title={value}>
        {value}
      </span>
      <IconButton size="sm" ghost label={copied ? "Copied" : `Copy ${label.toLowerCase()}`} onClick={() => copy(value)}>
        <Icon name={copied ? "check" : "copy"} size={13} />
      </IconButton>
    </div>
  );
}

/** Masked until asked for; shown for 20 seconds, then hidden again. */
function PasswordField({ id, load, blocked }: { id: string; load: (id: string) => Promise<string>; blocked?: string | null }) {
  const [shown, setShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** null = fine; otherwise the reason it couldn't load (shown on hover). */
  const [error, setError] = useState<{ short: string; full: string } | null>(null);
  const [copied, copy] = useCopied();
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (hide.current && clearTimeout(hide.current)), []);
  // Hide it as soon as you switch tabs, minimise the window or lock the screen.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && setShown(null);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const fetchIt = async (): Promise<string | null> => {
    if (shown !== null) return shown;
    setBusy(true);
    setError(null);
    try {
      return await load(id);
    } catch (e) {
      // They closed the "confirm it's you" pop-up: nothing went wrong.
      if (e instanceof Error && e.name === "UnlockCancelled") return null;
      const limited = isApiError(e) && e.status === 429;
      setError({ short: limited ? "Paused, try soon" : "Couldn’t load", full: errorMessage(e) });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const show = async () => {
    if (shown !== null) return setShown(null);
    const pw = await fetchIt();
    if (pw === null) return;
    setShown(pw);
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setShown(null), SHOW_FOR_MS);
  };
  const copyIt = async () => {
    const pw = await fetchIt();
    if (pw === null) return;
    copy(pw);
    clearClipboardLater();
  };

  return (
    <div className={cn("ast-field ast-field--secret", error && "is-error")} title={blocked ?? error?.full}>
      {/* translate="no": browser translation must never send a password off to be translated. */}
      <span className={cn("ast-field__value", shown === null && "is-masked")} translate="no" aria-live="polite">
        {error ? error.short : (shown ?? "••••••••••")}
      </span>
      {!blocked && (
        <>
          <IconButton size="sm" ghost label={shown !== null ? "Hide password" : "Show password"} onClick={show} disabled={busy}>
            <Icon name="eye" size={13} />
          </IconButton>
          <IconButton size="sm" ghost label={copied ? "Copied. Clears from the clipboard in 30 seconds" : "Copy password"} onClick={copyIt} disabled={busy}>
            <Icon name={copied ? "check" : "copy"} size={13} />
          </IconButton>
        </>
      )}
    </div>
  );
}
