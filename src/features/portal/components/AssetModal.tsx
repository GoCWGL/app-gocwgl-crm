"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Avatar, Button, Field, FormError, Icon, IconButton, IconTile, Input, Modal, PasswordInput, SegmentedControl, Textarea } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn, generatePassword, normalizeUrl } from "@/lib/utils";
import type { AssetIn, AssetVa } from "@/utils/api/models";
import { ASSET_KINDS, type AssetBase, type AssetKind } from "./AssetList";

/** What the form saves: everything but the password, which is added only when it changes (see `password`). */
export type AssetSave = Omit<AssetIn, "password"> & { password?: string };

/** The words that differ between the client portal (sharing with their VAs) and the VA portal (with teammates). */
export type AssetModalCopy = {
  subtitle: string;
  /** "VAs who can see this" / "Teammates who can see this". */
  shareLabel: string;
  /** Count line: "2 of 3 VAs". */
  people: string;
  /** Nobody picked yet. */
  onlyYou: string;
  /** No one to share with. */
  nobody: string;
};

/**
 * Add or edit an asset: what it is, the login details, and who can see it. Used by the client portal (picking their
 * VAs) and the VA portal (picking teammates on that client's team). `onSave` runs the request; call `done` on success.
 */
export function AssetModal({
  asset,
  vas,
  categories,
  copy,
  pending,
  error: saveError,
  onSave,
  onClose,
  children,
}: {
  asset: (AssetBase & { vaIds?: string[] }) | null;
  vas: AssetVa[];
  categories: string[];
  copy: AssetModalCopy;
  pending: boolean;
  error: unknown;
  onSave: (body: AssetSave) => void;
  onClose: () => void;
  /** Extra fields above the rest (the VA portal's client picker). */
  children?: ReactNode;
}) {
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? "login");
  const [title, setTitle] = useState(asset?.title ?? "");
  const [category, setCategory] = useState(asset?.category ?? "");
  const [url, setUrl] = useState(asset?.url ?? "");
  const [username, setUsername] = useState(asset?.username ?? "");
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [vaIds, setVaIds] = useState<string[]>(asset?.vaIds ?? []);
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
    if (asset) {
      // Leave the password out to keep it; "" removes it.
      const pw = !isLogin || clearPassword ? { password: "" } : password ? { password } : {};
      onSave({ ...body, ...pw });
    } else {
      onSave({ ...body, password: isLogin ? password : "" });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="asset-modal"
      kicker="ASSETS"
      title={asset ? `Edit ${asset.title}` : "Add an asset"}
      subtitle={copy.subtitle}
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
          <Button type="submit" variant="primary" disabled={!!error || pending}>
            {pending ? "Saving…" : asset ? "Save changes" : "Add asset"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        {children}
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

        <Field label={copy.shareLabel}>
          {vas.length ? (
            <div className="ast-share">
              <div className="ast-share__head">
                <span className="text-small">{vaIds.length ? `${vaIds.length} of ${vas.length} ${copy.people}` : copy.onlyYou}</span>
                <button type="button" className="btn btn--link" onClick={() => setVaIds(allOn ? [] : vas.map((v) => v.id))}>
                  {allOn ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="ast-share__list" role="group" aria-label={copy.shareLabel}>
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
            <p className="text-small ast-share__none">{copy.nobody}</p>
          )}
        </Field>
        {error && title && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
        <FormError error={saveError} />
      </div>
    </Modal>
  );
}
