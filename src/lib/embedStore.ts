"use client";

import { useSyncExternalStore } from "react";
import { INITIAL_CLIENT_EMBEDS, type ClientEmbed, type EmbedComment } from "@/data/embeds";
import { TODAY_SHORT } from "@/lib/dates";
import { newId } from "@/lib/utils";

/**
 * Client embed codes shared between the portal and the admin CRM.
 * Until there is a backend this lives in localStorage, so a code pasted in
 * the portal shows up in the admin client profile (same browser, any tab,
 * including the "View as client" iframe).
 */
type EmbedsByClient = Record<number, ClientEmbed[]>;

const KEY = "gocwgl:client-embeds:v2";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: EmbedsByClient } | null = null;

function read(): EmbedsByClient {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked; fall back to the sample data.
  }
  if (cache && cache.raw === raw) return cache.value;
  let value = INITIAL_CLIENT_EMBEDS;
  try {
    if (raw) value = JSON.parse(raw) as EmbedsByClient;
  } catch {
    // Corrupt value; ignore it.
  }
  cache = { raw, value };
  return value;
}

function write(value: EmbedsByClient) {
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Storage blocked; keep the change for this page only.
  }
  cache = { raw, value };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: ClientEmbed[] = [];

/** Embed codes for one client, kept in sync across the portal and admin. */
export function useClientEmbeds(clientId: number): ClientEmbed[] {
  return useSyncExternalStore(
    subscribe,
    () => read()[clientId] ?? EMPTY,
    () => INITIAL_CLIENT_EMBEDS[clientId] ?? EMPTY,
  );
}

export function setClientEmbeds(clientId: number, update: (list: ClientEmbed[]) => ClientEmbed[]) {
  const all = read();
  write({ ...all, [clientId]: update(all[clientId] ?? []) });
}

/** Add a comment to one embed; `issue` flags it as broken (true) or fixed (false). */
export function commentOnEmbed(clientId: number, embedId: number, comment: Omit<EmbedComment, "id" | "when">, issue?: boolean) {
  setClientEmbeds(clientId, (list) =>
    list.map((e) =>
      e.id === embedId
        ? {
            ...e,
            issue: issue ?? e.issue,
            comments: [...(e.comments ?? []), { ...comment, id: newId(), when: TODAY_SHORT }],
          }
        : e,
    ),
  );
}
