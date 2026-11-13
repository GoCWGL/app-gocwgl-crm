"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { isVa, useSession } from "./session";

/**
 * Route guards for the UI only: they send people to the right app.
 * The API enforces access on every request, whatever these do.
 */
type Audience = "staff" | "client" | "va";

/** Where each kind of account lives. */
function homeOf(user: { isStaff?: boolean; role: string }): string {
  if (user.isStaff) return "/admin";
  return isVa(user) ? "/va" : "/portal";
}

function allowed(allow: Audience, user: { isStaff?: boolean; role: string }, embedded: boolean): boolean {
  if (allow === "staff") return !!user.isStaff;
  // Staff may open the VA portal too, to see what VAs see.
  if (allow === "va") return isVa(user) || !!user.isStaff;
  // Staff open the client portal too: they pick a client there ("View as client").
  return !isVa(user) || embedded;
}

function Gate({ allow, children }: { allow: Audience; children: ReactNode }) {
  const router = useRouter();
  const { status, user, embedded } = useSession();
  const ok = status === "authenticated" && !!user && allowed(allow, user, embedded);
  const redirectTo = user ? homeOf(user) : "/login";

  useEffect(() => {
    if (status === "anonymous" && !embedded) router.replace("/login");
    else if (status === "authenticated" && user && !ok) router.replace(redirectTo);
  }, [status, user, ok, embedded, redirectTo, router]);

  if (!ok) return <SessionSplash text={status === "anonymous" ? "Redirecting to sign in…" : "Loading your account…"} />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  return (
    <Gate allow="staff">
      {children}
    </Gate>
  );
}

/** Clients, and staff viewing a client's portal (in the "View as client" iframe or at /portal?as=<id>). */
export function RequireClient({ children }: { children: ReactNode }) {
  return (
    <Gate allow="client">
      {children}
    </Gate>
  );
}

/** Virtual assistants (and staff, to preview it). */
export function RequireVa({ children }: { children: ReactNode }) {
  return <Gate allow="va">{children}</Gate>;
}

const SPLASH_STEPS = ["Restoring your session", "Checking your access"] as const;

export function SessionSplash({ text }: { text: string }) {
  return (
    <div className="session-splash" role="status" aria-live="polite">
      <BrandLoader title={text} steps={SPLASH_STEPS} />
    </div>
  );
}
