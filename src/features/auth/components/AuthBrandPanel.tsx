import type { CSSProperties } from "react";
import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { BRAND_PANEL } from "@/data/auth";
import { LegalLinks } from "@/features/legal";
import { toneClass } from "@/lib/tones";

// Split so each word can animate in on its own; the last one gets the "live" treatment.
const titleWords = BRAND_PANEL.title.split(" ");

/** Left half of the sign-in page: logo, pitch and a live status card. */
export function AuthBrandPanel() {
  return (
    <section className="auth-brand" aria-label="About GoCWGL">
      <Image className="auth-brand__logo" src={logoWordmark} alt="GoCWGL" priority />

      <div className="auth-brand__pitch hide-sm">
        <span className="kicker">{BRAND_PANEL.kicker}</span>
        <h1 className="auth-brand__title" aria-label={BRAND_PANEL.title}>
          {titleWords.map((word, i) => (
            <span
              key={i}
              className={`auth-brand__word${i === titleWords.length - 1 ? " auth-brand__word--live" : ""}`}
              style={{ "--i": i } as CSSProperties}
              aria-hidden="true"
            >
              {word}
            </span>
          ))}
        </h1>
        <p className="auth-brand__body">{BRAND_PANEL.body}</p>
      </div>

      <div className="auth-status hide-sm">
        <div className="auth-status__head">
          <span className="auth-status__dot u-pulse" aria-hidden="true" />
          <span className="auth-status__title">{BRAND_PANEL.panelTitle}</span>
          <span className="auth-status__live">LIVE</span>
        </div>
        <div className="auth-status__rows">
          {BRAND_PANEL.rows.map((row) => (
            <div className="auth-status__row" key={row.label}>
              <span className={`auth-status__icon ${toneClass(row.tone)}`} aria-hidden="true">
                {row.icon}
              </span>
              <span className="auth-status__label">{row.label}</span>
              <span className="auth-status__value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <LegalLinks className="auth-brand__legal hide-sm" />
    </section>
  );
}
