"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export type AreaPoint = {
  /** Under the axis ("Dec"). */
  label: string;
  /** Tooltip heading ("December 2026"). */
  title: string;
  value: number;
};

type Props = {
  data: AreaPoint[];
  color: string;
  /** Value in the tooltip. */
  format: (n: number) => string;
  /** Value on the y-axis. */
  axisFormat?: (n: number) => string;
  /** Says what it shows, to screen readers. */
  label: string;
  height?: number;
};

const W = 1000;

/** A round top for the y-axis: 4 even steps of 1, 2, 2.5 or 5 × 10ⁿ. */
function niceMax(max: number): number {
  if (max <= 0) return 4;
  const mag = 10 ** Math.floor(Math.log10(max / 4));
  return ([1, 2, 2.5, 5, 10].map((n) => n * mag).find((n) => n >= max / 4) ?? 10 * mag) * 4;
}

/** One series over time: a line with a soft fill, and a crosshair with the value (hover, touch or arrow keys). */
export function AreaChart({ data, color, format, axisFormat = format, label, height = 240 }: Props) {
  const gradient = useId();
  const [at, setAt] = useState<number | null>(null);
  const top = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * W : W / 2);
  const y = (v: number) => height - (Math.max(0, v) / top) * height;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join("");
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setAt(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - box.left) / box.width) * (data.length - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    setAt((i) => Math.max(0, Math.min(data.length - 1, (i ?? (step > 0 ? -1 : data.length)) + step)));
  };
  const point = at === null ? null : data[at];
  const left = at === null || data.length < 2 ? 50 : (at / (data.length - 1)) * 100;

  return (
    <figure className="area-chart" aria-label={label}>
      <div className="area-chart__row">
        <div className="area-chart__ticks" style={{ height }} aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f}>{axisFormat(top * f)}</span>
          ))}
        </div>
        <div
          className="area-chart__plot"
          style={{ height }}
          tabIndex={0}
          role="img"
          aria-label={`${label}: ${data.map((d) => `${d.title} ${format(d.value)}`).join(", ")}`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setAt(null)}
          onBlur={() => setAt(null)}
          onKeyDown={onKey}
        >
          <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.22" />
                <stop offset="1" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={height * f} y2={height * f} className="area-chart__grid" vectorEffect="non-scaling-stroke" />
            ))}
            {data.length > 1 && <path d={`${line}L${W},${height}L0,${height}Z`} fill={`url(#${gradient})`} />}
            <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {point && (
            <>
              <span className="area-chart__cross" style={{ left: `${left}%` }} aria-hidden="true" />
              <span className="area-chart__dot" style={{ left: `${left}%`, top: y(point.value), background: color }} aria-hidden="true" />
              <span className={left > 60 ? "area-chart__tip is-left" : "area-chart__tip"} style={{ left: `${left}%` }} role="status">
                {point.title}
                <b>{format(point.value)}</b>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="area-chart__axis" aria-hidden="true">
        {data.map((d) => (
          <span key={d.title}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}
