"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import { useLogoutAll, useSignOut } from "@/utils/hooks/useAuth";

/**
 * Signing out always asks first (admin, client and VA portals alike).
 * `ask()` opens the "Sign out?" pop-up; render `dialog` anywhere in the component.
 * With `everywhere`, every other device is signed out too.
 */
export function useSignOutConfirm({ everywhere = false }: { everywhere?: boolean } = {}) {
  const router = useRouter();
  const signOut = useSignOut();
  const logoutAll = useLogoutAll();
  const [open, setOpen] = useState(false);
  const pending = signOut.isPending || logoutAll.isPending;

  const confirm = () => {
    const leave = () => signOut.mutate(undefined, { onSettled: () => router.replace("/login") });
    if (everywhere) logoutAll.mutate(undefined, { onSuccess: leave });
    else leave();
  };

  const dialog = open ? (
    <ConfirmDialog
      title={everywhere ? "Sign out of every device?" : "Sign out?"}
      icon="arrowLeft"
      confirmLabel={everywhere ? "Sign out everywhere" : "Sign out"}
      pending={pending}
      error={logoutAll.error ?? signOut.error}
      onConfirm={confirm}
      onClose={() => !pending && setOpen(false)}
    >
      {everywhere
        ? "You'll be signed out here and on every other phone, tablet and computer. You'll need your password to sign back in."
        : "You'll need to sign in again to get back to your account."}
    </ConfirmDialog>
  ) : null;

  return { ask: () => setOpen(true), pending, dialog };
}
