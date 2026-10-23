"use client";

import { Fragment, useState } from "react";
import { Badge, Button, FormError, Icon, IconTile, LoadState, ProgressBar, StatGrid, buttonClass } from "@/components/ui";
import type { FunnelStatus } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { FunnelOut } from "@/utils/api/models";
import { formatCents } from "@/utils/format/money";
import { useEmbeds, usePortalBuilds } from "@/utils/hooks/useDelivery";
import { useCancelFunnelRequest, usePortalFunnels } from "@/utils/hooks/usePortal";
import { BuildCards } from "../components/BuildCards";
import { missingRequestDetails } from "../components/FunnelRequestDrawer";
import { usePortal } from "../state/PortalContext";

type Step = [string, number];
const stepsOf = (f: FunnelOut) => (f.steps ?? []) as Step[];

const STATUS: Record<FunnelStatus, { label: string; tone: Tone }> = {
  live: { label: "LIVE", tone: "green" },
  build: { label: "IN BUILD", tone: "brand" },
  pay: { label: "AWAITING PAYMENT", tone: "red" },
  queued: { label: "QUEUED FOR BUILD", tone: "purple" },
  quote: { label: "QUOTE REQUESTED", tone: "cyan" },
};

export function FunnelsSection() {
  const { update, goTo, openSupport, readOnly } = usePortal();
  const query = usePortalFunnels();
  const funnels = query.data ?? [];
  const live = funnels.filter((f) => f.status === "live");
  // Funnel builds from Build progress (a client can have several). Requests still waiting on a quote or payment aren't builds yet.
  const buildsQuery = usePortalBuilds();
  const builds = (buildsQuery.data ?? []).filter((b) => b.kind === "funnel");
  const building = builds.filter((b) => b.status !== "Launched");
  const requests = funnels.filter((f) => f.status === "quote" || f.status === "pay");
  // A request whose build has started shows as that build above, not twice.
  const listed = funnels.filter((f) => !(f.projectId && f.status === "build"));
  const embeds = useEmbeds().data ?? [];
  // Cancelling asks for a second click, like removing an embed code.
  const cancel = useCancelFunnelRequest();
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const cancelRequest = (id: string) => {
    if (confirmCancelId !== id) return setConfirmCancelId(id);
    cancel.mutate(id, { onSettled: () => setConfirmCancelId("") });
  };

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Live funnels", value: live.length, tone: "green" },
          {
            label: "Visits (30 days)",
            value: live.reduce((n, f) => n + (f.visits ?? 0), 0),
            tone: "cyan",
          },
          {
            label: "Leads (30 days)",
            value: live.reduce((n, f) => n + (stepsOf(f)[1]?.[1] ?? 0), 0),
            tone: "purple",
          },
          {
            label: "In the works",
            value: building.length + requests.length,
            tone: "brand",
          },
        ]}
      />

      {builds.length > 0 && (
        <>
          <div className="section-head">
            <div className="stack stack--2">
              <h2 className="section-title">Funnels we’re building</h2>
              <span className="text-muted">Every funnel your GoCWGL team is working on for you, with its progress</span>
            </div>
          </div>
          <BuildCards builds={builds} icon="funnel" />
        </>
      )}

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Your funnels</h2>
          <span className="text-muted">Your live funnels with last 30 days results, and the funnels you’ve requested</span>
        </div>
        {!readOnly && (
          <Button variant="primary" size="lg" onClick={() => update({ funnelRequestOpen: true, editFunnelId: "" })}>
            <Icon name="plus" strokeWidth={2.4} />
            Request a new funnel
          </Button>
        )}
      </div>
      <FormError error={cancel.error} />

      <LoadState
        query={query}
        isEmpty={!listed.length}
        empty={builds.length ? "No live funnels or open requests yet." : "No funnels yet. Request your first one and your GoCWGL team will build it."}
      >
        {listed.map((f) => (
          <FunnelCard
            key={f.id}
            funnel={f}
            readOnly={readOnly}
            cancelling={cancel.isPending && cancel.variables === f.id}
            confirmingCancel={confirmCancelId === f.id}
            embedCount={embeds.filter((e) => e.funnelId === f.id).length}
            embedIssues={embeds.filter((e) => e.funnelId === f.id && e.hasIssue).length}
            onBuild={() => goTo("build")}
            onEdit={() => update({ funnelRequestOpen: true, editFunnelId: f.id })}
            onCancel={() => cancelRequest(f.id)}
            onEmbed={() => update({ embedFunnelId: f.id })}
            onChange={() =>
              openSupport({
                type: "change",
                title: `Change to “${f.name}”`,
                details: "",
              })
            }
          />
        ))}
      </LoadState>
    </div>
  );
}

