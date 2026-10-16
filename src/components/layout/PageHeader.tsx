import type { ReactNode } from "react";
import { TODAY_LABEL } from "@/lib/dates";
import { toneClass, type Tone } from "@/lib/tones";

type PageHeaderProps = {
  /** Text after the dot, e.g. "GOCWGL // DASHBOARD". */
  kicker: string;
  title: string;
  subtitle: string;
  /** Color of the status dot before the kicker. */
  dotTone?: Tone;
  actions?: ReactNode;
};

export function PageHeader({ kicker, title, subtitle, dotTone = "green", actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <span className="page-header__kicker">
          <span className={`page-header__dot ${toneClass(dotTone)}`} aria-hidden="true" />
          {kicker}
        </span>
        <h1 className="page-title">{title}</h1>
        <p className="page-header__subtitle">{subtitle}</p>
      </div>
      <div className="page-header__actions">
        <span className="page-header__date">{TODAY_LABEL}</span>
        {actions}
      </div>
    </header>
  );
}
