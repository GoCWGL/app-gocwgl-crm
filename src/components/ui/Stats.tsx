import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneClass, type Tone } from "@/lib/tones";

export type StatItem = {
  label: string;
  value: ReactNode;
  tone?: Tone;
  /** Short symbol shown in a tinted square instead of the glow bar ("#", "$"). */
  glyph?: string;
};

type StatTileProps = StatItem & {
  /** Label above value, no colored bar. */
  plain?: boolean;
};

export function StatTile({ label, value, tone = "cyan", glyph, plain }: StatTileProps) {
  return (
    <div className={cn("stat-tile", plain && "stat-tile--plain", toneClass(tone))}>
      {!plain &&
        (glyph ? (
          <span className="stat-tile__glyph" aria-hidden="true">
            {glyph}
          </span>
        ) : (
          <span className="stat-tile__bar" aria-hidden="true" />
        ))}
      <div className="stat-tile__body">
        <span className="stat-tile__label">{label}</span>
        <span className="stat-tile__value">{value}</span>
      </div>
    </div>
  );
}

/** Responsive grid of StatTiles. */
export function StatGrid({ items, plain, wide }: { items: StatItem[]; plain?: boolean; wide?: boolean }) {
  return (
    <div className={cn("stat-grid", wide && "stat-grid--wide")}>
      {items.map((item) => (
        <StatTile key={item.label} {...item} plain={plain} />
      ))}
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  /** Color of <strong> text in the footer (trend up/down). */
  trendColor?: string;
};

/** Big number card used on the dashboard and portal overview. */
export function KpiCard({ label, value, icon, footer, trendColor }: KpiCardProps) {
  const style = trendColor ? ({ "--trend": trendColor } as CSSProperties) : undefined;
  return (
    <div className="kpi-card" style={style}>
      <div className="kpi-card__head">
        <span className="kpi-card__label">{label}</span>
        {icon}
      </div>
      <span className="kpi-card__value">{value}</span>
      {footer && <span className="kpi-card__foot">{footer}</span>}
    </div>
  );
}
