import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = {
  label: string;
  value: number;
  /** Text above the bar; defaults to the value. */
  display?: string;
  color?: string;
};

type BarChartProps = {
  data: BarDatum[];
  /** Tallest bar height as a percentage of the chart (leaves room for labels). */
  maxHeight?: number;
  /** Smallest bar height so zero values stay visible. */
  minHeight?: number;
  short?: boolean;
  label: string;
};

/** Lightweight vertical bar chart built with flexbox (no chart library). */
export function BarChart({ data, maxHeight = 85, minHeight = 3, short, label }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <figure className="stack stack--4" aria-label={label}>
      <div className={cn("bar-chart", short && "bar-chart--short")}>
        {data.map((d, i) => {
          const height = Math.max(minHeight, Math.round((d.value / max) * maxHeight));
          const style = { "--bar": `${height}%`, ...(d.color ? { "--bar-color": d.color } : {}) } as CSSProperties;
          return (
            <div className="bar-chart__col" key={d.label + i}>
              <span className="bar-chart__value">{d.display ?? d.value}</span>
              <div className="bar-chart__bar" style={style} />
            </div>
          );
        })}
      </div>
      <div className="bar-chart__axis" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.label + i}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}
