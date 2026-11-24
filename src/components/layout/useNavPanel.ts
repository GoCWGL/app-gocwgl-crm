"use client";

import { useEffect, useState } from "react";

/** nav-panel-close in styles/layouts/_sidebar.scss (0.5s), plus a frame so it is never cut short. */
const CLOSE_MS = 520;

/**
 * Keeps a second sidebar on screen while its closing animation plays. Pass the key of the open panel ("" = none);
 * render the panel for `shown`, with `nav-panel--closing` and `inert` while `closing`.
 * Switching to another panel closes the one showing first, then opens the new one.
 */
export function useNavPanel(openKey: string) {
  const [shown, setShown] = useState(openKey);
  if (!shown && openKey) setShown(openKey);
  const closing = !!shown && shown !== openKey;

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setShown(""), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  return { shown: shown || openKey, closing };
}
