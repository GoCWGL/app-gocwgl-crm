import { useEffect, useRef } from "react";

// Browser events that drive the page-transition loader (<RouteLoader>).
// Plain window events, so instrumentation-client.ts can fire them before React knows anything.

/** A route change has started; detail.url is where it is going. */
export const NAV_START_EVENT = "gocwgl:nav-start";
/** An in-page section switch (admin / portal sidebar): just the top progress sweep. */
export const SECTION_CHANGE_EVENT = "gocwgl:section-change";

export type NavStartDetail = { url: string };

export function announceNavigation(url: string) {
  window.dispatchEvent(new CustomEvent<NavStartDetail>(NAV_START_EVENT, { detail: { url } }));
}

export function announceSectionChange() {
  window.dispatchEvent(new Event(SECTION_CHANGE_EVENT));
}

/** Fire the section sweep when `section` changes (not on first mount, so it never trails the page loader). */
export function useSectionChangeSweep(section: string) {
  const previous = useRef(section);
  useEffect(() => {
    if (previous.current === section) return;
    previous.current = section;
    announceSectionChange();
  }, [section]);
}
