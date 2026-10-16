"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar, Badge, BarChart, BarRow, Button, Icon, IconTile, KpiCard, type IconName } from "@/components/ui";
import { PLAN_PRICE, WEEK_DAYS, type AdminTab, type CoreStage } from "@/data/admin";
import { dayNumber } from "@/lib/dates";
import { avatarTone, toneClass, type Tone } from "@/lib/tones";
import { cn, formatMoney, percent } from "@/lib/utils";
import { getSalesStages } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

const TODAY = 14;
const DAY_ORDER: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
const STAGE_ORDER: CoreStage[] = ["lead", "booked", "paid", "lost"];

const ACTIVITY_TEXT: Record<CoreStage, string> = {
  lead: "signed up on your landing page",
  booked: "booked a discovery call",
  paid: "paid for the subscription",
  lost: "was marked as lost",
};

export function DashboardSection() {
  const { state, goTo, openContacts } = useAdmin();
  const { contacts, pipelines, tickets } = state;
  const stages = getSalesStages(pipelines);

  const count = (stage: CoreStage) => contacts.filter((c) => c.stage === stage).length;
  const total = contacts.length;
  const paid = count("paid");
  const booked = count("booked");
  const reachedCall = booked + paid;

  const scheduled = contacts.filter((c) => c.stage === "booked" && c.day);
  const unscheduled = contacts.filter((c) => c.stage === "booked" && !c.day);
  const callsToday = scheduled.filter((c) => c.day === "Wed").length;
  const staleLeads = contacts.filter((c) => c.stage === "lead" && TODAY - dayNumber(c.signed) >= 2).length;
  const openBugs = tickets.filter((t) => t.status !== "Fixed").length;

  const kpis: Array<{ label: string; value: string | number; icon: IconName; tone: Tone; footer: ReactNode }> = [
    {
      label: "Active clients",
      value: paid,
      icon: "circleCheck",
      tone: "green",
      footer: (
        <>
          <strong>+{contacts.filter((c) => c.stage === "paid" && c.paidOn.startsWith("Oct")).length}</strong> new this month
        </>
      ),
    },
    { label: "Monthly revenue (MRR)", value: formatMoney(paid * PLAN_PRICE), icon: "dollar", tone: "cyan", footer: `${formatMoney(paid * PLAN_PRICE * 12)} per year at this rate` },
    {
      label: "New leads this week",
      value: contacts.filter((c) => dayNumber(c.signed) >= 12).length,
      icon: "userPlus",
      tone: "purple",
      footer: `${total} total landing page signups`,
    },
    {
      label: "Calls booked",
      value: booked,
      icon: "calendar",
      tone: "orange",
      footer: (
        <>
          <strong className="u-orange">{callsToday}</strong> scheduled for today
        </>
      ),
    },
    { label: "Conversion rate", value: percent(paid, total), icon: "trendUp", tone: "teal", footer: "Signups who became paying clients" },
  ];

  // MRR history: earlier months are sample numbers, October is live.
  const trend = [1, 1, 2, 2, 2, paid];
  const mrrTrend = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((label, i) => ({
    label,
    value: trend[i],
    display: formatMoney(trend[i] * PLAN_PRICE),
    color: i === 5 ? "#0891B2" : "#A5F3FC",
  }));

  const funnel = [
    { label: "Signed up on landing page", n: total, color: "#0891B2" },
    { label: "Booked a call", n: reachedCall, color: "#E08A12" },
    { label: "Paid subscription", n: paid, color: "#1F9D57" },
  ];

  const upcoming = scheduled
    .filter((c) => DAY_ORDER[c.day] >= 2)
    .sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day]);

  const attention: Array<{ label: string; n: number; warn: boolean; tab: AdminTab }> = [
    { label: "Leads waiting 2+ days for a call", n: staleLeads, warn: true, tab: "pipeline" },
    { label: "Booked calls with no time set", n: unscheduled.length, warn: true, tab: "calendar" },
    { label: "Calls scheduled today", n: callsToday, warn: false, tab: "calendar" },
    { label: "Open bug reports", n: openBugs, warn: true, tab: "bugs" },
  ];

  const activity = contacts
    .map((c) => ({
      id: c.id,
      name: c.name,
      text: c.stage === "paid" ? `paid ${formatMoney(PLAN_PRICE)} subscription` : ACTIVITY_TEXT[c.stage],
      when:
        c.stage === "paid"
          ? c.paidOn
          : c.stage === "booked" && c.day
            ? `Call on ${c.day} ${WEEK_DAYS.find(([d]) => d === c.day)?.[1]} Oct`
            : c.signed,
      tone: stages[c.stage].tone,
      sortKey: dayNumber(c.stage === "paid" ? c.paidOn : c.signed),
    }))
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 7);

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
              <h2 className="card-title">Revenue growth</h2>
              <span className="text-small">Monthly recurring revenue, last 6 months</span>
            </div>
            <Badge tone="neutral" size="lg">
              Earlier months: sample
            </Badge>
          </div>
          <BarChart label="Monthly recurring revenue" data={mrrTrend} maxHeight={80} minHeight={4} />
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
            {STAGE_ORDER.map((st) => (
              <div
                key={st}
                className={cn("stacked-bar__part", toneClass(stages[st].tone))}
                style={{ "--share": percent(count(st), total) } as CSSProperties}
              />
            ))}
          </div>
          <div>
            {STAGE_ORDER.map((st) => (
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
            <span className="text-small">How far your landing page leads get</span>
          </div>
          {funnel.map((f) => (
            <BarRow
              key={f.label}
              label={f.label}
              percent={total ? (f.n / total) * 100 : 0}
              color={f.color}
              value={
                <>
                  <strong>{f.n}</strong> · {percent(f.n, total)}
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
            {upcoming.map((c) => (
              <div className="list-row list-row--nowrap" key={c.id}>
                <div className="date-chip">
                  <span className="date-chip__dow">{c.day}</span>
                  <span className="date-chip__day">{WEEK_DAYS.find(([d]) => d === c.day)?.[1]}</span>
                </div>
                <div className="stack stack--2">
                  <span className="u-strong">{c.name}</span>
                  <span className="text-small">{c.time} · Discovery call</span>
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
                {contacts.slice(0, 6).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cluster cluster--nowrap">
                        <Avatar name={c.name} tone={avatarTone(c.id)} />
                        <div className="stack stack--2">
                          <span className="data-table__strong">{c.name}</span>
                          <span className="text-small">{c.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{c.source}</td>
                    <td>{c.signed}</td>
                    <td>
                      <Badge tone={stages[c.stage].tone} size="lg">
                        {stages[c.stage].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card dash-activity">
          <h2 className="card-title">Recent activity</h2>
          <div>
            {activity.map((a) => (
              <div className={cn("feed-item", toneClass(a.tone))} key={a.id}>
                <span className="feed-item__dot feed-item__dot--tone" aria-hidden="true" />
                <div className="feed-item__body">
                  <span className="feed-item__text">
                    <strong>{a.name}</strong> {a.text}
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
