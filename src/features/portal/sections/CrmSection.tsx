"use client";

import { useState } from "react";
import { siHubspot, siZoho } from "simple-icons";
import { GHL_MARK } from "../lib/crmLogos";
import { Badge, Button, Icon, LoadState, SegmentedControl, TabBar, type TabOption } from "@/components/ui";
import {
  CRM_CARE_PLAN,
  CRM_FAQ,
  CRM_FEATURE_FROM_CENTS,
  CRM_PACKAGES,
  CRM_PRICE_BREAKDOWN,
  CRM_COMPARISON,
  CRM_EXPLAINER,
  CRM_RENTED_OPTIONS,
  CRM_STEPS,
  CRM_WHY_OWN,
  OFFERED_CRM_PACKAGES,
  crmPlanOf,
  crmPlansFor,
  type CrmPackageKey,
  type CrmPaymentPlanKey,
} from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import type { Tone } from "@/lib/tones";
import type { ClientCrmRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { usePortalBuilds, usePortalCrmRequests } from "@/utils/hooks/useDelivery";
import { usePortalTodos } from "@/utils/hooks/usePortal";
import { BuildSection } from "./BuildSection";
import { CrmCompletionCards, CrmFeatures, CrmRevisions, useCrmLaunched } from "./CrmAfterLaunch";
import { BuildCards } from "../components/BuildCards";
import { CrmRequestModal } from "../components/CrmRequestModal";
import { PayConfirmModal } from "../components/PayConfirmModal";
import { usePortal } from "../state/PortalContext";
import { useShowPackages } from "../lib/vaAccess";

const PACKAGE_KEYS = OFFERED_CRM_PACKAGES;
type CrmOffer = (typeof OFFERED_CRM_PACKAGES)[number];

type CrmTab = "builds" | "packages" | "progress" | "revisions" | "features";

/** The client's CRM builds and open requests, and the CRM page tab that's showing (also used by the menu). */
export function useCrmTab() {
  const query = usePortalBuilds();
  const builds = (query.data ?? []).filter((b) => b.kind === "crm");
  // Requests not turned into a build yet, plus any still being paid (a fully paid, started one shows as its build).
  const requests = (usePortalCrmRequests().data ?? []).filter(
    (r) => r.status !== "declined" && (!r.projectId || (!!r.invoice && r.paymentsPaid < r.paymentsTotal)),
  );
  const { state } = usePortal();
  const showPackages = useShowPackages("crm");
  // Revisions and New features open once a CRM build is launched.
  const launched = useCrmLaunched();
  // Open on their builds or requests when they have some, otherwise on the packages (when the team shows them).
  const picked: CrmTab = state.crmView || (builds.length || requests.length || !showPackages ? "builds" : "packages");
  const hidden = (picked === "packages" && !showPackages) || ((picked === "revisions" || picked === "features") && !launched);
  const tab: CrmTab = hidden ? "builds" : picked;
  return { query, builds, requests, tab, showPackages, launched };
}

/**
 * Whether this client has the CRM service: the team offers it (sign-up as a Custom CRM client turns it on), or they
 * already have CRM builds or requests to follow. Until then the whole CRM menu, My Sessions and Updates & Resources
 * included, stays hidden.
 */
export function useHasCrm(): boolean {
  const { builds, requests, showPackages } = useCrmTab();
  return showPackages || builds.length > 0 || requests.length > 0;
}

/** CRM page: the client's CRM builds, the packages to start a new one, and Build progress (every build's timeline). */
export function CrmSection() {
  const { query, builds, requests, tab, showPackages, launched } = useCrmTab();
  const { update, readOnly } = usePortal();
  const openTodos = (usePortalTodos().data ?? []).filter((t) => !t.done).length;
  const setPicked = (crmView: CrmTab) => update({ crmView });

  return (
    <div className="page-stack">
      <TabBar<CrmTab>
        label="CRM"
        value={tab}
        onChange={setPicked}
        options={([
          { value: "builds", label: "Your CRM builds", hint: "In progress and live", icon: "rocket", count: builds.length },
          { value: "packages", label: "Get a CRM", hint: "Packages and pricing", icon: "sparkle", tone: "purple" },
          { value: "progress", label: "Build progress", hint: "Timelines and your to-dos", icon: "gauge", tone: "brand", count: openTodos || undefined },
          { value: "revisions", label: "Revisions", hint: "Change what’s built", icon: "edit", tone: "cyan" },
          { value: "features", label: "New features", hint: "Add something new", icon: "bolt", tone: "orange" },
        ] satisfies Array<TabOption<CrmTab>>).filter(
          (o) => (showPackages || o.value !== "packages") && (launched || (o.value !== "revisions" && o.value !== "features")),
        )}
      />
      {tab === "progress" ? (
        <BuildSection kind="crm" />
      ) : tab === "revisions" ? (
        <CrmRevisions />
      ) : tab === "features" ? (
        <CrmFeatures />
      ) : tab === "builds" ? (
        <>
        <CrmCompletionCards />
        <LoadState
          query={query}
          loadingText="Loading your CRM builds…"
          isEmpty={!builds.length && !requests.length}
          empty={showPackages ? "No CRM builds yet. See Get a CRM for the packages, and request one to start." : "No CRM builds yet."}
        >
          {requests.length > 0 && (
            <section className="card stack stack--10">
              <span className="kicker">YOUR REQUESTS · {requests.length}</span>
              {requests.map((r) => (
                <CrmRequestRow key={r.id} request={r} readOnly={readOnly} />
              ))}
            </section>
          )}
          {builds.length > 0 && (
            <>
              <div className="section-head">
                <div className="stack stack--2">
                  <h2 className="section-title">CRMs we’re building</h2>
                  <span className="text-muted">Every CRM your GoCWGL team is working on for you, with its progress</span>
                </div>
              </div>
              <BuildCards builds={builds} icon="users" />
            </>
          )}
        </LoadState>
        </>
      ) : (
        <CrmPackages
          onRequested={() => {
            // Back on their requests, where the new one now shows; the booking page is in its own tab.
            setPicked("builds");
            update({ toast: "Request sent to your GoCWGL team. Pick a time for your call in the new tab." });
          }}
        />
      )}
    </div>
  );
}

/** Brand logos for the CRMs in the cost comparison: Simple Icons for HubSpot and Zoho, GoHighLevel's own mark for it. */
const CRM_LOGOS: Record<string, { viewBox: string; paths: Array<{ fill: string; d: string }> }> = {
  hubspot: { viewBox: "0 0 24 24", paths: [{ fill: `#${siHubspot.hex}`, d: siHubspot.path }] },
  zoho: { viewBox: "0 0 24 24", paths: [{ fill: `#${siZoho.hex}`, d: siZoho.path }] },
  gohighlevel: GHL_MARK,
};

/** How the client reads their request's invoice. */
const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  Sent: { label: "Awaiting payment", tone: "amber" },
  Overdue: { label: "Overdue", tone: "red" },
  Paid: { label: "Paid", tone: "green" },
  Refunded: { label: "Refunded", tone: "purple" },
};

