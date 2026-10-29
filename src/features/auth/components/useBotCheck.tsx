"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Public by design (it is sent to every browser); the matching secret lives only on the API. */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The Cloudflare Turnstile "I'm human" check for sign-in and sign-up. Off (no widget, `ready`
 * always true, no token) when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, e.g. in local development.
 * Tokens are single-use: call `reset()` after every attempt the API rejected.
 */
export function useBotCheck(action: "login" | "register") {
  const enabled = !!SITE_KEY;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !el.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !el.current) return;
        widgetId.current = ts.render(el.current, {
          sitekey: SITE_KEY,
          action,
          theme: "light", // the app has no dark mode
          size: "flexible",
          appearance: "always",
          callback: (t: string) => {
            setToken(t);
            setFailed(false);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [enabled, action]);

  const reset = useCallback(() => {
    if (!enabled) return;
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [enabled]);

  const message = !enabled
    ? ""
    : failed
      ? "We couldn’t confirm you’re human. Refresh the page and try again."
      : "Just a moment — we’re confirming you’re human.";

  return {
    /** Sent to the API as `captchaToken`. */
    token,
    /** False while the check is still running (or failed): hold off on submitting. */
    ready: !enabled || !!token,
    /** Why the form can't be sent yet, for showing next to the submit button. */
    message,
    reset,
    widget: enabled ? <div ref={el} className="auth-bot-check" /> : null,
  };
}
