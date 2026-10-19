"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "./session";

/**
 * Route guards for the UI only: they send people to the right app.
 * The API enforces access on every request, whatever these do.
 */
function Gate({ allow, redirectTo, children }: { allow: "staff" | "client"; redirectTo: string; children: ReactNode }) {
  const router = useRouter();
  const { status, user, embedded } = useSession();
  const ok = status === "authenticated" && !!user && (allow === "staff" ? user.isStaff : !user.isStaff || embedded);

  useEffect(() => {
    if (status === "anonymous" && !embedded) router.replace("/login");
    else if (status === "authenticated" && user && !ok) router.replace(redirectTo);
  }, [status, user, ok, embedded, redirectTo, router]);

  if (!ok) return <SessionSplash text={status === "anonymous" ? "Redirecting to sign in…" : "Loading your account…"} />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  return (
    <Gate allow="staff" redirectTo="/portal">
      {children}
    </Gate>
  );
}

/** Clients, or staff inside the "View as client" iframe. */
export function RequireClient({ children }: { children: ReactNode }) {
  return (
    <Gate allow="client" redirectTo="/admin">
      {children}
    </Gate>
  );
}

export function SessionSplash({ text }: { text: string }) {
  return (
    <div className="session-splash" role="status" aria-live="polite">
      <span className="session-splash__spinner" aria-hidden="true" />
      <span className="text-muted">{text}</span>
    </div>
  );
}