type FunnelCardProps = {
  funnel: FunnelOut;
  readOnly: boolean;
  cancelling: boolean;
  confirmingCancel: boolean;
  embedCount: number;
  embedIssues: number;
  onBuild: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onEmbed: () => void;
  onChange: () => void;
};

function FunnelCard({
  funnel: f,
  readOnly,
  cancelling,
  confirmingCancel,
  embedCount,
  embedIssues,
  onBuild,
  onEdit,
  onCancel,
  onEmbed,
  onChange,
}: FunnelCardProps) {
  const status = STATUS[f.status as FunnelStatus] ?? STATUS.build;
  const isLive = f.status === "live";
  // Requests can be withdrawn until they're paid for.
  const cancellable = !readOnly && (f.status === "quote" || f.status === "pay");
  const missing = readOnly ? [] : missingRequestDetails(f);
  const steps = stepsOf(f);
  const base = steps[0]?.[1] || 1;
  const leads = steps[1]?.[1] ?? 0;
  const links = (f.links ?? []) as Array<{ label: string; url: string }>;

  const kpis = isLive
    ? [
        { label: "Visits", value: String(f.visits ?? 0) },
        { label: "Leads", value: String(leads) },
        {
          label: "Conversion",
          value: Math.round((leads / base) * 1000) / 10 + "%",
        },
        { label: "Revenue", value: formatCents(f.revenueCents ?? 0) },
      ]
    : [];

  const stepMeta = (people: number, i: number) => (isLive ? `${people} people` : f.status === "build" ? (i < 2 ? "Built" : "Up next") : "Planned");

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
        {steps.map(([name, people], i) => {
          const next = steps[i + 1];
          const rate = next && isLive && people ? Math.round((next[1] / people) * 100) + "%" : "";
          return (
            <Fragment key={`${i}-${name}`}>
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
          <ProgressBar value={f.progressPct ?? 0} variant="glow" label={`${f.name} build progress`} />
          <span className="text-small">{f.progressPct ?? 0}% built</span>
        </div>
      )}

      {links.length > 0 && (
        <div className="cluster cluster--6">
          <span className="kicker kicker--sm kicker--muted">LINKS</span>
          {links.map((l) => (
            <Badge key={l.label} tone="cyan">
              {l.label}
            </Badge>
          ))}
        </div>
      )}

      {f.note && <div className={cn("message", f.status === "pay" && "message--pay")}>{f.note}</div>}

      {embedIssues > 0 && (
        <div className="inset funnel-card__missing funnel-card__missing--issue">
          <span className="text-small">
            <strong>
              {embedIssues} embed code{embedIssues === 1 ? "" : "s"} need
              {embedIssues === 1 ? "s" : ""} a fix.
            </strong>{" "}
            Your team left a comment on what to change.
          </span>
          <Button variant="link" size="sm" onClick={onEmbed}>
            See comments
          </Button>
        </div>
      )}

      {missing.length > 0 && (
        <div className="inset funnel-card__missing">
          <span className="text-small">
            <strong>Still missing:</strong> {missing.join(" and ")}. Add them whenever you have them so your team can finish the copy.
          </span>
          <Button variant="link" size="sm" onClick={onEdit}>
            Add details
          </Button>
        </div>
      )}

      <div className="cluster cluster--8">
        {isLive && f.url && (
          <a
            className={buttonClass({ variant: "outline", size: "sm" })}
            href={/^https?:\/\//.test(f.url) ? f.url : `https://${f.url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open live page ↗
          </a>
        )}
        {f.status === "build" && (
          <Button variant="outline" size="sm" onClick={onBuild}>
            See build progress
          </Button>
        )}
        {/* Paid through the package's Wise link; your team marks the invoice paid and the funnel moves to the build queue. */}
        {f.status === "pay" &&
          !readOnly &&
          (f.payUrl ? (
            <a className={buttonClass({ variant: "primary", size: "sm" })} href={f.payUrl} target="_blank" rel="noopener noreferrer">
              Pay {formatCents(f.priceCents)} with Wise ↗
            </a>
          ) : (
            <span className="text-small">Your GoCWGL team will send you a payment link for this quote.</span>
          ))}
        <Button variant="outline" size="sm" onClick={onEmbed}>
          <Icon name="code" size={14} />
          Embed codes
          {embedCount > 0 && <span className="u-mono"> · {embedCount}</span>}
        </Button>
        {!isLive && !readOnly && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon name="edit" size={14} />
            Edit request
          </Button>
        )}
        {cancellable && (
          <Button variant={confirmingCancel ? "danger" : "link"} size="sm" onClick={onCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : confirmingCancel ? "Click again to cancel request" : "Cancel request"}
          </Button>
        )}
        {!readOnly && (
          <Button variant="secondary" size="sm" onClick={onChange}>
            Request a change
          </Button>
        )}
      </div>
    </article>
  );
}
