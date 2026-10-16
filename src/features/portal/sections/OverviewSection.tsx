"use client";

import { useState, type CSSProperties } from "react";
import { BarChart, BarRow, Button, Icon, IconTile, KpiCard, ProgressBar, SegmentedControl, type IconName } from "@/components/ui";
import { BUILD_DUE, DAILY_LEADS, KPI_BY_RANGE, LIVE_ACTIVITY, type RangeKey } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn, formatMoney } from "@/lib/utils";
import { getBuildProgress, getHealth } from "../lib/selectors";
import { usePortal } from "../state/PortalContext";

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function OverviewSection() {
  const { state, goTo } = usePortal();
  const [range, setRange] = useState<RangeKey>("30");

  const r = KPI_BY_RANGE[range];
  const health = getHealth(state);
  const build = getBuildProgress();
  const openTodos = state.todos.filter((t) => !t.done).length;
  const latestUpdates = state.updates.filter((u) => u.who !== "You").slice(0, 2);

  const kpis: Array<{ label: string; value: string; delta: string; icon: IconName; tone: Tone }> = [
    { label: "New leads", value: String(r.leads), delta: r.deltas[0], icon: "userPlus", tone: "purple" },
    { label: "Calls booked", value: String(r.calls), delta: r.deltas[1], icon: "calendar", tone: "orange" },
    { label: "New paying clients", value: String(r.clients), delta: r.deltas[2], icon: "check", tone: "green" },
    { label: "Revenue", value: formatMoney(r.revenue), delta: r.deltas[3], icon: "dollar", tone: "cyan" },
  ];

  // Funnel: visitors are estimated from leads at a 7.1% conversion rate.
  const visitors = Math.round(r.leads / 0.071);
  const funnelRow = (label: string, n: number, base: number, color: string) => ({
    label,
    n,
    rate: base ? Math.round((n / base) * 1000) / 10 + "%" : "100%",
    width: Math.max(3, Math.round((n / visitors) * 100)),
    color,
  });
  const funnel = [
    funnelRow("Website visitors", visitors, 0, "#A5F3FC"),
    funnelRow("Became leads", r.leads, visitors, "#0891B2"),
    funnelRow("Booked a call", r.calls, r.leads, "#F59E0B"),
    funnelRow("Became clients", r.clients, r.calls, "#10B981"),
  ];

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
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            trendColor={k.delta.startsWith("-") ? "#BE185D" : "#047857"}
            icon={
              <IconTile tone={k.tone}>
                <Icon name={k.icon} size={15} />
              </IconTile>
            }
            footer={
              <>
                <strong>{k.delta}</strong> vs previous {r.period}
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
          <BarChart
            label="New leads per day"
            data={DAILY_LEADS.map((n, i) => ({
              label: `Oct ${i + 1}`,
              value: n,
              color: i === DAILY_LEADS.length - 1 ? "#FF9900" : "#67E8F9",
            }))}
          />
        </section>

        <section className="card overview-funnel">
          <div className="stack stack--2">
            <h2 className="card-title">Your funnel</h2>
            <span className="text-small">Last {r.period}</span>
          </div>
          {funnel.map((f) => (
            <BarRow
              key={f.label}
              label={f.label}
              percent={f.width}
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
          <div className="build-mini__progress">
            <span className="build-mini__pct">{build.percent}%</span>
            <div className="stack stack--6 u-grow">
              <ProgressBar value={build.percent} variant="glow" size="md" label="Build progress" />
              <span className="text-small">
                Now working on: <strong className="u-ink">{build.current}</strong>
              </span>
            </div>
          </div>
          <span className="text-small">Target launch {BUILD_DUE}</span>
          {openTodos > 0 && (
            <button type="button" className="waiting-pill" onClick={() => goTo("build")}>
              <span className="waiting-pill__dot" aria-hidden="true" />
              {openTodos} item{openTodos > 1 ? "s are" : " is"} waiting on you
            </button>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Latest from your GoCWGL team</h2>
          <div>
            {latestUpdates.map((u) => (
              <div className="update-row" key={u.date + u.text}>
                <span className="update-row__dot" aria-hidden="true" />
                <div className="stack stack--2">
                  <span className="update-row__date">{u.date}</span>
                  <span className="update-row__text">{u.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Live activity</h2>
          <div>
            {LIVE_ACTIVITY.map((a) => (
              <div className="feed-item" key={a.who + a.what} style={{ "--dot": a.color } as CSSProperties}>
                <span className="feed-item__dot" aria-hidden="true" />
                <div className="feed-item__body">
                  <span className="feed-item__text">
                    <strong>{a.who}</strong> {a.what}
                  </span>
                  <span className="feed-item__time">{a.when}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
