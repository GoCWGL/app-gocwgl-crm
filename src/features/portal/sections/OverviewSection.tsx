"use client";

import { useState } from "react";
import { BarChart, BarRow, Button, ErrorState, Icon, IconTile, KpiCard, Loading, ProgressBar, SegmentedControl, type IconName } from "@/components/ui";
import type { RangeKey } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { Range } from "@/utils/api/portal";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { usePortalBuild } from "@/utils/hooks/useDelivery";
import { useOverview, usePortalActivity, usePortalHealth } from "@/utils/hooks/usePortal";
import { getBuildProgress, getHealth } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

/** The overview's `kpis` object (typed as a plain object in the OpenAPI spec; keys are snake_case). */
type Kpis = {
  leads: number;
  calls: number;
  clients: number;
  revenue_cents: number;
  deltas: Record<string, number | null>;
  period_days: number;
  daily_leads: Array<{ date: string; leads: number }>;
};

const deltaText = (d: number | null | undefined) => (d === null || d === undefined ? "—" : `${d >= 0 ? "+" : ""}${d}%`);
const pct = (n: number, base: number) => (base ? `${Math.round((n / base) * 1000) / 10}%` : "—");

export function OverviewSection() {
  const { goTo } = usePortal();
  const [range, setRange] = useState<RangeKey>("30");
  const overview = useOverview(Number(range) as Range);
  const health = getHealth(usePortalHealth().data);
  const buildQuery = usePortalBuild();
  const activity = usePortalActivity();

  if (overview.isPending) return <Loading text="Loading your overview…" />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={overview.refetch} />;
  const o = overview.data;
  const k = o.kpis as unknown as Kpis;
  const period = `${k.period_days ?? range} days`;
  const project = buildQuery.data;
  const build = project ? getBuildProgress(project) : null;
  const latestUpdates = (project?.updates ?? []).slice(0, 2);

  const kpis: Array<{ label: string; value: string; delta: number | null; icon: IconName; tone: Tone }> = [
    { label: "New leads", value: String(k.leads ?? 0), delta: k.deltas?.leads ?? null, icon: "userPlus", tone: "purple" },
    { label: "Calls booked", value: String(k.calls ?? 0), delta: k.deltas?.calls ?? null, icon: "calendar", tone: "orange" },
    { label: "New paying clients", value: String(k.clients ?? 0), delta: k.deltas?.clients ?? null, icon: "check", tone: "green" },
    { label: "Revenue", value: formatCents(k.revenue_cents ?? 0), delta: k.deltas?.revenue_cents ?? null, icon: "dollar", tone: "cyan" },
  ];

  const base = Math.max(1, k.leads ?? 0);
  const funnel = [
    { label: "Became leads", n: k.leads ?? 0, rate: "100%", color: "#0891B2" },
    { label: "Booked a call", n: k.calls ?? 0, rate: pct(k.calls ?? 0, k.leads ?? 0), color: "#F59E0B" },
    { label: "Became clients", n: k.clients ?? 0, rate: pct(k.clients ?? 0, k.calls ?? 0), color: "#10B981" },
  ];
  const daily = k.daily_leads ?? [];

  return (
    <div className="page-stack">
      <section className={cn("health-banner", health.ok ? "health-banner--ok tone-green" : "health-banner--warn tone-amber")}>
        <IconTile size="xl" className="health-banner__icon">
          <Icon name="pulse" size={22} />
        </IconTile>
        <div className="health-banner__text">
          <span className="health-banner__title">{health.title}</span>
          <span className="text-muted">{health.subtitle}</span>
        </div>
        <Button variant="outline" onClick={() => goTo("health")}>
          View system health
        </Button>
      </section>

      <div className="section-head">
        <h2 className="section-title">Your results</h2>
        <SegmentedControl label="Time range" options={RANGES} value={range} onChange={setRange} size="sm" />
      </div>

      <div className="stat-grid stat-grid--wide">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trendColor={(kpi.delta ?? 0) < 0 ? "#BE185D" : "#047857"}
            icon={
              <IconTile tone={kpi.tone}>
                <Icon name={kpi.icon} size={15} />
              </IconTile>
            }
            footer={
              <>
                <strong>{deltaText(kpi.delta)}</strong> vs previous {period}
              </>
            }
          />
        ))}
      </div>

      <div className="card-row card-row--stretch">
        <section className="card overview-chart">
          <div className="stack stack--2">
            <h2 className="card-title">New leads per day</h2>
            <span className="text-small">Last 14 days from your landing page and ads</span>
          </div>
          {daily.length ? (
            <BarChart
              label="New leads per day"
              data={daily.map((d, i) => ({ label: formatShort(d.date), value: d.leads, color: i === daily.length - 1 ? "#FF9900" : "#67E8F9" }))}
            />
          ) : (
            <p className="text-muted">No daily reports yet. They appear here once your team starts sending them.</p>
          )}
        </section>

        <section className="card overview-funnel">
          <div className="stack stack--2">
            <h2 className="card-title">Your funnel</h2>
            <span className="text-small">Last {period}</span>
          </div>
          {funnel.map((f) => (
            <BarRow
              key={f.label}
              label={f.label}
              percent={Math.max(3, Math.round((f.n / base) * 100))}
              color={f.color}
              value={
                <>
                  <strong>{f.n.toLocaleString("en-US")}</strong> · {f.rate}
                </>
              }
            />
          ))}
        </section>
      </div>

      <div className="card-row">
        <section className="card build-mini">
          <div className="card__header">
            <h2 className="card-title">System build</h2>
            <Button variant="outline" size="sm" onClick={() => goTo("build")}>
              Details
            </Button>
          </div>
          {build ? (
            <>
              <div className="build-mini__progress">
                <span className="build-mini__pct">{build.percent}%</span>
                <div className="stack stack--6 u-grow">
                  <ProgressBar value={build.percent} variant="glow" size="md" label="Build progress" />
                  <span className="text-small">
                    Now working on: <strong className="u-ink">{build.current}</strong>
                  </span>
                </div>
              </div>
              {o.buildDue && <span className="text-small">Target launch {formatShort(o.buildDue)}</span>}
            </>
          ) : (
            <span className="text-small">Your GoCWGL team hasn’t started your build yet.</span>
          )}
          {o.openTodos > 0 && (
            <button type="button" className="waiting-pill" onClick={() => goTo("build")}>
              <span className="waiting-pill__dot" aria-hidden="true" />
              {o.openTodos} item{o.openTodos > 1 ? "s are" : " is"} waiting on you
            </button>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Latest from your GoCWGL team</h2>
          <div>
            {latestUpdates.length === 0 && <p className="text-muted">No updates yet.</p>}
            {latestUpdates.map((u) => (
              <div className="update-row" key={u.id}>
                <span className="update-row__dot" aria-hidden="true" />
                <div className="stack stack--2">
                  <span className="update-row__date">{formatShort(u.createdAt)}</span>
                  <span className="update-row__text">{u.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Live activity</h2>
          <div>
            {activity.isPending && <Loading inline />}
            {activity.data?.length === 0 && <p className="text-muted">Nothing yet. New leads, bookings and payments show up here.</p>}
            {activity.data?.map((a) => (
              <div className={cn("feed-item", "tone-cyan")} key={a.id}>
                <span className="feed-item__dot feed-item__dot--tone" aria-hidden="true" />
                <div className="feed-item__body">
                  <span className="feed-item__text">{a.summary}</span>
                  <span className="feed-item__time">{formatRelative(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
