"use client";

import { useQuery } from "@tanstack/react-query";
import { LEGAL_CONTACT } from "@/data/legal";
import { cn } from "@/lib/utils";
import { LegalLayout } from "./components/LegalLayout";

const CHECK_EVERY_MS = 30_000;

type Health = { ok: boolean; ms: number; checkedAt: Date };

/** Pings the public health endpoint, which also runs a query against the database. */
async function checkHealth(): Promise<Health> {
  const started = performance.now();
  let ok = false;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    ok = res.ok;
  } catch {
    ok = false;
  }
  return { ok, ms: Math.round(performance.now() - started), checkedAt: new Date() };
}

type RowState = "up" | "down" | "checking";

const STATE_LABEL: Record<RowState, string> = {
  up: "Operational",
  down: "Unreachable",
  checking: "Checking…",
};

function StatusRow({ name, detail, state }: { name: string; detail: string; state: RowState }) {
  return (
    <div className="status-row">
      <span className={cn("status-row__dot", `status-row__dot--${state}`)} aria-hidden="true" />
      <div className="status-row__text">
        <span className="status-row__name">{name}</span>
        <span className="status-row__detail">{detail}</span>
      </div>
      <span className={cn("status-row__state", `status-row__state--${state}`)}>{STATE_LABEL[state]}</span>
    </div>
  );
}

/** /status. Live check of the platform, refreshed every 30 seconds. */
export function StatusPage() {
  const health = useQuery({
    queryKey: ["public", "health"],
    queryFn: checkHealth,
    refetchInterval: CHECK_EVERY_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const api: RowState = health.data ? (health.data.ok ? "up" : "down") : "checking";
  const overall =
    api === "checking"
      ? { tone: "checking", title: "Checking systems…", body: "Running a live check now." }
      : api === "up"
        ? { tone: "up", title: "All systems operational", body: "Everything is running normally." }
        : {
            tone: "down",
            title: "We're having trouble right now",
            body: "Some features may not load. We're on it. Please try again in a few minutes.",
          };

  return (
    <LegalLayout kicker="// SYSTEM STATUS" title="Is GoCWGL up?" meta="Live check, refreshed every 30 seconds.">
      <div className={cn("status-banner", `status-banner--${overall.tone}`)} role="status" aria-live="polite">
        <span className={cn("status-banner__dot", overall.tone === "up" && "u-pulse")} aria-hidden="true" />
        <div>
          <p className="status-banner__title">{overall.title}</p>
          <p className="status-banner__body">{overall.body}</p>
        </div>
      </div>

      <div className="status-card">
        <StatusRow name="Client portal & admin dashboard" detail="The web app you're using now" state="up" />
        <StatusRow name="Sign-in & accounts" detail="Signing in, sessions and account emails" state={api} />
        <StatusRow
          name="API & database"
          detail={health.data?.ok ? `Responded in ${health.data.ms} ms` : "Leads, reports, billing and project data"}
          state={api}
        />
      </div>

      <div className="status-foot">
        <span>
          {health.data
            ? `Last checked ${health.data.checkedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
            : "Checking…"}
        </span>
        <button type="button" className="btn btn--link" onClick={() => health.refetch()} disabled={health.isFetching}>
          {health.isFetching ? "Checking…" : "Check again"}
        </button>
      </div>

      <p>
        Seeing a problem that isn&apos;t shown here? Email <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
