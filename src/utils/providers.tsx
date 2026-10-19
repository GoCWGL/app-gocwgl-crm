"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { setParentTokenRequester } from "@/utils/api/client";
import type { User } from "@/utils/api/models";
import { clearSession, restoreSession, setSession, setViewAs } from "@/utils/auth/session";
import { isApiError } from "@/utils/errors";

/** postMessage types between the admin window and the "View as client" iframe (same origin only). */
export const VIEW_AS_TOKEN = "gocwgl:view-as-token";
export const VIEW_AS_TOKEN_REQUEST = "gocwgl:view-as-token-request";

export type ViewAsTokenMessage = { type: typeof VIEW_AS_TOKEN; accessToken: string | null; user: User | null };

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx answers are final (the client already refreshed once on 401); retry only network / 5xx blips.
        retry: (count, error) => count < 2 && !(isApiError(error) && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}

/** One QueryClient for the app, plus the session restore on load. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <SessionBoot />
      {children}
    </QueryClientProvider>
  );
}

function SessionBoot() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewAs = params.get("as");
    const inFrame = window.parent !== window;

    if (!(inFrame && viewAs && window.location.pathname.startsWith("/portal"))) {
      void restoreSession();
      return;
    }

    // "View as client": the admin window owns the session. Never call /auth/refresh from here:
    // two windows refreshing at once would trip the stolen-token protection and sign the admin out.
    setViewAs(viewAs, true);
    let waiting: Array<(ok: boolean) => void> = [];

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const msg = e.data as ViewAsTokenMessage | undefined;
      if (msg?.type !== VIEW_AS_TOKEN) return;
      if (msg.accessToken) setSession({ accessToken: msg.accessToken, user: msg.user });
      else clearSession();
      waiting.forEach((resolve) => resolve(!!msg.accessToken));
      waiting = [];
    };
    window.addEventListener("message", onMessage);

    /** `expired`: our copy got a 401, so the parent should refresh before answering. */
    const request = (expired: boolean) =>
      new Promise<boolean>((resolve) => {
        waiting.push(resolve);
        window.parent.postMessage({ type: VIEW_AS_TOKEN_REQUEST, expired }, window.location.origin);
        setTimeout(() => resolve(false), 5000);
      });
    setParentTokenRequester(() => request(true));
    void request(false);

    return () => {
      window.removeEventListener("message", onMessage);
      setParentTokenRequester(null);
    };
  }, []);
  return null;
}
