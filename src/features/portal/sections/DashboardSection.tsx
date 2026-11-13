"use client";

import type { ReactNode } from "react";
import { Avatar, Badge, Icon, IconTile, ProgressBar, Stars, type IconName } from "@/components/ui";
import type { PortalTab } from "@/data/portal";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { formatRelative, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMyAffiliate } from "@/utils/hooks/useAffiliates";
import { usePortalBilling } from "@/utils/hooks/useBilling";
import { useLiveWork, useProjects, useVaInvoicesForClient, useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
import { useMyFeedback } from "@/utils/hooks/useFeedback";
import { useOverview } from "@/utils/hooks/usePortal";
import { useMe } from "@/utils/hooks/useUsers";
import { StateChip, VaPresence } from "../components/VaPresence";
import { isOpenProject, PROJECT_STATUS } from "../lib/projects";
import { firstName, hm } from "../lib/vaTeam";
import { usePortal } from "../state/PortalContext";

const today = () => new Date().toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Client portal › Dashboard: the VA team's status right now, and everything that needs a look. */
export function DashboardSection() {
  const { goTo } = usePortal();
  const me = useMe().data;
  const live = useLiveWork().data;
  const team = useVaTeam().data ?? [];
  const projects = useProjects().data ?? [];
  const vaInvoices = useVaInvoicesForClient().data ?? [];
  const billing = usePortalBilling().data;
  const overview = useOverview(30).data;
  const feedback = useMyFeedback().data ?? [];
  const affiliate = useMyAffiliate().data;
  const requests = (useVaRequests().data ?? []).filter((r) => ["new", "reviewing", "approved", "posted", "interviewing"].includes(r.status));

  const vas = live?.vas ?? [];
  const openProjects = projects.filter(isOpenProject);
  const pendingVa = vaInvoices.filter((i) => i.status === "sent");
  const pendingG = (billing?.invoices ?? []).filter((i) => i.status === "Sent" || i.status === "Overdue");
  const pending = [
    ...pendingVa.map((i) => ({ id: i.id, number: i.number, from: i.va.name, cents: i.amountCents, currency: "usd", due: i.dueDate })),
    ...pendingG.map((i) => ({ id: i.id, number: i.number, from: "GoCWGL", cents: i.totalCents, currency: i.currency, due: i.dueDate })),
  ].sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
  const pendingCents = pending.reduce((n, i) => n + i.cents, 0);
  const overdue = pending.filter((i) => i.due && i.due < today()).length;
  const name = me?.isStaff ? overview?.business : me?.fullName ? firstName(me.fullName) : "";

  return (
    <div className="page-stack cp-dash">
      <section className="card cp-dash-hero">
        <div className="stack stack--4 u-grow">
          <span className="kicker kicker--sm">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</span>
          <h2 className="cp-dash-hero__title">
            {greeting()}
            {name ? `, ${name}` : ""}
          </h2>
          <span className="text-small">
            {live
              ? live.working
                ? `${live.working} of ${vas.length} VA${vas.length === 1 ? " is" : "s are"} working for you right now.`
                : vas.length
                  ? "No one on your VA team is clocked in for you right now."
                  : "Your VA team shows up here once GoCWGL places a VA with you."
              : "Checking on your team…"}
          </span>
        </div>
        <div className="cp-dash-hero__live">
          {vas.slice(0, 5).map((v) => (
            <VaPresence key={v.vaId} id={v.vaId} name={v.name} state={v.state} size="md" />
          ))}
        </div>
      </section>

      <div className="cp-kpis">
        <Kpi icon="pulse" tone="green" label="Working now" value={live ? `${live.working} / ${vas.length}` : "–"} onClick={() => goTo("live")} />
        <Kpi icon="clock" tone="cyan" label="Hours this week" value={live ? hm(live.weekSeconds) : "–"} onClick={() => goTo("journal")} />
        <Kpi
          icon="invoice"
          tone={overdue ? "red" : pending.length ? "amber" : "slate"}
          label="Pending invoices"
          value={formatCentsExact(pendingCents)}
          hint={pending.length ? `${pending.length} to pay${overdue ? ` · ${overdue} overdue` : ""}` : "All paid"}
          onClick={() => goTo("billing")}
        />
        <Kpi icon="clipboard" tone="brand" label="Open tasks" value={String(openProjects.length)} onClick={() => goTo("projects")} />
      </div>

      <div className="cp-dash-grid">
        <div className="cp-dash-grid__main">
          <Panel icon="users" tone="green" title="VA team status" link="Live work" tab="live">
            {vas.length ? (
              <ul className="cp-dash-vas">
                {vas.map((v) => (
                  <li key={v.vaId} className={`is-${v.state}`}>
                    <VaPresence id={v.vaId} name={v.name} state={v.state} size="md" />
                    <span className="stack stack--2 u-grow">
                      <strong>{v.name}</strong>
                      <span className="text-small">
                        {v.current
                          ? v.current.note || v.current.category || "Working for you"
                          : v.lastWorkedAt
                            ? `Last worked for you ${formatRelative(v.lastWorkedAt)}`
                            : v.headline || "Not started yet"}
                      </span>
                    </span>
                    <span className="cp-dash-vas__hours">{hm(v.todaySeconds)} today</span>
                    <StateChip state={v.state} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No VAs yet." action="Request a VA" onClick={() => goTo("team")} />
            )}
            {requests.length > 0 && (
              <button type="button" className="cp-dash-note" onClick={() => goTo("team")}>
                <Icon name="userPlus" size={14} /> {requests.length} VA request{requests.length === 1 ? "" : "s"} in progress: {requests.map((r) => r.role).join(", ")}
                <Icon name="arrowRight" size={12} />
              </button>
            )}
          </Panel>

          <Panel icon="clipboard" tone="brand" title="Tasks" link="All tasks" tab="projects">
            {openProjects.length ? (
              <ul className="cp-dash-list">
                {openProjects.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span className="stack stack--2 u-grow">
                      <strong>{p.title}</strong>
                      <span className="text-small">
                        {p.va ? p.va.name : "GoCWGL is picking a VA"}
                        {p.dueDate ? ` · due ${formatShort(p.dueDate)}` : ""}
                      </span>
                    </span>
                    <Badge tone={PROJECT_STATUS[p.status].tone} dot>
                      {PROJECT_STATUS[p.status].label}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No open tasks." action="Request a task" onClick={() => goTo("projects")} />
            )}
          </Panel>

          {overview?.buildProgress != null && (
            <Panel icon="rocket" tone="orange" title="Build progress" link="Open" tab="build">
              <div className="cp-dash-build">
                <div className="cluster cluster--between">
                  <strong className="cp-dash-build__pct">{overview.buildProgress}%</strong>
                  <span className="text-small">{overview.buildDue ? `Due ${formatShort(overview.buildDue)}` : ""}</span>
                </div>
                <ProgressBar value={overview.buildProgress} tone="brand" />
                {overview.openTodos > 0 && (
                  <button type="button" className="cp-dash-note" onClick={() => goTo("build")}>
                    <Icon name="checkbox" size={14} /> {overview.openTodos} to-do{overview.openTodos === 1 ? "" : "s"} waiting on you
                    <Icon name="arrowRight" size={12} />
                  </button>
                )}
              </div>
            </Panel>
          )}
        </div>

        <aside className="cp-dash-grid__side">
          <Panel icon="invoice" tone="pink" title="Pending invoices" link="Invoices" tab="billing">
            {pending.length ? (
              <ul className="cp-dash-list">
                {pending.slice(0, 5).map((i) => {
                  const late = !!i.due && i.due < today();
                  return (
                    <li key={i.id}>
                      <span className="stack stack--2 u-grow">
                        <strong>{formatCentsExact(i.cents, i.currency)}</strong>
                        <span className="text-small">
                          {i.number} · {i.from}
                        </span>
                      </span>
                      <Badge tone={late ? "red" : "amber"} dot>
                        {late ? "Overdue" : i.due ? `Due ${formatShort(i.due)}` : "Pending"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty text="You’re all paid up." />
            )}
          </Panel>

          <Panel icon="star" tone="amber" title="Ratings & feedback" link="Rate your VAs" tab="ratings">
            {team.length ? (
              <ul className="cp-dash-list">
                {team.map((v) => (
                  <li key={v.vaId}>
                    <Avatar name={v.name} tone={avatarTone(v.vaId)} size="sm" />
                    <span className="u-grow">{v.name}</span>
                    {v.myRating != null ? (
                      <span className="cp-dash-rating">
                        <Stars value={v.myRating} size={12} /> {v.myRating.toFixed(1)}
                      </span>
                    ) : (
                      <button type="button" className="cp-link" onClick={() => goTo("ratings")}>
                        Rate {firstName(v.name)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Rate your VAs once they start." />
            )}
            {feedback[0]?.comment && (
              <button type="button" className="cp-dash-quote" onClick={() => goTo("ratings")}>
                <span className="text-tiny">
                  Your last feedback · {feedback[0].va.name} · {formatShort(feedback[0].createdAt)}
                </span>
                “{feedback[0].comment}”
              </button>
            )}
          </Panel>

          <Panel icon="gift" tone="amber" title="Affiliate" link={affiliate?.unlocked ? "Open" : undefined} tab="affiliate">
            {affiliate?.unlocked ? (
              <div className="cp-dash-aff">
                <div className="cp-dash-aff__stats">
                  <span>
                    <b>{affiliate.referrals.length}</b> referred
                  </span>
                  <span>
                    <b>{formatCentsExact(affiliate.earnedCents, affiliate.currency)}</b> earned
                  </span>
                  <span>
                    <b>{formatCentsExact(affiliate.owedCents, affiliate.currency)}</b> to be paid
                  </span>
                </div>
                <span className="text-small">
                  Your referral ID: <code>{affiliate.referralCode}</code>
                </span>
              </div>
            ) : (
              <Empty text="Refer businesses to GoCWGL and earn a bonus. Opens once you’re a paid subscriber." />
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Kpi({ icon, tone, label, value, hint, onClick }: { icon: IconName; tone: Tone; label: string; value: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" className={cn("cp-kpi", toneClass(tone))} onClick={onClick}>
      <span className="cp-kpi__icon" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <span className="cp-kpi__label">{label}</span>
      <strong className="cp-kpi__value">{value}</strong>
      {hint && <span className="cp-kpi__hint">{hint}</span>}
    </button>
  );
}

function Panel({ icon, tone, title, link, tab, children }: { icon: IconName; tone: Tone; title: string; link?: string; tab: PortalTab; children: ReactNode }) {
  const { goTo } = usePortal();
  return (
    <section className="card cp-panel">
      <header className="cp-panel__head">
        <IconTile tone={tone} size="sm">
          <Icon name={icon} size={14} />
        </IconTile>
        <h3 className="cp-panel__title">{title}</h3>
        {link && (
          <button type="button" className="cp-link" onClick={() => goTo(tab)}>
            {link} <Icon name="arrowRight" size={12} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function Empty({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="cp-dash-empty">
      <span>{text}</span>
      {action && onClick && (
        <button type="button" className="cp-link" onClick={onClick}>
          {action} <Icon name="arrowRight" size={12} />
        </button>
      )}
    </div>
  );
}
