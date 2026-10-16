"use client";

import { Fragment } from "react";
import { Badge, Button, Icon, IconTile, ProgressBar, StatGrid, buttonClass } from "@/components/ui";
import { PAYMENT_CARD, type Funnel, type FunnelStatus } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn, formatMoney } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

const STATUS: Record<FunnelStatus, { label: string; tone: Tone }> = {
  live: { label: "LIVE", tone: "green" },
  build: { label: "IN BUILD", tone: "brand" },
  pay: { label: "AWAITING PAYMENT", tone: "red" },
  queued: { label: "QUEUED FOR BUILD", tone: "purple" },
  quote: { label: "QUOTE REQUESTED", tone: "cyan" },
};

export function FunnelsSection() {
  const { state, update, goTo, openSupport } = usePortal();
  const live = state.funnels.filter((f) => f.status === "live");

  const pay = (funnel: Funnel) =>
    update((s) => ({
      funnels: s.funnels.map((x) =>
        x.id === funnel.id
          ? { ...x, status: "queued", note: "Paid — thank you! Your team will start the build within 2 business days." }
          : x,
      ),
      invoices: s.invoices.map((iv) => (iv.no === funnel.invoice ? { ...iv, status: "Paid" } : iv)),
      toast: `Paid ${formatMoney(funnel.price ?? 0)} with ${PAYMENT_CARD}. Your new funnel is queued for build.`,
    }));

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Live funnels", value: live.length, tone: "green" },
          { label: "Visits (30 days)", value: live.reduce((n, f) => n + (f.visits ?? 0), 0), tone: "cyan" },
          { label: "Leads (30 days)", value: live.reduce((n, f) => n + f.steps[1][1], 0), tone: "purple" },
          { label: "In the works", value: state.funnels.length - live.length, tone: "brand" },
        ]}
      />

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Your funnels</h2>
          <span className="text-muted">Every funnel your GoCWGL team built for you, with last 30 days results</span>
        </div>
        <Button variant="primary" size="lg" onClick={() => update({ funnelRequestOpen: true })}>
          <Icon name="plus" strokeWidth={2.4} />
          Request a new funnel
        </Button>
      </div>

      {state.funnels.map((f) => (
        <FunnelCard
          key={f.id}
          funnel={f}
          onBuild={() => goTo("build")}
          onPay={() => pay(f)}
          onChange={() => openSupport({ type: "change", title: `Change to “${f.name}”`, details: "" })}
        />
      ))}
    </div>
  );
}

type FunnelCardProps = {
  funnel: Funnel;
  onBuild: () => void;
  onPay: () => void;
  onChange: () => void;
};

function FunnelCard({ funnel: f, onBuild, onPay, onChange }: FunnelCardProps) {
  const status = STATUS[f.status];
  const isLive = f.status === "live";
  const base = f.steps[0][1] || 1;
  const leads = f.steps[1]?.[1] ?? 0;

  const kpis = isLive
    ? [
        { label: "Visits", value: String(f.visits ?? 0) },
        { label: "Leads", value: String(leads) },
        { label: "Conversion", value: Math.round((leads / base) * 1000) / 10 + "%" },
        { label: "Revenue", value: formatMoney(f.revenue ?? 0) },
      ]
    : [];

  const stepMeta = (people: number, i: number) =>
    isLive ? `${people} people` : f.status === "build" ? (i < 2 ? "Built" : "Up next") : "Planned";

  return (
    <article className={cn("funnel-card", isLive ? "funnel-card--live" : f.status === "pay" ? "funnel-card--pay" : "funnel-card--pending")}>
      <div className="funnel-card__head">
        <IconTile tone={isLive ? "green" : "orange"} size="xl">
          <Icon name="funnel" size={20} />
        </IconTile>
        <div className="funnel-card__title">
          <span className="text-strong funnel-card__name">{f.name}</span>
          <span className="text-small">
            {f.type} · {f.goal}
          </span>
          {isLive && f.url && <span className="funnel-card__url">{f.url}</span>}
        </div>
        <Badge tone={status.tone} mono dot size="lg">
          {status.label}
        </Badge>
      </div>

      {isLive && (
        <div className="funnel-card__kpis">
          {kpis.map((k) => (
            <div className="inset funnel-card__kpi" key={k.label}>
              <span className="text-tiny u-strong">{k.label}</span>
              <span className="funnel-card__kpi-value">{k.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="funnel-steps">
        {f.steps.map(([name, people], i) => {
          const next = f.steps[i + 1];
          const rate = next && isLive && people ? Math.round((next[1] / people) * 100) + "%" : "";
          return (
            <Fragment key={name}>
              <div className={cn("funnel-steps__step", isLive && "funnel-steps__step--live")}>
                <span className="kicker kicker--sm kicker--muted">STEP {i + 1}</span>
                <span className="text-strong funnel-steps__name">{name}</span>
                <span className="text-small">{stepMeta(people, i)}</span>
              </div>
              {next && (
                <span className="funnel-steps__arrow" aria-hidden="true">
                  <span>{rate}</span>
                  <span className="funnel-steps__arrow-glyph">→</span>
                </span>
              )}
            </Fragment>
          );
        })}
      </div>

      {f.status === "build" && (
        <div className="stack stack--6">
          <ProgressBar value={f.pct ?? 0} variant="glow" label={`${f.name} build progress`} />
          <span className="text-small">{f.pct ?? 0}% built · part of your Revenue Engine System build</span>
        </div>
      )}

      {!!f.links?.length && (
        <div className="cluster cluster--6">
          <span className="kicker kicker--sm kicker--muted">LINKS</span>
          {f.links.map((l) => (
            <Badge key={l.label} tone="cyan">
              {l.label}
            </Badge>
          ))}
        </div>
      )}

      {f.note && <div className={cn("message", f.status === "pay" && "message--pay")}>{f.note}</div>}

      <div className="cluster cluster--8">
        {isLive && f.url && (
          <a className={buttonClass({ variant: "outline", size: "sm" })} href={`https://${f.url}`} target="_blank" rel="noopener">
            Open live page ↗
          </a>
        )}
        {f.status === "build" && (
          <Button variant="outline" size="sm" onClick={onBuild}>
            See build progress
          </Button>
        )}
        {f.status === "pay" && (
          <Button variant="primary" size="sm" onClick={onPay}>
            Pay {formatMoney(f.price ?? 0)} to start
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onChange}>
          Request a change
        </Button>
      </div>
    </article>
  );
}
