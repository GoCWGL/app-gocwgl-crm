"use client";

import { useState } from "react";
import { Button, Field, IconButton, Input } from "@/components/ui";
import { SOCIAL_NETWORKS, type CustomLink, type SocialKey } from "@/data/portal";
import { toneClass } from "@/lib/tones";
import { cn, isUrl, moveItem, newId, normalizeUrl } from "@/lib/utils";
import { socialLinkError } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

/** Social networks + custom links the client wants on their pages and emails. */
export function SocialLinksCard() {
  const { state, update } = usePortal();
  const { socials, customLinks } = state;
  const [touched, setTouched] = useState<Partial<Record<SocialKey, boolean>>>({});

  const setSocial = (key: SocialKey, value: string) => update((s) => ({ socials: { ...s.socials, [key]: value } }));
  const setCustom = (links: CustomLink[]) => update({ customLinks: links });
  const patchCustom = (id: number, patch: Partial<CustomLink>) =>
    setCustom(customLinks.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const validNetworks = SOCIAL_NETWORKS.filter((n) => socials[n.key] && !socialLinkError(n.key, socials[n.key]));
  const validCustom = customLinks.filter((c) => c.url.trim() && isUrl(c.url));
  const preview = [
    ...validNetworks.map((n) => ({ label: n.label, short: n.short, tone: n.tone, url: socials[n.key] })),
    ...validCustom.map((c) => ({
      label: c.label.trim() || c.url.replace(/^https?:\/\//, ""),
      short: "↗",
      tone: "brand" as const,
      url: c.url,
    })),
  ];

  const save = () => {
    const nextSocials = { ...socials };
    (Object.keys(nextSocials) as SocialKey[]).forEach((k) => (nextSocials[k] = normalizeUrl(nextSocials[k] || "")));
    const nextCustom = customLinks.map((c) => ({ ...c, url: normalizeUrl(c.url), touched: true }));
    const badNetwork = SOCIAL_NETWORKS.some((n) => socialLinkError(n.key, nextSocials[n.key]));
    const badCustom = nextCustom.some((c) => (c.url && !isUrl(c.url)) || (c.label.trim() && !c.url));

    setTouched(Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, true])));
    if (badNetwork || badCustom) {
      update({ socials: nextSocials, customLinks: nextCustom, toast: "" });
      return;
    }
    update({
      socials: nextSocials,
      customLinks: nextCustom.filter((c) => c.url),
      toast: "Your links were saved. We will add them to your pages and email footers.",
    });
  };

  return (
    <section className="card social-links" aria-label="Social media and links">
      <div className="section-head">
        <div className="stack stack--2">
          <span className="kicker">SOCIAL MEDIA &amp; LINKS</span>
          <span className="text-muted">
            We add these to your landing pages, booking page and email footers. Leave any you don’t use empty.
          </span>
        </div>
        <span className="text-small u-strong">{validNetworks.length + validCustom.length} links connected</span>
      </div>

      <div className="social-links__grid">
        {SOCIAL_NETWORKS.map((n) => {
          const value = socials[n.key] || "";
          const error = socialLinkError(n.key, value);
          const showError = !!error && !!touched[n.key];
          return (
            <Field key={n.key} label={n.label} htmlFor={`soc-${n.key}`} error={showError && error}>
              <div className={cn("link-input", showError && "link-input--invalid")}>
                <span className={cn("link-input__badge", toneClass(n.tone))} aria-hidden="true">
                  {n.short}
                </span>
                <input
                  id={`soc-${n.key}`}
                  className="link-input__control"
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={`https://${n.placeholder}`}
                  value={value}
                  onChange={(e) => setSocial(n.key, e.target.value)}
                  onBlur={() => {
                    setSocial(n.key, normalizeUrl(value));
                    setTouched((t) => ({ ...t, [n.key]: true }));
                  }}
                />
                {!!value.trim() && !error && (
                  <span className="link-input__ok" aria-label="Looks good">
                    ✓
                  </span>
                )}
              </div>
            </Field>
          );
        })}
      </div>

      <div className="stack stack--10 social-links__custom">
        <div className="stack stack--2">
          <span className="kicker">CUSTOM LINKS</span>
          <span className="text-muted">Anything else: your online store, podcast, booking app, review page, Linktree…</span>
        </div>
        {customLinks.map((c, i) => {
          const bad = c.touched && !!c.url.trim() && !isUrl(c.url);
          return (
            <div className="custom-link inset" key={c.id}>
              <span className="custom-link__index" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Field label="Label" htmlFor={`cl-l-${c.id}`} className="custom-link__label">
                <Input
                  id={`cl-l-${c.id}`}
                  size="sm"
                  value={c.label}
                  placeholder="e.g. Shop our merch"
                  onChange={(e) => patchCustom(c.id, { label: e.target.value })}
                />
              </Field>
              <Field
                label="Link"
                htmlFor={`cl-u-${c.id}`}
                className="custom-link__url"
                error={bad && "Enter a full web address, like https://shop.example.com"}
              >
                <Input
                  id={`cl-u-${c.id}`}
                  type="url"
                  inputMode="url"
                  size="sm"
                  mono
                  spellCheck={false}
                  placeholder="https://"
                  value={c.url}
                  aria-invalid={bad}
                  onChange={(e) => patchCustom(c.id, { url: e.target.value })}
                  onBlur={() => patchCustom(c.id, { url: normalizeUrl(c.url), touched: true })}
                />
              </Field>
              <div className="custom-link__actions">
                <IconButton label="Move link up" disabled={i === 0} onClick={() => setCustom(moveItem(customLinks, i, i - 1))}>
                  ↑
                </IconButton>
                <IconButton label={`Remove link ${c.label}`} danger onClick={() => setCustom(customLinks.filter((x) => x.id !== c.id))}>
                  ×
                </IconButton>
              </div>
            </div>
          );
        })}
        <Button
          variant="dashed"
          onClick={() => setCustom([...customLinks, { id: newId(), label: "", url: "", touched: false }])}
        >
          + Add custom link
        </Button>
      </div>

      <div className="inset inset--soft">
        <span className="kicker kicker--muted">PREVIEW · HOW THEY SHOW IN YOUR FOOTER</span>
        <div className="cluster cluster--8">
          {preview.map((p) => (
            <a className="link-pill" key={p.label + p.url} href={p.url} target="_blank" rel="noopener">
              <span className={cn("link-pill__mark", toneClass(p.tone))} aria-hidden="true">
                {p.short}
              </span>
              {p.label}
            </a>
          ))}
          {preview.length === 0 && <span className="text-small">Add a link above to see it here.</span>}
        </div>
      </div>

      <Button variant="primary" className="u-self-end" onClick={save}>
        Save links
      </Button>
    </section>
  );
}
