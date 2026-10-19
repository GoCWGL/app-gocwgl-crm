"use client";

import { Badge, Button, FormError, LoadState, StatGrid } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { usePortalHealth, useReportHealthCheck } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

const STATE: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Running", tone: "green" },
  warning: { label: "Needs attention", tone: "amber" },
  down: { label: "Down", tone: "red" },
};

/** Every check your GoCWGL team runs on your system, and recent incidents (all from the API). */
export function HealthSection() {
  const { notify, readOnly } = usePortal();
  const health = usePortalHealth();
  const report = useReportHealthCheck();
  const checks = health.data?.checks ?? [];
  const incidents = health.data?.incidents ?? [];
  const failing = checks.filter((c) => c.state !== "ok");
  const lastChecked = checks.map((c) => c.checkedAt).filter(Boolean).sort().at(-1);

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Overall", value: STATE[health.data?.overall ?? "ok"]?.label ?? "—", tone: failing.length ? "amber" : "green" },
          { label: "Checks running", value: checks.length, tone: "cyan" },
          { label: "Need attention", value: failing.length, tone: failing.length ? "amber" : "green" },
          { label: "Last checked", value: lastChecked ? formatRelative(lastChecked) : "—", tone: "purple" },
        ]}
      />
      <FormError error={report.error} />

      <LoadState query={health} isEmpty={!checks.length} empty="Your GoCWGL team hasn’t set up health checks for your system yet.">
        <section className="card health-group">
          <h2 className="kicker health-group__title">YOUR SYSTEM</h2>
          {checks.map((c) => {
            const st = STATE[c.state] ?? STATE.warning;
            return (
              <div className="list-row" key={c.id}>
                <span className={cn("health-dot", `tone-${st.tone}`)} aria-hidden="true" />
                <div className="stack stack--2 health-group__name">
                  <span className="text-strong">{c.name}</span>
                  <span className="text-small">{c.detail}</span>
                </div>
                <span className="health-group__metric">{c.checkedAt ? `Checked ${formatRelative(c.checkedAt)}` : ""}</span>
                <Badge tone={st.tone}>{st.label}</Badge>
                {c.state !== "ok" && c.clientAction && !readOnly && (
                  // Both actions send the problem to the team as a bug ticket.
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={report.isPending}
                    onClick={() => report.mutate(c.id, { onSuccess: () => notify("Thanks! We sent this to your GoCWGL team and they are fixing it.") })}
                  >
                    {c.clientAction === "reconnect" ? "Ask team to reconnect" : "Ask team to fix"}
                  </Button>
                )}
              </div>
            );
          })}
        </section>
      </LoadState>

      <section className="card">
        <h2 className="kicker">INCIDENT LOG</h2>
        <div>
          {incidents.length === 0 && <p className="text-muted">No incidents. Everything has been running smoothly.</p>}
          {incidents.map((i) => (
            <div className="list-row list-row--nowrap" key={i.id}>
              <span className="incident__date">{formatShort(i.occurredOn)}</span>
              <div className="stack stack--2">
                <span className="u-strong">{i.title}</span>
                <span className="text-small">{i.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
