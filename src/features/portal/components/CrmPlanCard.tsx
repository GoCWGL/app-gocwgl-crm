"use client";

import { Badge, Button, Icon, ProgressBar } from "@/components/ui";
import { CRM_CARE_PLAN, CRM_PACKAGES, crmPlanOf, type CrmPackageKey } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import type { ClientCrmRequestOut, ProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { usePortalBuilds, usePortalCrmRequests } from "@/utils/hooks/useDelivery";
import { useShowPackages } from "../lib/vaAccess";
import { usePortal } from "../state/PortalContext";

type Stage = { label: string; tone: Tone; icon: "sparkle" | "calendar" | "rocket" | "circleCheck" | "invoice" };

/** Where the client's CRM stands, from their request and the build started from it. */
function stageOf(request: ClientCrmRequestOut | undefined, build: ProjectOut | undefined): Stage {
  if (build?.completed) return { label: "Complete", tone: "green", icon: "circleCheck" };
  if (build?.status === "Launched") return { label: "Live", tone: "green", icon: "rocket" };
  if (build) return { label: "Being built", tone: "purple", icon: "rocket" };
  if (request?.invoice && request.invoice.status !== "Paid") return { label: "Awaiting payment", tone: "amber", icon: "invoice" };
  if (request?.status === "contacted") return { label: "Discovery call booked", tone: "cyan", icon: "calendar" };
  return { label: "Requested", tone: "amber", icon: "sparkle" };
}

/**
 * The client's current CRM plan on My Profile: the package (Growth or Premium), how they pay and how many payments
 * are made, where the build stands, and the Care plan. The latest CRM they asked for shows; any others are counted.
 * Without one yet, it points them to the packages.
 */
export function CrmPlanCard() {
  const { update } = usePortal();
  const showPackages = useShowPackages("crm");
  const requests = (usePortalCrmRequests().data ?? [])
    .filter((r) => r.status !== "declined")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const builds = (usePortalBuilds().data ?? []).filter((b) => b.kind === "crm");

  const request = requests[0];
  const build = request?.projectId ? builds.find((b) => b.id === request.projectId) : builds[0];
  const more = Math.max(requests.length, builds.length) - 1;
  const open = (crmView: "builds" | "packages") => update({ tab: "crm", crmView });

  if (!request && !build) {
    if (!showPackages) return null;
    return (
      <section className="card crm-plan-card crm-plan-card--empty">
        <span className="kicker">CRM PLAN</span>
        <div className="crm-plan-card__empty">
          <span className="crm-plan-card__empty-icon">
            <Icon name="sparkle" size={18} />
          </span>
          <div className="stack stack--2 u-grow">
            <span className="text-strong">No CRM plan yet</span>
            <span className="text-small">Pick Growth or Premium, and pay once or over 6 or 12 months.</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => open("packages")}>
            See CRM packages
            <Icon name="arrowRight" strokeWidth={2.4} />
          </Button>
        </div>
      </section>
    );
  }

  const key = (request?.package ?? "") as CrmPackageKey;
  const pkg = CRM_PACKAGES[key];
  const tier = key === "growth" || key === "custom" ? key : "custom";
  const plan = request ? crmPlanOf(request.paymentPlan, request.package) : null;
  const monthly = !!plan && plan.payments > 1;
  const stage = stageOf(request, build);
  const live = !!build && (build.completed || build.status === "Launched");

  return (
    <section className={`card crm-plan-card crm-tier--${tier}`}>
      <div className="crm-plan-card__hero">
        <div className="stack stack--4 u-grow">
          <span className="crm-plan-card__kicker">Your CRM plan</span>
          <h2 className="crm-plan-card__name">{pkg?.label ?? build?.package ?? "Custom CRM"}</h2>
          <span className="crm-plan-card__sub">
            {request?.name || build?.package}
            {pkg && ` · ${pkg.kind}`}
          </span>
        </div>
        <Badge tone={stage.tone} dot>
          {stage.label}
        </Badge>
      </div>

      <dl className="crm-plan-card__facts">
        <div className="crm-plan-card__fact">
          <dt>Payment</dt>
          <dd>
            {plan ? (monthly ? `${formatCents(plan.paymentCents)}/month` : formatCents(plan.paymentCents)) : "Set on your invoice"}
            <small>{plan ? (monthly ? `${plan.label} · ${formatCents(plan.paymentCents * plan.payments)} in total` : "One-time payment") : ""}</small>
          </dd>
        </div>
        <div className="crm-plan-card__fact">
          <dt>Payments made</dt>
          <dd>
            {request ? `${request.paymentsPaid} of ${request.paymentsTotal}` : "—"}
            <small>
              {request?.invoice
                ? request.invoice.paidAt
                  ? `Last paid ${formatShort(request.invoice.paidAt)}`
                  : request.invoice.dueDate
                    ? `Next due ${formatShort(request.invoice.dueDate)}`
                    : `Invoice ${request.invoice.number}`
                : "Invoiced after your discovery call"}
            </small>
          </dd>
        </div>
        <div className="crm-plan-card__fact">
          <dt>Build</dt>
          <dd>
            {build ? (live ? "Launched" : `${build.progress}% done`) : "Not started"}
            <small>{build?.dueDate && !live ? `Due ${formatShort(build.dueDate)}` : pkg ? pkg.timeline : ""}</small>
          </dd>
        </div>
        <div className="crm-plan-card__fact">
          <dt>Care plan</dt>
          <dd>
            {live ? "Active" : "Starts at launch"}
            <small>First year free, then {formatCents(CRM_CARE_PLAN.priceCents)}/year</small>
          </dd>
        </div>
      </dl>

      {build && !live && <ProgressBar value={build.progress} variant="glow" label={`${build.package} build progress`} />}

      <div className="crm-plan-card__foot">
        <span className="text-small">
          Requested {request ? formatShort(request.createdAt) : build?.startDate ? formatShort(build.startDate) : ""}
          {more > 0 && ` · ${more} more CRM${more > 1 ? "s" : ""} in Your CRM builds`}
        </span>
        <div className="cluster cluster--8">
          {showPackages && (
            <Button size="sm" variant="secondary" onClick={() => open("packages")}>
              Compare packages
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => open("builds")}>
            Open my CRM
            <Icon name="arrowRight" strokeWidth={2.4} />
          </Button>
        </div>
      </div>
    </section>
  );
}
