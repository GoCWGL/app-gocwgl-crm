"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LEGAL_LINKS } from "@/data/legal";

/** Shown only in the prerendered HTML, for the instant before the page hydrates. */
const FALLBACK_YEAR = 2026;
const noSubscribe = () => () => {};

/**
 * The visitor's current year. The server snapshot is a constant because, with
 * Cache Components, reading the clock during prerender would freeze the build year.
 */
function useCurrentYear() {
  return useSyncExternalStore(
    noSubscribe,
    () => new Date().getFullYear(),
    () => FALLBACK_YEAR,
  );
}

/** "© <year> GoCWGL · Privacy · Terms · Status". The year rolls over on its own every January. */
export function LegalLinks({ className }: { className?: string }) {
  const year = useCurrentYear();
  return (
    <p className={className}>
      © {year} GoCWGL
      {LEGAL_LINKS.map((link) => (
        <span key={link.href}>
          {" · "}
          <Link href={link.href}>{link.label}</Link>
        </span>
      ))}
    </p>
  );
}
