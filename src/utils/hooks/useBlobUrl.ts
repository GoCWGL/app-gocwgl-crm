"use client";

import { useEffect, useState } from "react";
import { blobUrl } from "@/utils/api/client";

/** A signed-in file as an <img>-ready URL (null while loading, on error, or with no path). */
export function useBlobUrl(path: string | null): string | null {
  const [state, setState] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    let url = "";
    let cancelled = false;
    blobUrl(path)
      .then((u) => {
        url = u;
        if (cancelled) URL.revokeObjectURL(u);
        else setState({ path, url: u });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  return path && state?.path === path ? state.url : null;
}