/** One of the client's CRM requests: where it stands, whether it's paid, and Pay now (its package's Wise link) while it's open. */
function CrmRequestRow({ request: r, readOnly }: { request: ClientCrmRequestOut; readOnly: boolean }) {
  const [paying, setPaying] = useState<"" | "confirm" | "other-name">("");
  const pkg = CRM_PACKAGES[r.package as CrmPackageKey];
  const inv = r.invoice;
  const payment = inv ? (PAYMENT[inv.status] ?? { label: inv.status, tone: "neutral" as Tone }) : null;

  return (
    <div className="crm-request-row">
      <div className="stack stack--2 u-grow">
        <span className="text-strong">
          {r.name} · {pkg?.label ?? r.package}
        </span>
        <span className="text-small">
          Requested {formatShort(r.createdAt)} ·{" "}
          {r.paymentsTotal > 1 &&
            `${crmPlanOf(r.paymentPlan, r.package).label}, ${formatCents(crmPlanOf(r.paymentPlan, r.package).paymentCents)} a month · ${r.paymentsPaid} of ${r.paymentsTotal} payments made · `}
          {inv
            ? `Invoice ${inv.number} · ${formatCents(inv.totalCents)}${inv.paidAt ? ` · paid ${formatShort(inv.paidAt)}` : inv.dueDate ? ` · due ${formatShort(inv.dueDate)}` : ""}`
            : r.status === "contacted"
              ? "Discovery call booked · your invoice comes after the call"
              : "Your team will review it before your call"}
        </span>
      </div>
      {payment ? (
        <Badge tone={payment.tone} dot>
          {payment.label}
        </Badge>
      ) : (
        <Badge tone="neutral">Not invoiced yet</Badge>
      )}
      {inv?.paymentUrl && !readOnly && (
        <>
          <Button variant="primary" size="sm" aria-haspopup="dialog" onClick={() => setPaying("confirm")}>
            Pay {formatCents(inv.totalCents)}
          </Button>
          <Button variant="link" size="sm" onClick={() => setPaying("other-name")}>
            Paid under a different name?
          </Button>
          {paying && (
            <PayConfirmModal
              target={{ number: inv.number, totalCents: inv.totalCents, payUrl: inv.paymentUrl, what: `${pkg?.label ?? "CRM"} · ${r.name}` }}
              start={paying}
              onClose={() => setPaying("")}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * CRM packages and how it works. "Request a CRM" saves what they want for the team, then sends them to book the
 * CRM discovery call on app.gocwgl.com. The team invoices CRM builds with their Wise payment link.
 */
function CrmPackages({ onRequested }: { onRequested: () => void }) {
  const { readOnly } = usePortal();
  const [requesting, setRequesting] = useState<{ plan: CrmPaymentPlanKey; pkg: CrmOffer } | null>(null);

  const request = readOnly ? undefined : (plan: CrmPaymentPlanKey = "one_time", pkg: CrmOffer = "growth") => setRequesting({ plan, pkg });

  return (
    <div className="crm-offer">
      <CrmHero onRequest={request && (() => request())} />
      <CrmExplainer />
      <WhyOwnCrm />
      <CostComparison />
      <CrmPackageCards onRequest={request} />
      <CrmSteps />
      <CrmFaq />
      {request && (
        <section className="crm-cta">
          <div className="stack stack--4">
            <h2 className="crm-cta__title">Ready to own your CRM?</h2>
            <span className="crm-cta__text">Free discovery call. Nothing is billed until you approve the quote.</span>
          </div>
          <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => request()}>
            Request a CRM
            <Icon name="arrowRight" strokeWidth={2.4} />
          </Button>
        </section>
      )}
      {requesting && (
        <CrmRequestModal
          initialPlan={requesting.plan}
          initialPackage={requesting.pkg}
          onClose={() => setRequesting(null)}
          onRequested={() => {
            setRequesting(null);
            onRequested();
          }}
        />
      )}
    </div>
  );
}

/** Highlighted right under the hero: what a custom CRM is, and how it beats a subscription CRM point by point. */
function CrmExplainer() {
  const { kicker, title, definition, rows } = CRM_EXPLAINER;
  return (
    <section className="crm-explain" aria-labelledby="crm-explain-title">
      <header className="crm-explain__head">
        <span className="crm-explain__kicker">{kicker}</span>
        <h2 className="crm-explain__title" id="crm-explain-title">
          {title}
        </h2>
      </header>
      <div className="crm-explain__points">
        {definition.map((p) => (
          <article className={`crm-explain__point crm-explain__point--${p.key}`} key={p.key}>
            <span className="crm-explain__point-icon">
              <Icon name={p.icon} size={18} />
            </span>
            <h3 className="crm-explain__point-title">{p.title}</h3>
            <p className="crm-explain__text">{p.text}</p>
          </article>
        ))}
      </div>
      <div className="crm-explain__table" role="table" aria-label="Subscription CRM compared with a custom CRM">
        <div className="crm-explain__row crm-explain__row--head" role="row">
          <span className="crm-explain__corner" role="columnheader">
            Compared on
          </span>
          <span className="crm-explain__col crm-explain__col--rented" role="columnheader">
            <strong>Subscription CRM</strong>
            <small>HubSpot, GoHighLevel, Zoho and others</small>
          </span>
          <span className="crm-explain__col crm-explain__col--own" role="columnheader">
            <span className="crm-explain__pick">Recommended</span>
            <strong>Your custom CRM</strong>
            <small>Built for you by GoCWGL</small>
          </span>
        </div>
        {rows.map((r) => (
          <div className="crm-explain__row" role="row" key={r.key}>
            <span className="crm-explain__topic" role="rowheader">
              <span className="crm-explain__topic-icon">
                <Icon name={r.icon} size={15} />
              </span>
              {r.topic}
            </span>
            <span className="crm-explain__cell crm-explain__cell--rented" role="cell">
              <Icon name="close" size={14} strokeWidth={2.6} className="crm-explain__mark" />
              <span>{r.rented}</span>
            </span>
            <span className="crm-explain__cell crm-explain__cell--own" role="cell">
              <Icon name="check" size={14} strokeWidth={2.8} className="crm-explain__mark" />
              <span>{r.own}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Top of the CRM offer: the hook, Request a CRM, and three quick facts. */
function CrmHero({ onRequest }: { onRequest?: () => void }) {
  const facts = [
    { value: "$0", label: "monthly or per-login fees" },
    { value: "Unlimited", label: "team logins" },
    { value: "100%", label: "yours: the system and the data" },
  ];
  return (
    <section className="crm-intro">
      <div className="crm-intro__copy">
        <span className="crm-intro__eyebrow">
          <Icon name="sparkle" size={13} /> Custom CRM, built for you and owned by you
        </span>
        <h1 className="crm-intro__title">
          Stop renting the system <span className="crm-intro__accent">your business runs on.</span>
        </h1>
        <p className="crm-intro__lead">
          A CRM for coaches, consultants, and coaching and consulting firms. Most businesses rent theirs and pay more every time
          they hire. Tell us how you work, and we build one you own, from {formatCents(CRM_PACKAGES.growth.priceCents)}.
        </p>
        <div className="crm-intro__actions">
          {onRequest && (
            <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={onRequest}>
              Request a CRM
              <Icon name="arrowRight" strokeWidth={2.4} />
            </Button>
          )}
          <a className="crm-intro__link" href="#crm-cost">
            Compare the cost <Icon name="chevronDown" size={15} />
          </a>
        </div>
      </div>
      <dl className="crm-intro__facts">
        {facts.map((f) => (
          <div className="crm-intro__fact" key={f.label}>
            <dt>{f.value}</dt>
            <dd>{f.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The four reasons to own a CRM. */
function WhyOwnCrm() {
  return (
    <section className="crm-block">
      <header className="crm-block__head">
        <span className="crm-block__kicker">Why own your CRM</span>
        <h2 className="crm-block__title">How bigger companies run their sales</h2>
      </header>
      <div className="crm-why">
        {CRM_WHY_OWN.map((r) => (
          <article className="crm-why__card" key={r.key}>
            <span className="crm-why__icon">
              <Icon name={r.icon} size={18} />
            </span>
            <h3 className="crm-why__title">{r.title}</h3>
            <p className="crm-why__desc">{r.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Renting vs owning: what HubSpot, GoHighLevel and Zoho cost over the years for the client's team size, next to the
 * one-time Custom CRM build.
 */
/** A break-even month count as years, e.g. 20 → "~1.7 years", 24 → "~2 years", 8 → "under a year". */
function breakEvenYears(months: number) {
  if (months < 12) return "under a year";
  const y = Math.round((months / 12) * 10) / 10;
  return `~${y} ${y === 1 ? "year" : "years"}`;
}

function CostComparison() {
  const { defaultSeats, maxSeats, periods } = CRM_COMPARISON;
  const [seats, setSeats] = useState(defaultSeats);
  const [years, setYears] = useState<(typeof periods)[number]>(periods[0]);
  // Owning: the one-time build plus the yearly Care plan after its free first year, so the comparison is like for like.
  // Growth, the package most clients start with (Premium is shown under the bars).
  const buildCents = CRM_PACKAGES.growth.priceCents;
  const { priceCents: careCents, freeYears } = CRM_CARE_PLAN;
  const ownAfter = (months: number) => buildCents + (careCents / 12) * Math.max(0, months - freeYears * 12);
  const ownCents = ownAfter(years * 12);
  const rented = CRM_RENTED_OPTIONS.map((o) => {
    const monthlyCents = o.flatMonthlyCents + o.perSeatMonthlyCents * seats;
    const totalCents = o.setupCents + monthlyCents * 12 * years;
    // The first month renting has cost more than owning (build + Care plan), within 20 years.
    const month = Array.from({ length: 240 }, (_, i) => i + 1).find((m) => o.setupCents + monthlyCents * m > ownAfter(m));
    return { ...o, totalCents, breakEven: month ?? Infinity };
  }).sort((a, b) => b.totalCents - a.totalCents);
  const maxCents = Math.max(ownCents, ...rented.map((o) => o.totalCents));
  const width = (cents: number) => `${Math.max(3, Math.round((cents / maxCents) * 100))}%`;
  const biggest = rented[0].totalCents > ownCents ? rented[0] : null;
  const cheaper = rented.filter((o) => o.totalCents < ownCents);
  const seatPct = ((seats - 1) / (maxSeats - 1)) * 100;

  return (
    <section className="crm-block" id="crm-cost">
      <header className="crm-block__head">
        <span className="crm-block__kicker">Renting vs owning</span>
        <h2 className="crm-block__title">What HubSpot, GoHighLevel and Zoho really cost</h2>
        <p className="crm-block__lead">Set your team size and how long you’ll use it. Rented CRMs bill every month for every login; yours is a one-time build, with the first year of care free and $800 a year after that.</p>
      </header>

      <div className="crm-cost">
        <aside className="crm-cost__panel">
          <div className="crm-cost__control">
            <div className="crm-cost__control-head">
              <span className="crm-cost__label">Team logins</span>
              <span className="crm-cost__value">{seats}</span>
            </div>
            <input
              className="crm-cost__range"
              type="range"
              min={1}
              max={maxSeats}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              aria-label="Team logins"
              style={{ ["--fill" as string]: `${seatPct}%` }}
            />
            <div className="crm-cost__scale">
              <span>1</span>
              <span>{maxSeats}</span>
            </div>
          </div>
          <div className="crm-cost__control">
            <span className="crm-cost__label">Over</span>
            <SegmentedControl
              label="Years"
              size="sm"
              variant="soft"
              className="crm-cost__years"
              value={String(years)}
              onChange={(v) => setYears(Number(v) as typeof years)}
              options={periods.map((y) => ({ value: String(y), label: `${y} years` }))}
            />
          </div>
          <div className="crm-cost__result">
            {biggest ? (
              <>
                <span className="crm-cost__label">You save up to</span>
                <span className="crm-cost__saving">{formatCents(biggest.totalCents - ownCents)}</span>
                <span className="crm-cost__note">
                  against {biggest.name} {biggest.plan}, and it pays for itself in{" "}
                  <strong className="crm-cost__payback">{breakEvenYears(biggest.breakEven)}</strong>.
                </span>
              </>
            ) : (
              <>
                <span className="crm-cost__label">For a team this small</span>
                <span className="crm-cost__note">
                  Renting can cost less over {years} years. Owning still means no price rises, no per-login fees as you grow, and a
                  system built for you.
                </span>
              </>
            )}
            {biggest && cheaper.length > 0 && (
              <span className="crm-cost__note crm-cost__note--muted">
                {cheaper.map((o) => o.name).join(" and ")} cost less at this size, but the bill never stops.
              </span>
            )}
          </div>
        </aside>

        <div className="crm-cost__list">
          {rented.map((o) => (
            <div className="crm-cost__row" key={o.key}>
              <CrmMark option={o} />
              <div className="crm-cost__body">
                <div className="crm-cost__row-head">
                  <span className="crm-cost__name">
                    {o.name} <span className="crm-cost__plan">{o.plan}</span>
                  </span>
                  <span className="crm-cost__amount">{formatCents(o.totalCents)}</span>
                </div>
                <div className="crm-cost__track">
                  <span className="crm-cost__fill" style={{ width: width(o.totalCents) }} />
                </div>
                <span className="crm-cost__detail">{o.pricing}</span>
                {o.totalCents > ownCents && Number.isFinite(o.breakEven) && (
                  <span className="crm-cost__breakeven">
                    <Icon name="clock" size={13} strokeWidth={2.4} />
                    Costs more than owning {o.breakEven < 12 ? "within" : "after"}{" "}
                    <strong>{o.breakEven < 12 ? "the first year" : breakEvenYears(o.breakEven)}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="crm-cost__row crm-cost__row--own">
            <span className="crm-cost__mark crm-cost__mark--own">
              <Icon name="check" size={16} strokeWidth={2.6} />
            </span>
            <div className="crm-cost__body">
              <div className="crm-cost__row-head">
                <span className="crm-cost__name">
                  Your own CRM <span className="crm-cost__plan">GoCWGL Growth CRM</span>
                </span>
                <span className="crm-cost__amount crm-cost__amount--own">{formatCents(ownCents)}</span>
              </div>
              <div className="crm-cost__track">
                <span className="crm-cost__fill crm-cost__fill--own" style={{ width: width(ownCents) }} />
              </div>
              <span className="crm-cost__detail">
                {formatCents(buildCents)} one-time build (Premium {formatCents(CRM_PACKAGES.custom.priceCents)}) · first year of care free,
                then {formatCents(careCents)}/year · unlimited logins · yours to keep
              </span>
            </div>
          </div>
          <p className="crm-cost__footnote">
            HubSpot, GoHighLevel and Zoho figures use their published list prices as of November 2026, before taxes, add-ons and
            usage fees, and they can change. We go through your own numbers on the discovery call.
          </p>
        </div>
      </div>
    </section>
  );
}

/** The CRM package (or packages) on offer: price and Request, what's included by area, what the price covers, care. */
function CrmPackageCards({ onRequest }: { onRequest?: (plan: CrmPaymentPlanKey, pkg: CrmOffer) => void }) {
  const [planKeys, setPlanKeys] = useState<Record<CrmOffer, CrmPaymentPlanKey>>({ growth: "one_time", custom: "one_time" });
  return (
    <section className="crm-block">
      <header className="crm-block__head">
        <span className="crm-block__kicker">Two packages</span>
        <h2 className="crm-block__title">Built once. Paid your way. Yours for good.</h2>
        <p className="crm-block__lead">
          Both packages share one design and app. Growth is the complete CRM; Premium adds advanced automation, custom modules
          and a course platform. Pay once, or over 6 or 12 months.
        </p>
      </header>
      {PACKAGE_KEYS.map((key) => {
        const p = CRM_PACKAGES[key];
        const plan = crmPlanOf(planKeys[key], key);
        const monthly = plan.payments > 1;
        const groups = p.groups ?? [{ title: "Everything included", icon: "check" as const, items: p.includes }];
        return (
          <article className="crm-pkg" key={key}>
            <div className="crm-pkg__head">
              <div className="crm-pkg__intro">
                <span className="crm-pkg__kind">{p.kind}</span>
                <div className="crm-pkg__name-row">
                  <h3 className="crm-pkg__name">{p.label}</h3>
                  {p.tag && <span className="crm-pkg__tag">{p.tag}</span>}
                </div>
                <p className="crm-pkg__tagline">{p.tagline}</p>
                <p className="crm-pkg__audience">{p.audience}</p>
                <div className="crm-pkg__facts">
                  <span className="crm-pkg__fact">
                    <Icon name="clock" size={14} /> {p.timeline}
                  </span>
                  <span className="crm-pkg__fact">
                    <Icon name="users" size={14} /> Unlimited team logins
                  </span>
                  <span className="crm-pkg__fact">
                    <Icon name="shield" size={14} /> First year of care free
                  </span>
                  <span className="crm-pkg__fact">
                    <Icon name="dollar" size={14} /> No subscription or per-login fees
                  </span>
                </div>
              </div>
              <div className="crm-pkg__buy">
                <span className="crm-pkg__label">{monthly ? plan.label : "One payment for the whole build"}</span>
                <span className="crm-pkg__amount">
                  {formatCents(monthly ? plan.paymentCents : p.priceCents)}
                  {monthly && <small>/month</small>}
                </span>
                <div className="crm-pkg__plans" role="radiogroup" aria-label={`${p.label} payment option`}>
                    {crmPlansFor(key).map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        role="radio"
                        aria-checked={plan.key === o.key}
                        className="option-card crm-pkg__plan"
                        onClick={() => setPlanKeys((k) => ({ ...k, [key]: o.key }))}
                      >
                        <span className="option-card__head">
                          {o.label}
                          <span className="option-card__price">{o.payments > 1 ? `${formatCents(o.paymentCents)} × ${o.payments}` : formatCents(o.paymentCents)}</span>
                        </span>
                        {o.payments > 1 && <span className="option-card__desc">{formatCents(o.paymentCents * o.payments)} in total</span>}
                      </button>
                    ))}
                </div>
                {onRequest && (
                  <Button variant="primary" size="lg" block aria-haspopup="dialog" onClick={() => onRequest(plan.key, key)}>
                    Request {p.label}
                    <Icon name="arrowRight" strokeWidth={2.4} />
                  </Button>
                )}
                <span className="crm-pkg__fine">Questions first? Book a free discovery call. Nothing is billed until you approve the quote.</span>
              </div>
            </div>

            <div className="crm-pkg__body">
              <span className="crm-pkg__section-title">{p.groupsLead ?? "What’s included"}</span>
              <div className="crm-pkg__groups">
                {groups.map((g) => (
                  <div className="crm-pkg__group" key={g.title}>
                    <div className="crm-pkg__group-head">
                      <span className="crm-pkg__group-icon">
                        <Icon name={g.icon} size={16} />
                      </span>
                      <span className="crm-pkg__group-title">{g.title}</span>
                    </div>
                    <ul className="crm-pkg__list">
                      {g.items.map((item) => (
                        <li key={item}>
                          <span className="crm-plan__check">
                            <Icon name="check" size={11} strokeWidth={3} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {p.limits && <p className="crm-pkg__limits">{p.limits}</p>}

              <div className="crm-pkg__extras">
                <div className="crm-pkg__extra">
                  <span className="crm-pkg__section-title">What the price covers</span>
                  <ol className="crm-pkg__covers">
                    {CRM_PRICE_BREAKDOWN.map((item, i) => (
                      <li key={item}>
                        <span className="crm-pkg__covers-num">{i + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="crm-pkg__extra crm-pkg__extra--care">
                  <div className="crm-pkg__care-head">
                    <span className="crm-pkg__section-title">After launch: Care plan</span>
                    <span className="crm-plan__care-free">First year free</span>
                  </div>
                  <span className="crm-pkg__care-price">
                    {formatCents(CRM_CARE_PLAN.priceCents)}
                    <small>/year after that</small>
                  </span>
                  <ul className="crm-pkg__list">
                    {CRM_CARE_PLAN.includes.map((item) => (
                      <li key={item}>
                        <span className="crm-plan__check">
                          <Icon name="check" size={11} strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {p.note && (
                <p className="crm-pkg__note">
                  <Icon name="sparkle" size={14} />
                  <span>
                    <strong>New features from {formatCents(CRM_FEATURE_FROM_CENTS)}.</strong> {p.note}
                  </span>
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

/** How a CRM build goes, step by step. */
function CrmSteps() {
  return (
    <section className="crm-block">
      <header className="crm-block__head">
        <span className="crm-block__kicker">How it works</span>
        <h2 className="crm-block__title">From first call to go-live</h2>
      </header>
      <ol className="crm-steps">
        {CRM_STEPS.map((s, i) => (
          <li className="crm-steps__step" key={s.title}>
            <span className="crm-steps__num">{i + 1}</span>
            <h3 className="crm-steps__title">{s.title}</h3>
            <p className="crm-steps__desc">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Common questions about CRM builds. */
function CrmFaq() {
  return (
    <section className="crm-block">
      <header className="crm-block__head">
        <span className="crm-block__kicker">Questions</span>
        <h2 className="crm-block__title">Good to know</h2>
      </header>
      <div className="crm-faq">
        {CRM_FAQ.map((f) => (
          <details className="crm-faq__item" key={f.q}>
            <summary>
              <span>{f.q}</span>
              <Icon name="chevronDown" size={16} />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** A rented CRM's logo, or its initials in its brand colour when there's no logo. */
function CrmMark({ option: o }: { option: { name: string; mark: string; color: string; logo?: string } }) {
  const logo = o.logo ? CRM_LOGOS[o.logo] : undefined;
  if (!logo)
    return (
      <span className="crm-cost__mark" style={{ ["--mark" as string]: o.color }} aria-hidden="true">
        {o.mark}
      </span>
    );
  return (
    <span className="crm-cost__mark crm-cost__mark--logo" aria-hidden="true">
      <svg width={20} height={20} viewBox={logo.viewBox} focusable="false">
        {logo.paths.map((p) => (
          <path key={p.d.slice(0, 24)} fill={p.fill} d={p.d} />
        ))}
      </svg>
    </span>
  );
}
