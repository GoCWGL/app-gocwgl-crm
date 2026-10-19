"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, Badge, BarChart, BarRow, Button, ErrorState, Icon, IconTile, KpiCard, Loading, type IconName } from "@/components/ui";
import { CORE_STAGES, SOURCE_LABELS, type AdminTab, type LeadSource } from "@/data/admin";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn, percent } from "@/lib/utils";
import { addDaysIso, formatRelative, formatShort, formatTime, getTimeZone, isoDateIn, todayIso } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useBookings } from "@/utils/hooks/useCalendar";
import { usePipelines, useSalesBoard } from "@/utils/hooks/useContacts";
import { useActivity, useDashboard } from "@/utils/hooks/useReporting";
import { contactName, getSalesStages, stageOf } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

const deltaText = (d: number | null | undefined) => (d === null || d === undefined ? "no earlier data" : `${d >= 0 ? "+" : ""}${d}% vs previous 30 days`);

export function DashboardSection() {
  const { goTo, openContacts } = useAdmin();
  const dashboard = useDashboard(30);
  const board = useSalesBoard();
  const stages = getSalesStages(usePipelines().data);
  const today = todayIso();
  // Fixed once per visit so the query key stays stable.
  const [window7] = useState(() => {
    const now = new Date();
    return { start: now.toISOString(), end: new Date(now.getTime() + 7 * 864e5).toISOString() };
  });
  const bookings = useBookings(window7);
  const activity = useActivity({ limit: 7 });

  if (dashboard.isPending) return <Loading text="Loading your dashboard…" />;
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />;
  const d = dashboard.data;

  const contacts = board.data ?? [];
  const count = (stage: string) => d.stages[stage] ?? 0;
  const total = CORE_STAGES.reduce((n, st) => n + count(st), 0);
  const paid = count("paid");

  const upcoming = (bookings.data ?? []).filter((b) => b.status !== "Canceled" && b.status !== "Cancelled");
  const callsToday = upcoming.filter((b) => isoDateIn(new Date(b.startsAt), getTimeZone()) === today).length;
  const twoDaysAgo = addDaysIso(today, -2);
  const staleLeads = contacts.filter((c) => c.stage === "lead" && isoDateIn(new Date(c.createdAt)) <= twoDaysAgo).length;
  const unscheduled = contacts.filter((c) => c.stage === "booked" && !c.callAt).length;
  const openTickets = Object.values(d.open_tickets ?? {}).reduce((a, b) => a + b, 0);

  const kpis: Array<{ label: string; value: string | number; icon: IconName; tone: Tone; footer: ReactNode }> = [
    {
      label: "Active subscriptions",
      value: d.active_subscriptions,
      icon: "circleCheck",
      tone: "green",
      footer: (
        <>
          <strong>{paid}</strong> paid clients in the pipeline
        </>
      ),
    },
    {
      label: "Monthly revenue (MRR)",
      value: formatCents(d.mrr_cents),
      icon: "dollar",
      tone: "cyan",
      footer: `${formatCents(d.mrr_cents * 12)} per year at this rate`,
    },
    {
      label: "New leads (30 days)",
      value: d.new_leads,
      icon: "userPlus",
      tone: "purple",
      footer: deltaText(d.new_leads_delta),
    },
    {
      label: "Calls next 7 days",
      value: d.calls_next_7_days,
      icon: "calendar",
      tone: "orange",
      footer: (
        <>
          <strong className="u-orange">{callsToday}</strong> scheduled for today
        </>
      ),
    },
    {
      label: "Conversion rate",
      value: `${d.conversion.lead_to_paid_pct}%`,
      icon: "trendUp",
      tone: "teal",
      footer: "Signups in the last 30 days who became paying clients",
    },
  ];

  const daily = d.leads_per_day.slice(-14).map((p, i, arr) => ({
    label: formatShort(p.date),
    value: p.leads,
    color: i === arr.length - 1 ? "#0891B2" : "#A5F3FC",
  }));

  const funnel = [
    { label: "Signed up on landing page", pct: 100, color: "#0891B2" },
    { label: "Booked a call", pct: d.conversion.lead_to_call_pct, color: "#E08A12" },
    { label: "Paid subscription", pct: d.conversion.lead_to_paid_pct, color: "#1F9D57" },
  ];

  const attention: Array<{ label: string; n: number; warn: boolean; tab: AdminTab }> = [
    { label: "Leads waiting 2+ days for a call", n: staleLeads, warn: true, tab: "pipeline" },
    { label: "Booked calls with no time set", n: unscheduled, warn: true, tab: "calendar" },
    { label: "Calls scheduled today", n: callsToday, warn: false, tab: "calendar" },
    { label: "Overdue invoices", n: d.overdue_invoices.count, warn: true, tab: "payments" },
    { label: "Open bug reports", n: openTickets, warn: true, tab: "bugs" },
  ];

  const recent = [...contacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <div className="page-stack">
      <div className="stat-grid stat-grid--wide">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            footer={k.footer}
            icon={
              <IconTile tone={k.tone}>
                <Icon name={k.icon} size={15} />
              </IconTile>
            }
          />
        ))}
      </div>

      <div className="card-row card-row--stretch">
        <section className="card dash-revenue">
          <div className="section-head">
            <div className="stack stack--2">
              <h2 className="card-title">New leads per day</h2>
              <span className="text-small">
                Last 14 days · {formatCents(d.revenue_cents)} collected in the last 30 days ({deltaText(d.revenue_delta)})
              </span>
            </div>
          </div>
          {daily.length ? (
            <BarChart label="New leads per day" data={daily} maxHeight={80} minHeight={4} />
          ) : (
            <p className="text-muted">No leads in this period yet.</p>
          )}
        </section>

        <section className="card dash-snapshot">
          <div className="card__header">
            <div className="stack stack--2">
              <h2 className="card-title">Pipeline snapshot</h2>
              <span className="text-small">Where every signup is right now</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => goTo("pipeline")}>
              Open
            </Button>
          </div>
          <div className="stacked-bar" aria-hidden="true">
            {CORE_STAGES.map((st) => (
              <div
                key={st}
                className={cn("stacked-bar__part", toneClass(stages[st].tone))}
                style={{ "--share": percent(count(st), total) } as CSSProperties}
              />
            ))}
          </div>
          <div>
            {CORE_STAGES.map((st) => (
              <div className="list-row list-row--nowrap legend-row" key={st}>
                <span className={cn("legend-row__swatch", toneClass(stages[st].tone))} aria-hidden="true" />
                <span className="u-grow u-semibold">{stages[st].label}</span>
                <span className="u-muted">{percent(count(st), total)}</span>
                <span className="legend-row__count">{count(st)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="card-row">
        <section className="card">
          <div className="stack stack--2">
            <h2 className="card-title">Signup → Call → Paid</h2>
            <span className="text-small">How far the last 30 days of leads got</span>
          </div>
          {funnel.map((f) => (
            <BarRow
              key={f.label}
              label={f.label}
              percent={d.new_leads ? f.pct : 0}
              color={f.color}
              value={
                <>
                  <strong>{f.pct}%</strong>
                </>
              }
            />
          ))}
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card-title">Upcoming calls</h2>
            <Button variant="secondary" size="sm" onClick={() => goTo("calendar")}>
              Calendar
            </Button>
          </div>
          <div>
            {upcoming.length === 0 && <p className="text-muted">No calls in the next 7 days.</p>}
            {upcoming.slice(0, 6).map((b) => (
              <div className="list-row list-row--nowrap" key={b.id}>
                <div className="date-chip">
                  <span className="date-chip__dow">
                    {new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: getTimeZone() }).format(new Date(b.startsAt))}
                  </span>
                  <span className="date-chip__day">
                    {new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: getTimeZone() }).format(new Date(b.startsAt))}
                  </span>
                </div>
                <div className="stack stack--2">
                  <span className="u-strong">{b.name || b.email}</span>
                  <span className="text-small">{formatTime(b.startsAt)} · Discovery call</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Needs attention</h2>
          <div>
            {attention.map((a) => {
              const tone: Tone = a.n > 0 && a.warn ? "amber" : a.n > 0 ? "cyan" : "green";
              return (
                <button type="button" className="attention-row" key={a.label} onClick={() => goTo(a.tab)}>
                  <span className={cn("attention-row__count", toneClass(tone))}>{a.n}</span>
                  <span className="u-grow u-semibold">{a.label}</span>
                  <Icon name="chevronRight" size={14} className="u-muted" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="card-row">
        <section className="card dash-recent">
          <div className="card__header">
            <div className="stack stack--2">
              <h2 className="card-title">Latest landing page signups</h2>
              <span className="text-small">Newest first</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => openContacts("all")}>
              All clients
            </Button>
          </div>
          {recent.length === 0 ? (
            <p className="text-muted">No signups yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table data-table--plain data-table--compact">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Source</th>
                    <th>Signed up</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => {
                    const st = stageOf(stages, c.stage);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="cluster cluster--nowrap">
                            <Avatar name={contactName(c)} tone={avatarTone(c.id)} />
                            <div className="stack stack--2">
                              <span className="data-table__strong">{contactName(c)}</span>
                              <span className="text-small">{c.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{SOURCE_LABELS[c.source as LeadSource] ?? c.source}</td>
                        <td>{formatShort(c.createdAt)}</td>
                        <td>
                          <Badge tone={st.tone} size="lg">
                            {st.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card dash-activity">
          <h2 className="card-title">Recent activity</h2>
          <div>
            {activity.isPending && <Loading inline />}
            {activity.data?.length === 0 && <p className="text-muted">Nothing has happened yet.</p>}
            {activity.data?.map((a) => (
              <div className={cn("feed-item", toneClass("cyan"))} key={a.id}>
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
