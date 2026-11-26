"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ui";

/**
 * Asks before a task or project pop-up closes (the X, Escape, a click outside or Close), so it isn't closed by
 * accident. Returns what to pass as the pop-up's onClose, and the question to render beside it.
 */
export function useConfirmClose(onClose: () => void, what: "task" | "project" | "request") {
  const [asking, setAsking] = useState(false);
  const ask = useCallback(() => setAsking(true), []);
  const dialog = asking ? (
    <ConfirmDialog
      title={`Close this ${what}?`}
      confirmLabel="Yes, close it"
      icon="close"
      onClose={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        onClose();
      }}
    >
      Everything saved stays as it is, and you can open it again from the board. A comment you started but didn’t save is lost.
    </ConfirmDialog>
  ) : null;
  return [ask, dialog] as const;
}
