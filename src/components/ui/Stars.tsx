"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STAR = "M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z";

/** Read-only stars (supports halves for averages, e.g. 4.5). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("stars", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={`star-${n}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f5a524" />
                <stop offset={`${fill * 100}%`} stopColor="#e3e8ef" />
              </linearGradient>
            </defs>
            <path d={STAR} fill={`url(#star-${n}-${Math.round(fill * 100)})`} />
          </svg>
        );
      })}
    </span>
  );
}

const WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

/** Pick 1–5 stars (hover previews; arrow keys work). */
export function StarInput({ value, onChange, size = 30 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="star-input">
      <span role="radiogroup" aria-label="Rating" className="star-input__stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={cn("star-input__star", n <= shown && "is-on")}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(5, (value || 0) + 1));
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(1, (value || 2) - 1));
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} />
            </svg>
          </button>
        ))}
      </span>
      <span className="star-input__word">{WORDS[shown] || "Tap to rate"}</span>
    </span>
  );
}
