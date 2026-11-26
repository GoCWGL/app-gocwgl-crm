"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { PORTAL_PAGE_GUIDE, type PortalGuideCompare, type PortalTab } from "@/data/portal";
import { cn } from "@/lib/utils";

const storageKey = (tab: PortalTab) => `portal:guide-hidden:${tab}`;

function readHidden(tab: PortalTab): boolean {
  try {
    return window.localStorage.getItem(storageKey(tab)) === "1";
  } catch {
    return false;
  }
}

/**
 * "About this page" under the page title: what the page is for and what you can do there. Open until the client
 * hides it; hidden pages keep a small "What's this page for?" button to bring it back (remembered per page).
 */
export function PageGuide({ tab }: { tab: PortalTab }) {
  const guide = PORTAL_PAGE_GUIDE[tab];
  const [hidden, setHidden] = useState(() => readHidden(tab));
  const toggle = (next: boolean) => {
    setHidden(next);
    try {
      if (next) window.localStorage.setItem(storageKey(tab), "1");
      else window.localStorage.removeItem(storageKey(tab));
    } catch {
      // Private mode: it just stays this way until the page reloads.
    }
  };

  if (!guide) return null;
  if (hidden) {
    return (
      <button type="button" className="page-guide-toggle" onClick={() => toggle(false)} aria-expanded={false}>
        <Icon name="lifebuoy" size={14} strokeWidth={2} />
        What&rsquo;s this page for?
      </button>
    );
  }
  return (
    <section className={cn("page-guide", guide.compare && "page-guide--compare")} aria-label="About this page">
      <div className="page-guide__head">
        <span className="page-guide__icon" aria-hidden="true">
          <Icon name="lifebuoy" size={18} strokeWidth={1.9} />
        </span>
        <div className="page-guide__body">
          <span className="page-guide__kicker">ABOUT THIS PAGE</span>
          <p className="page-guide__purpose">{guide.purpose}</p>
          {guide.points.length > 0 && (
            <ul className="page-guide__points">
              {guide.points.map((p) => (
                <li key={p}>
                  <Icon name="check" size={13} strokeWidth={2.4} />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {guide.compare && (
        <div className="guide-compare">
          <CompareCard side={guide.compare[0]} />
          <span className="guide-compare__vs" aria-hidden="true">
            VS
          </span>
          <CompareCard side={guide.compare[1]} />
        </div>
      )}
      <button type="button" className="page-guide__close" onClick={() => toggle(true)} aria-label="Hide this explanation" title="Hide">
        <Icon name="close" size={14} strokeWidth={2.2} />
      </button>
    </section>
  );
}

/** One side of the comparison: title and who it's for, then the same rows as the other side. */
function CompareCard({ side }: { side: PortalGuideCompare }) {
  return (
    <article className={cn("guide-compare__card", `is-${side.tone}`)} aria-label={side.title}>
      <header className="guide-compare__head">
        <span className="guide-compare__icon" aria-hidden="true">
          <Icon name={side.icon} size={18} strokeWidth={1.9} />
        </span>
        <strong className="guide-compare__title">{side.title}</strong>
        <span className="guide-compare__tag">{side.tag}</span>
      </header>
      <dl className="guide-compare__rows">
        {side.rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
