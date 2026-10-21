"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, type RefObject } from "react";
import { isApiError } from "@/utils/errors";

/**
 * Hosted pages (/book, /form, /survey) can be shown inside an <iframe> on any website. With ?embed=1 they drop
 * the logo bar and talk to /embed.js on the parent page: their height (so the iframe fits) and redirects.
 */
export const EMBED_HEIGHT = "gocwgl:height";
export const EMBED_REDIRECT = "gocwgl:redirect";

export function useIsEmbedded(): boolean {
  return useSearchParams().get("embed") === "1";
}

/** Tells the parent page how tall the content (`root`) is, whenever it changes. */
export function useReportHeight(embedded: boolean, root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!embedded || !el || window.parent === window) return;
    // The height isn't private, and the embedding site's origin isn't known, so any origin may read it.
    const send = () => window.parent.postMessage({ type: EMBED_HEIGHT, height: Math.ceil(el.getBoundingClientRect().height) }, "*");
    const observer = new ResizeObserver(send);
    observer.observe(el);
    send();
    return () => observer.disconnect();
  }, [embedded, root]);
}

/** After a submission, go to the form's "thank you" page: the whole website when embedded, not just the iframe. */
export function redirectTo(url: string, embedded: boolean) {
  if (embedded && window.parent !== window) {
    window.parent.postMessage({ type: EMBED_REDIRECT, url }, "*");
    return;
  }
  window.location.assign(url);
}

/** Per-field messages from a 422 whose details are `{ fieldId: message }` (form and survey answers). */
export function answerErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.status !== 422 || !error.details || typeof error.details !== "object" || Array.isArray(error.details)) {
    return {};
  }
  return Object.fromEntries(Object.entries(error.details as Record<string, unknown>).map(([k, v]) => [k, String(v)]));
}
