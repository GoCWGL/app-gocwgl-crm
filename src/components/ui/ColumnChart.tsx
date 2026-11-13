"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type ColumnSeries = { key: string; label: string; color: string };
export type ColumnDatum = {
  /** Under the column ("3", "Nov"). */
  label: string;
  /** Tooltip heading ("Tue, Nov 3"). */
  title: string;
  /** One value per series, in series order. */
  values: number[];
  /** Today / this month: a soft highlight behind the column. */
  current?: boolean;
  /** Still to come (later this month): the label is dimmed. */
  future?: boolean;
};

type Props = {
  series: ColumnSeries[];
  data: ColumnDatum[];
  /** Value in the tooltip ("3h 20m", "$1,200"). */
  format: (n: number) => string;
  /** Value on the y-axis ("4h", "$1k"); defaults to `format`. */
  axisFormat?: (n: number) => string;
  label: string;
  height?: number;
  /** Counts: keep the y-axis on whole numbers. */
  integer?: boolean;
};

/** A round top for the y-axis: 4 even steps of 1, 2, 2.5 or 5 × 10ⁿ. */
function niceMax(max: number, integer = false): number {
  if (max <= 0) return 4;
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((n) => n * mag).find((n) => n >= raw && (!integer || Number.isInteger(n))) ?? 10 * mag;
  return Math.max(integer ? 1 : 0, step) * 4;
}

/** Vertical columns (grouped when there's more than one series) with a y-axis, gridlines and a hover tooltip. */
export function ColumnChart({ series, data, format, axisFormat = format, label, height = 220, integer }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(0, ...data.flatMap((d) => d.values)), integer);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  // Thin the axis labels so they never collide (about 16 across).
  const every = Math.max(1, Math.ceil(data.length / 16));

  return (
    <figure className="col-chart" aria-label={label}>
      {series.length > 1 && (
        <ul className="col-chart__legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className="col-chart__swatch" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="col-chart__plot" style={{ height }}>
        <div className="col-chart__grid" aria-hidden="true">
          {ticks.map((t, i) => (
            <div key={i} className="col-chart__tick">
              <span>{axisFormat(t)}</span>
            </div>
          ))}
        </div>
        <div className="col-chart__cols" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.title + i}
              className={cn("col-chart__col", d.current && "is-current", hover === i && "is-hover")}
              tabIndex={0}
              aria-label={`${d.title}: ${series.map((s, j) => `${s.label} ${format(d.values[j] ?? 0)}`).join(", ")}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <div className="col-chart__bars">
                {d.values.map((v, j) => (
                  <span
                    key={series[j]?.key ?? j}
                    className="col-chart__bar"
                    style={{ height: v > 0 ? `max(2px, ${(v / top) * 100}%)` : 0, "--bar-color": series[j]?.color } as CSSProperties}
                  />
                ))}
              </div>
              {hover === i && (
                <div className={cn("col-chart__tip", i > data.length / 2 && "is-left")} role="tooltip">
                  <strong>{d.title}</strong>
                  {series.map((s, j) => (
                    <span key={s.key} className="col-chart__tip-row">
                      <span className="col-chart__swatch" style={{ background: s.color }} aria-hidden="true" />
                      <span className="u-grow">{s.label}</span>
                      <b>{format(d.values[j] ?? 0)}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="col-chart__axis" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.title + i} className={cn(d.future && "is-future", d.current && "is-current")}>
            {i % every === 0 || d.current ? d.label : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
