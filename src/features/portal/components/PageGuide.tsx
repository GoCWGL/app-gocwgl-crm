"use client";

import { Icon } from "@/components/ui";
import { PORTAL_PAGE_GUIDE, type PortalGuideCompare, type PortalTab } from "@/data/portal";
import { cn } from "@/lib/utils";

/** The round "?" next to the page title: shows or hides "About this page" (only on pages that have one). */
export function PageGuideButton({ tab, open, onToggle }: { tab: PortalTab; open: boolean; onToggle: () => void }) {
  if (!PORTAL_PAGE_GUIDE[tab]) return null;
  return (
    <button
      type="button"
      className={cn("page-guide-btn", open && "is-open")}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="page-guide"
      aria-label={open ? "Hide what this page is for" : "What’s this page for?"}
      title={open ? "Hide" : "What’s this page for?"}
    >
      <Icon name="help" size={17} strokeWidth={2} />
    </button>
  );
}

/**
 * "About this page" under the page title: what the page is for and what you can do there. Closed until the client
 * opens it with the "?" next to the title, so it takes no room on the page.
 */
export function PageGuide({ tab, onClose }: { tab: PortalTab; onClose: () => void }) {
  const guide = PORTAL_PAGE_GUIDE[tab];
  if (!guide) return null;
  return (
    <section id="page-guide" className={cn("page-guide", guide.compare && "page-guide--compare")} aria-label="About this page">
      <div className="page-guide__head">
        <span className="page-guide__icon" aria-hidden="true">
          <Icon name="help" size={18} strokeWidth={1.9} />
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
      <button type="button" className="page-guide__close" onClick={onClose} aria-label="Hide this explanation" title="Hide">
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
