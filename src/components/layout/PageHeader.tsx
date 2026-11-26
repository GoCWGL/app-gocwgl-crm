import type { ReactNode } from "react";
import { toneClass, type Tone } from "@/lib/tones";
import { formatFull } from "@/utils/format/dates";

type PageHeaderProps = {
  /** Text after the dot, e.g. "GOCWGL // DASHBOARD". */
  kicker: string;
  title: string;
  subtitle: string;
  /** Color of the status dot before the kicker. */
  dotTone?: Tone;
  actions?: ReactNode;
  /** Something small right after the title, e.g. a "What's this page for?" button. */
  titleAside?: ReactNode;
};

export function PageHeader({ kicker, title, subtitle, dotTone = "green", actions, titleAside }: PageHeaderProps) {
  return (
    <header className="page-header">
      {/* Keyed so the titles animate in again on every page. */}
      <div className="page-header__text" key={`${kicker}:${title}`}>
        <span className="page-header__kicker">
          <span className={`page-header__dot ${toneClass(dotTone)}`} aria-hidden="true" />
          {kicker}
        </span>
        {titleAside ? (
          <div className="page-header__title-row">
            <h1 className="page-title">{title}</h1>
            {titleAside}
          </div>
        ) : (
          <h1 className="page-title">{title}</h1>
        )}
        <p className="page-header__subtitle">{subtitle}</p>
      </div>
      <div className="page-header__actions">
        <span className="page-header__date">{formatFull(new Date())}</span>
        {actions}
      </div>
    </header>
  );
}
