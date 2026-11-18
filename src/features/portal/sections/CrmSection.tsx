"use client";

import { useState } from "react";
import { Badge, Button, Icon, IconTile, LoadState, SegmentedControl, TabBar, type TabOption } from "@/components/ui";
import {
  CRM_FAQ,
  CRM_PACKAGES,
  CRM_PRICE_BREAKDOWN,
  CRM_COMPARISON,
  CRM_RENTED_OPTIONS,
  CRM_STEPS,
  CRM_WHY_OWN,
  OFFERED_CRM_PACKAGES,
  type CrmPackageKey,
} from "@/data/portal";
import { formatCents } from "@/utils/format/money";
import type { Tone } from "@/lib/tones";
import type { ClientCrmRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { usePortalBuilds, usePortalCrmRequests } from "@/utils/hooks/useDelivery";
import { usePortalTodos } from "@/utils/hooks/usePortal";
import { BuildSection } from "./BuildSection";
import { BuildCards } from "../components/BuildCards";
import { CrmRequestModal } from "../components/CrmRequestModal";
import { PayConfirmModal } from "../components/PayConfirmModal";
import { usePortal } from "../state/PortalContext";
import { useShowPackages } from "../lib/vaAccess";

const PACKAGE_KEYS = OFFERED_CRM_PACKAGES;

type CrmTab = "builds" | "packages" | "progress";

/** The client's CRM builds and open requests, and the CRM page tab that's showing (also used by the menu). */
export function useCrmTab() {
  const query = usePortalBuilds();
  const builds = (query.data ?? []).filter((b) => b.kind === "crm");
  // Requests not turned into a build yet, plus any still waiting on payment (a paid, started one shows as its build).
  const requests = (usePortalCrmRequests().data ?? []).filter(
    (r) => r.status !== "declined" && (!r.projectId || (!!r.invoice && r.invoice.status !== "Paid")),
  );
  const { state } = usePortal();
  const showPackages = useShowPackages("crm");
  // Open on their builds or requests when they have some, otherwise on the packages (when the team shows them).
  const picked: CrmTab = state.crmView || (builds.length || requests.length || !showPackages ? "builds" : "packages");
  const tab: CrmTab = picked === "packages" && !showPackages ? "builds" : picked;
  return { query, builds, requests, tab, showPackages };
}

/** CRM page: the client's CRM builds, the packages to start a new one, and Build progress (every build's timeline). */
export function CrmSection() {
  const { query, builds, requests, tab, showPackages } = useCrmTab();
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
        ] satisfies Array<TabOption<CrmTab>>).filter((o) => showPackages || o.value !== "packages")}
      />
      {tab === "progress" ? (
        <BuildSection kind="crm" />
      ) : tab === "builds" ? (
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
  const [requesting, setRequesting] = useState(false);

  return (
    <>
      <section className="crm-hero">
        <IconTile size="xl" tone="purple">
          <Icon name="users" size={22} />
        </IconTile>
        <div className="stack stack--4 u-grow">
          <span className="kicker">CRM BUILDS</span>
          <h2 className="crm-hero__title">A CRM built around how you sell</h2>
          <span className="text-muted">
            Your contacts, pipeline, emails and bookings in one place, built by the same team as your funnels, so every lead lands where it should.
          </span>
        </div>
      </section>

      <WhyOwnCrm />

      <div className="section-head">
        <div className="stack stack--2">
          <h2 className="section-title">Choose your CRM</h2>
          <span className="text-muted">
            One-time build price. Request a CRM to start: you book a call, then approve the plan and quote before anything is billed.
          </span>
        </div>
        {!readOnly && (
          <Button variant="primary" size="lg" aria-haspopup="dialog" onClick={() => setRequesting(true)}>
            <Icon name="plus" strokeWidth={2.4} />
            Request a CRM
          </Button>
        )}
      </div>
      {requesting && (
        <CrmRequestModal
          onClose={() => setRequesting(false)}
          onRequested={() => {
            setRequesting(false);
            onRequested();
          }}
        />
      )}

      <div className="crm-packages">
        {PACKAGE_KEYS.map((key) => {
          const p = CRM_PACKAGES[key];
          return (
            <article className={`card crm-package${p.tag ? " crm-package--featured" : ""}`} key={key}>
              {p.tag && (
                <Badge tone="brand" mono>
                  {p.tag}
                </Badge>
              )}
              <div className="stack stack--4">
                <span className="crm-package__name">{p.label}</span>
                <span className="crm-package__price">{formatCents(p.priceCents)}</span>
                <span className="text-muted">{p.tagline}</span>
              </div>
              <ul className="crm-package__includes">
                {p.includes.map((item) => (
                  <li key={item}>
                    <Icon name="check" size={14} strokeWidth={2.4} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {p.note && <span className="inset inset--brand text-small crm-package__note">{p.note}</span>}
              <span className="text-small crm-package__timeline">
                <Icon name="clock" size={13} /> {p.timeline}
              </span>
            </article>
          );
        })}
      </div>

      <section className="card stack stack--10">
        <h2 className="card-title">How it works</h2>
        <ol className="crm-steps">
          {CRM_STEPS.map((s, i) => (
            <li className="crm-steps__step" key={s.title}>
              <span className="kicker kicker--sm kicker--muted">STEP {i + 1}</span>
              <span className="text-strong">{s.title}</span>
              <span className="text-small">{s.desc}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card stack stack--10">
        <h2 className="card-title">Questions</h2>
        {CRM_FAQ.map((f) => (
          <details className="crm-faq" key={f.q}>
            <summary className="text-strong">{f.q}</summary>
            <p className="text-small">{f.a}</p>
          </details>
        ))}
      </section>
    </>
  );
}

/**
 * Why own a CRM: the hook, the reasons, and what renting a big-name CRM costs over a few years next to a one-time
 * Custom CRM build, for the team size the client picks.
 */
function WhyOwnCrm() {
  const { defaultSeats, maxSeats, periods } = CRM_COMPARISON;
  const [seats, setSeats] = useState(defaultSeats);
  const [years, setYears] = useState<(typeof periods)[number]>(periods[0]);
  const ownCents = CRM_PACKAGES.custom.priceCents;
  const rented = CRM_RENTED_OPTIONS.map((o) => {
    const monthlyCents = o.flatMonthlyCents + o.perSeatMonthlyCents * seats;
    const totalCents = o.setupCents + monthlyCents * 12 * years;
    // Months of renting it takes to cost more than the one-time build.
    const breakEven = Math.ceil(Math.max(0, ownCents - o.setupCents) / monthlyCents);
    return { ...o, totalCents, breakEven };
  });
  const maxCents = Math.max(ownCents, ...rented.map((o) => o.totalCents));
  const width = (cents: number) => `${Math.max(2, Math.round((cents / maxCents) * 100))}%`;
  const beaten = rented.filter((o) => o.totalCents > ownCents);
  const biggest = beaten.reduce<(typeof rented)[number] | null>((a, o) => (!a || o.totalCents > a.totalCents ? o : a), null);

  return (
    <>
      <section className="card crm-why">
        <div className="stack stack--4">
          <span className="kicker">WHY OWN YOUR CRM</span>
          <h2 className="crm-why__hook">Stop renting the system your business runs on.</h2>
          <span className="text-muted">
            Your CRM holds every lead, every deal and every client you’ve ever won. Most businesses rent it month after month, and
            pay more every time they hire. Owning it is how bigger companies do it.
          </span>
        </div>
        <div className="crm-why__reasons">
          {CRM_WHY_OWN.map((r) => (
            <div className="inset crm-why__reason" key={r.key}>
              <IconTile size="sm" tone="purple">
                <Icon name={r.icon} size={15} />
              </IconTile>
              <span className="text-strong">{r.title}</span>
              <span className="text-small">{r.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card crm-cost">
        <div className="crm-cost__head">
          <div className="stack stack--2">
            <h2 className="card-title">Renting vs owning: HubSpot, GoHighLevel, Zoho and yours</h2>
            <span className="text-small">Move the slider to your team size and see what each one costs over the years.</span>
          </div>
          <SegmentedControl
            label="Years"
            size="sm"
            variant="soft"
            value={String(years)}
            onChange={(v) => setYears(Number(v) as typeof years)}
            options={periods.map((y) => ({ value: String(y), label: `${y} years` }))}
          />
        </div>
        <label className="crm-cost__seats">
          <span className="text-strong">
            {seats} team {seats === 1 ? "login" : "logins"}
          </span>
          <input
            type="range"
            min={1}
            max={maxSeats}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            aria-label="Team logins"
          />
        </label>
        <div className="crm-cost__bars">
          {rented.map((o) => (
            <div className="crm-cost__bar" key={o.key}>
              <div className="crm-cost__bar-head">
                <span className="text-strong">
                  {o.name} <span className="text-muted">· {o.plan}</span>
                </span>
                <span className="crm-cost__amount crm-cost__amount--rent">{formatCents(o.totalCents)}</span>
              </div>
              <div className="crm-cost__track">
                <span className="crm-cost__fill crm-cost__fill--rent" style={{ width: width(o.totalCents) }} />
              </div>
              <span className="text-small">
                {o.pricing}.{" "}
                {o.totalCents > ownCents
                  ? `Costs more than owning after about ${o.breakEven} months.`
                  : `Costs ${formatCents(ownCents - o.totalCents)} less here, but you never own it and the bill never stops.`}
              </span>
            </div>
          ))}
          <div className="crm-cost__bar crm-cost__bar--own">
            <div className="crm-cost__bar-head">
              <span className="text-strong">
                Your own CRM <span className="text-muted">· GoCWGL Custom CRM</span>
              </span>
              <span className="crm-cost__amount crm-cost__amount--own">{formatCents(ownCents)}</span>
            </div>
            <div className="crm-cost__track">
              <span className="crm-cost__fill crm-cost__fill--own" style={{ width: width(ownCents) }} />
            </div>
            <span className="text-small">One-time build, unlimited logins, built for how you work, and yours to keep.</span>
          </div>
        </div>
        <span className={`inset text-small ${biggest ? "inset--brand" : ""}`}>
          {biggest
            ? `With ${seats} logins over ${years} years, owning saves about ${formatCents(biggest.totalCents - ownCents)} against ${biggest.name} ${biggest.plan}. And the rented ones keep billing after that, while yours is paid for.`
            : `Over ${years} years, renting can cost less for a small team. Owning still means no price rises, no per-login fees as you grow, and a system that's yours.`}
        </span>
      </section>

      <section className="card crm-cost">
        <div className="stack stack--2">
          <h2 className="card-title">Why it costs what it does</h2>
          <span className="text-small">
            Big companies pay implementation partners tens of thousands just to set up a CRM they still rent. Your price covers a
            full build of the same kind of system, sized for your business, and then it’s yours.
          </span>
        </div>
        <ul className="crm-package__includes">
          {CRM_PRICE_BREAKDOWN.map((item) => (
            <li key={item}>
              <Icon name="check" size={14} strokeWidth={2.4} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <span className="text-small text-muted">
          HubSpot, GoHighLevel and Zoho prices are their published list prices as of November 2026, before taxes, add-ons and usage fees, and they can change. We go through your own numbers
          on the discovery call.
        </span>
      </section>
    </>
  );
}
