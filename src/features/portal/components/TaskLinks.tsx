"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";

/** "https://docs.google.com/document/d/…" → "docs.google.com/document/d/…". */
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** A task's links as small chips that open in a new tab. */
export function TaskLinkChips({ links, max }: { links: string[]; max?: number }) {
  if (!links.length) return null;
  const shown = max ? links.slice(0, max) : links;
  return (
    <ul className="tk-links">
      {shown.map((url) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer noopener" title={url}>
            <Icon name="link" size={12} />
            <span>{bare(url)}</span>
          </a>
        </li>
      ))}
      {max && links.length > max && <li className="tk-links__more">+{links.length - max} more</li>}
    </ul>
  );
}

/**
 * A task's links in full, for the details pop-up: the site, the whole address, and Open and Copy buttons, so every
 * link the client added is easy to reach.
 */
export function TaskLinkList({ links }: { links: string[] }) {
  const [copied, setCopied] = useState("");
  if (!links.length) return <p className="tk-linklist__empty">No links were added to this task.</p>;
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied((c) => (c === url ? "" : c)), 1800);
    } catch {
      // Clipboard blocked: the address is on screen to select.
    }
  };
  return (
    <ul className="tk-linklist">
      {links.map((url, i) => {
        let host = "";
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          host = bare(url).split("/")[0];
        }
        return (
          <li key={`${url}-${i}`} className="tk-linklist__item">
            <span className="tk-linklist__icon" aria-hidden="true">
              <Icon name="link" size={14} />
            </span>
            <span className="tk-linklist__text">
              <strong>{host || `Link ${i + 1}`}</strong>
              <a href={url} target="_blank" rel="noreferrer noopener">
                {url}
              </a>
            </span>
            <span className="tk-linklist__actions">
              <button type="button" className="mini-action" onClick={() => copy(url)} aria-label={`Copy ${url}`}>
                <Icon name={copied === url ? "check" : "copy"} size={12} /> {copied === url ? "Copied" : "Copy"}
              </button>
              <a className="mini-action" href={url} target="_blank" rel="noreferrer noopener">
                Open <Icon name="arrowRight" size={12} />
              </a>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Editable list of links (one per row). Up to 10. */
export function LinkInputs({ value, onChange, idPrefix }: { value: string[]; onChange: (links: string[]) => void; idPrefix: string }) {
  const rows = value.length ? value : [""];
  const set = (i: number, v: string) => onChange(rows.map((x, k) => (k === i ? v : x)));
  return (
    <div className="bullet-field">
      {rows.map((x, i) => (
        <div key={i} className="bullet-field__row">
          <Icon name="link" size={14} className="tk-link-input__icon" />
          <input
            id={i === 0 ? `${idPrefix}-0` : undefined}
            className="input"
            inputMode="url"
            maxLength={500}
            value={x}
            aria-label={`Link ${i + 1}`}
            placeholder={i === 0 ? "e.g. docs.google.com/document/d/…" : "Add another link…"}
            onChange={(e) => set(i, e.target.value)}
          />
          {(rows.length > 1 || x) && (
            <button type="button" className="bullet-field__remove" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(rows.length === 1 ? [] : rows.filter((_, k) => k !== i))}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      ))}
      {rows.length < 10 && rows[rows.length - 1]?.trim() && (
        <button type="button" className="bullet-field__add" onClick={() => onChange([...rows, ""])}>
          <Icon name="plus" size={12} /> Add link
        </button>
      )}
    </div>
  );
}
