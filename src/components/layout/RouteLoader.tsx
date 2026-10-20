"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { NAV_START_EVENT, SECTION_CHANGE_EVENT, type NavStartDetail } from "@/utils/navigation";

/** Keep the screen up at least this long, so a fast navigation reads as a transition, not a flicker. */
const MIN_VISIBLE_MS = 700;
/** Matches the fade-out in _route-loader.scss. */
const FADE_OUT_MS = 280;
/** Never leave the screen stuck if a navigation is abandoned. */
const GIVE_UP_MS = 10_000;

type Destination = { title: string; steps: readonly string[] };

const DESTINATIONS: Array<[prefix: string, Destination]> = [
  ["/admin", { title: "Opening your CRM", steps: ["Loading contacts", "Syncing your pipeline", "Preparing the dashboard"] }],
  ["/portal", { title: "Opening your portal", steps: ["Checking your funnels", "Gathering today's leads", "Building your reports"] }],
  ["/login", { title: "Heading to sign in", steps: ["Securing your connection"] }],
  ["/status", { title: "Checking system status", steps: ["Pinging the platform"] }],
];
const DEFAULT_DESTINATION: Destination = { title: "Loading", steps: ["Getting the page ready"] };

const destinationFor = (path: string) =>
  DESTINATIONS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? DEFAULT_DESTINATION;

type Phase = "idle" | "active" | "leaving";

/**
 * Full-screen branded loader for route changes, plus a top progress sweep.
 * Route changes are announced by instrumentation-client.ts; the screen lifts once
 * the address has moved off the page we started on (redirects included).
 * Sidebar section switches only get the progress sweep.
 */
export function RouteLoader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [destination, setDestination] = useState<Destination>(DEFAULT_DESTINATION);
  const [sweep, setSweep] = useState(0);
  const fromPath = useRef<string | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    const onStart = (e: Event) => {
      const target = new URL((e as CustomEvent<NavStartDetail>).detail.url, window.location.href);
      // Query-only changes on the same page are not a new page.
      if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return;
      fromPath.current = window.location.pathname;
      startedAt.current = performance.now();
      // The router fires this inside its own transition (sometimes mid-render, for redirects in effects).
      // A microtask is outside both, so the loader paints over the old page instead of waiting for the new one.
      queueMicrotask(() => {
        setDestination(destinationFor(target.pathname));
        setPhase("active");
      });
    };
    const onSection = () => setSweep((n) => n + 1);

    window.addEventListener(NAV_START_EVENT, onStart);
    window.addEventListener(SECTION_CHANGE_EVENT, onSection);
    return () => {
      window.removeEventListener(NAV_START_EVENT, onStart);
      window.removeEventListener(SECTION_CHANGE_EVENT, onSection);
    };
  }, []);

  // Arrived: the new page has rendered under a different path.
  useEffect(() => {
    if (phase !== "active" || pathname === fromPath.current) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
    const id = setTimeout(() => setPhase("leaving"), wait);
    return () => clearTimeout(id);
  }, [phase, pathname]);

  useEffect(() => {
    if (phase === "idle") return;
    const id = setTimeout(() => setPhase(phase === "leaving" ? "idle" : "leaving"), phase === "leaving" ? FADE_OUT_MS : GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <>
      {phase !== "idle" && <div className={`nav-progress nav-progress--${phase}`} aria-hidden="true" />}
      {sweep > 0 && phase === "idle" && <div key={sweep} className="nav-progress nav-progress--sweep" aria-hidden="true" />}

      {phase !== "idle" && (
        <div className={`route-loader route-loader--${phase}`} role="status" aria-live="polite" aria-busy={phase === "active"}>
          <BrandLoader title={destination.title} steps={destination.steps} />
        </div>
      )}
    </>
  );
}
