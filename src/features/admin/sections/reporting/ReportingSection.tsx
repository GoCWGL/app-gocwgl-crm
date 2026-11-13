"use client";

import { useState, type ReactNode } from "react";
import { BarRow, Button, ColumnChart, Field, Icon, IconTile, Input, LoadState, SegmentedControl, Tabs, type IconName } from "@/components/ui";
import { CORE_STAGES, SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { toneClass, type Tone } from "@/lib/tones";
import { cn, percent } from "@/lib/utils";
import type { CustomRange, DashboardNumbers, DashboardRange } from "@/utils/api/reporting";
import { addDaysIso, formatLong, formatShort, todayIso } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { usePipelines } from "@/utils/hooks/useContacts";
import { useDashboard } from "@/utils/hooks/useReporting";
import { getSalesStages } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { TeamReport } from "./TeamReport";

type Preset = "7" | "30" | "90" | "custom";

/** The last 7, 30 or 90 days, or any range you pick (whole days in the business time zone). */
const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

/** About three years, like the API. */
const MAX_DAYS = 1100;
/** One hue for single-series charts (sources, the funnel); client and VA signups get their own. */
const SERIES = "#0891B2";
const CLIENTS = "#0891B2";
const VAS = "#7C3AED";

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;

function rangeError(r: CustomRange): string {
  if (!r.start || !r.end) return "Choose a start and an end date.";
  if (r.end < r.start) return "The end date is before the start date.";
  if (daysBetween(r.start, r.end) > MAX_DAYS) return "Choose a range of up to three years.";
  return "";
}

/** Quick picks for the custom range, relative to today. */
function shortcuts(today: string): Array<{ label: string; range: CustomRange }> {
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${y}-${pad(m)}-01`;
  const lastMonthEnd = addDaysIso(monthStart, -1);
  return [
    { label: "This month", range: { start: monthStart, end: today } },
    { label: "Last month", range: { start: `${lastMonthEnd.slice(0, 7)}-01`, end: lastMonthEnd } },
    { label: "This year", range: { start: `${y}-01-01`, end: today } },
    { label: "Last year", range: { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` } },
  ];
}

/** Every Monday from the week of `start` through the week of `end`. */
function mondaysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let m = mondayOf(start); m <= end; m = addDaysIso(m, 7)) out.push(m);
  return out;
}
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return addDaysIso(iso, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
}
/** Daily counts → weekly totals (weeks start on Monday). */
function byWeek(perDay: Array<{ date: string; n: number }>): Map<string, number> {
  const weeks = new Map<string, number>();
  for (const p of perDay) weeks.set(mondayOf(p.date), (weeks.get(mondayOf(p.date)) ?? 0) + p.n);
  return weeks;
}

type ReportView = "team" | "sales";

/** Reports: the team (hours, billing, no-shows) and sales (signups, conversion, pipeline). */
export function ReportingSection() {
  const [view, setView] = useState<ReportView>("team");
  return (
    <div className="page-stack">
      <div className="card card--flat board board--bar-only">
        <div className="board__bar">
          <Tabs<ReportView>
            label="Report"
            value={view}
            onChange={setView}
            options={[
              { value: "team", label: "Team", hint: "Hours, billing, no-shows", icon: "users", tone: "cyan" },
              { value: "sales", label: "Sales & signups", hint: "Leads, conversion, pipeline", icon: "trendUp", tone: "orange" },
            ]}
          />
        </div>
      </div>
      {view === "team" ? <TeamReport /> : <SalesReport />}
    </div>
  );
}

function SalesReport() {
  const today = todayIso();
  const [range, setRange] = useState<Preset>("30");
  // The dates being typed, and the last valid range (what the report shows while a date is half-typed).
  const [draft, setDraft] = useState<CustomRange>({ start: addDaysIso(today, -29), end: today });
  const [applied, setApplied] = useState<CustomRange>(draft);
  const custom = range === "custom" ? applied : null;
  const report = useDashboard(range === "custom" ? 30 : (Number(range) as DashboardRange), custom);
  const d = report.data;
  const start = custom ? custom.start : addDaysIso(today, -Number(range) + 1);
  const end = custom ? custom.end : today;
  const draftError = rangeError(draft);

  const pick = (next: CustomRange) => {
    setDraft(next);
    if (!rangeError(next)) setApplied(next);
  };

  return (
    <div className="page-stack report">
      <section className="card report-bar" aria-label="Date range">
        <div className="report-bar__row">
          <div className="report-bar__range">
            <span className="report-bar__icon" aria-hidden="true">
              <Icon name="calendar" size={16} />
            </span>
            <span className="stack stack--2">
              <span className="kicker kicker--sm kicker--muted">REPORTING PERIOD</span>
              <strong className="report-bar__dates">
                {formatLong(start)} – {formatLong(end)}
              </strong>
            </span>
            {report.isFetching && !report.isPending && <span className="report-bar__updating">Updating…</span>}
          </div>
          <SegmentedControl variant="soft" label="Date range" options={PRESETS} value={range} onChange={setRange} />
        </div>
        {range === "custom" && (
          <div className="report-bar__custom">
            <Field label="From" htmlFor="report-from">
              <Input id="report-from" type="date" value={draft.start} max={draft.end || today} onChange={(e) => pick({ ...draft, start: e.target.value })} />
            </Field>
            <Field label="To" htmlFor="report-to">
              <Input id="report-to" type="date" value={draft.end} min={draft.start} max={today} onChange={(e) => pick({ ...draft, end: e.target.value })} />
            </Field>
            <div className="cluster cluster--8">
              {shortcuts(today).map((s) => (
                <Button key={s.label} size="sm" variant="outline" onClick={() => pick(s.range)}>
                  {s.label}
                </Button>
              ))}
            </div>
            {draftError && draft.start && draft.end && (
              <span className="field__error report-bar__error" role="alert">
                {draftError} Showing the last valid range.
              </span>
            )}
          </div>
        )}
      </section>

      <LoadState query={report} loadingText="Loading report…">
        {d && <Report d={d} start={start} end={end} />}
      </LoadState>
    </div>
  );
}

function Report({ d, start, end }: { d: DashboardNumbers; start: string; end: string }) {
  const callToPaid = d.conversion.lead_to_call_pct ? Math.round((d.conversion.lead_to_paid_pct / d.conversion.lead_to_call_pct) * 100) : 0;
  const vs = `vs the ${d.period_days} days before`;

  return (
    <>
      <div className="report-kpis">
        <Kpi icon="userPlus" tone="cyan" label="Client signups" value={String(d.new_leads)} delta={d.new_leads_delta} note={vs} />
        <Kpi icon="briefcase" tone="purple" label="VA signups" value={String(d.va_signups)} delta={d.va_signups_delta} note={vs} />
        <Kpi icon="dollar" tone="green" label="Revenue collected" value={formatCents(d.revenue_cents)} delta={d.revenue_delta} note={vs} />
        <Kpi
          icon="trendUp"
          tone="sky"
          label="Monthly recurring revenue"
          value={formatCents(d.mrr_cents)}
          note={`${d.active_subscriptions} active subscription${d.active_subscriptions === 1 ? "" : "s"}`}
        />
        <Kpi icon="gauge" tone="orange" label="Signup → paid" value={`${d.conversion.lead_to_paid_pct}%`} note="Signups who became paying clients" />
      </div>

      <div className="report-grid">
        <ReportCard
          title="Signups per week"
          subtitle={`${d.new_leads + d.va_signups} in this period: ${d.new_leads} client${d.new_leads === 1 ? "" : "s"}, ${d.va_signups} VA${d.va_signups === 1 ? "" : "s"}`}
          className="report-grid__wide"
        >
          <WeeklyChart d={d} start={start} end={end} />
        </ReportCard>
        <ReportCard title="Conversion" subtitle="From signup to paying client">
          <Funnel
            steps={[
              { label: "Signed up", pct: 100, note: `${d.new_leads}` },
              { label: "Booked a call", pct: d.conversion.lead_to_call_pct, note: `${d.conversion.lead_to_call_pct}%` },
              { label: "Paid", pct: d.conversion.lead_to_paid_pct, note: `${d.conversion.lead_to_paid_pct}%` },
            ]}
            footnote={`${callToPaid}% of booked calls became paying clients.`}
          />
        </ReportCard>
        <ReportCard title="Where signups came from" subtitle="Lead source">
          <Sources sources={d.sources} />
        </ReportCard>
        <ReportCard title="Pipeline today" subtitle="Every contact by sales stage" className="report-grid__wide">
          <Pipeline stages={d.stages} />
        </ReportCard>
        <ReportCard title="Needs attention" subtitle="Right now" className="report-grid__wide">
          <Attention d={d} />
        </ReportCard>
      </div>
    </>
  );
}

function ReportCard({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("card report-card", className)}>
      <header className="report-card__head">
        <h2 className="card-title">{title}</h2>
        {subtitle && <span className="text-small">{subtitle}</span>}
      </header>
      {children}
    </section>
  );
}

/** Headline number with an icon and, when there's a previous period, an up/down change. */
function Kpi({ icon, tone, label, value, delta, note }: { icon: IconName; tone: Tone; label: string; value: string; delta?: number | null; note: string }) {
  const hasDelta = delta !== undefined && delta !== null;
  return (
    <div className="card report-kpi">
      <div className="report-kpi__head">
        <IconTile tone={tone} size="sm">
          <Icon name={icon} size={15} strokeWidth={2} />
        </IconTile>
        <span className="report-kpi__label">{label}</span>
      </div>
      <span className="report-kpi__value">{value}</span>
      <span className="report-kpi__foot">
        {hasDelta && (
          <span className={cn("report-delta", delta > 0 && "report-delta--up", delta < 0 && "report-delta--down")}>
            {delta !== 0 && <Icon name="trendUp" size={12} strokeWidth={2.4} className="report-delta__arrow" />}
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        <span className="text-small">{note}</span>
      </span>
    </div>
  );
}

function WeeklyChart({ d, start, end }: { d: DashboardNumbers; start: string; end: string }) {
  if (!d.new_leads && !d.va_signups) return <p className="report-empty">No client or VA signups in this date range.</p>;
  const clients = byWeek(d.leads_per_day.map((p) => ({ date: p.date, n: p.leads })));
  const vas = byWeek(d.vas_per_day.map((p) => ({ date: p.date, n: p.vas })));
  const weeks = mondaysBetween(start, end);
  const peak = weeks.reduce((best, w) => ((clients.get(w) ?? 0) + (vas.get(w) ?? 0) > (clients.get(best) ?? 0) + (vas.get(best) ?? 0) ? w : best), weeks[0]);
  const peakTotal = (clients.get(peak) ?? 0) + (vas.get(peak) ?? 0);
  return (
    <>
      <ColumnChart
        label="Signups per week"
        series={[
          { key: "clients", label: "Client signups", color: CLIENTS },
          { key: "vas", label: "VA signups", color: VAS },
        ]}
        data={weeks.map((w) => ({ label: formatShort(w), title: `Week of ${formatShort(w)}`, values: [clients.get(w) ?? 0, vas.get(w) ?? 0] }))}
        format={(n) => String(Math.round(n))}
        integer
      />
      <span className="text-small">
        Best week: <strong className="u-ink">{formatShort(peak)}</strong> with {peakTotal} signup{peakTotal === 1 ? "" : "s"} ({clients.get(peak) ?? 0} client
        {(clients.get(peak) ?? 0) === 1 ? "" : "s"}, {vas.get(peak) ?? 0} VA{(vas.get(peak) ?? 0) === 1 ? "" : "s"}).
      </span>
    </>
  );
}

/** Signups → booked → paid as bars that narrow with each step. */
function Funnel({ steps, footnote }: { steps: Array<{ label: string; pct: number; note: string }>; footnote: string }) {
  return (
    <div className="report-funnel">
      {steps.map((s, i) => (
        <div key={s.label} className="report-funnel__step" title={`${s.label}: ${s.note}`}>
          <div className="report-funnel__head">
            <span className="report-funnel__index">{i + 1}</span>
            <span className="u-semibold">{s.label}</span>
            <span className="report-funnel__value">{s.note}</span>
          </div>
          <div className="report-funnel__track">
            <div className="report-funnel__fill" style={{ width: `${Math.max(2, Math.min(100, s.pct))}%`, opacity: 1 - i * 0.22 }} />
          </div>
        </div>
      ))}
      <span className="text-small">{footnote}</span>
    </div>
  );
}

function Sources({ sources }: { sources: Array<{ source: string; count: number }> }) {
  const total = sources.reduce((n, s) => n + s.count, 0);
  if (!sources.length) return <p className="report-empty">No signups in this date range.</p>;
  return (
    <div className="stack stack--12">
      {[...sources]
        .sort((a, b) => b.count - a.count)
        .map((s) => (
          <BarRow
            key={s.source}
            label={SOURCE_LABELS[s.source as LeadSource] ?? s.source}
            percent={total ? (s.count / total) * 100 : 0}
            color={SERIES}
            value={`${s.count} · ${percent(s.count, total)}`}
          />
        ))}
    </div>
  );
}

/** One bar split by stage (in the pipeline's own stage colors), with a labelled legend. */
function Pipeline({ stages: counts }: { stages: Record<string, number> }) {
  const stages = getSalesStages(usePipelines().data);
  const rows = CORE_STAGES.map((st) => ({ key: st, label: stages[st].label, tone: stages[st].tone, n: counts[st] ?? 0 }));
  const total = rows.reduce((n, r) => n + r.n, 0);
  if (!total) return <p className="report-empty">No contacts yet.</p>;
  return (
    <div className="stack stack--12">
      <div className="report-stack" role="img" aria-label={rows.map((r) => `${r.label}: ${r.n}`).join(", ")}>
        {rows
          .filter((r) => r.n > 0)
          .map((r) => (
            <span
              key={r.key}
              className={cn("report-stack__seg", toneClass(r.tone))}
              style={{ flexGrow: r.n }}
              title={`${r.label}: ${r.n} (${percent(r.n, total)})`}
            />
          ))}
      </div>
      <ul className="report-legend">
        {rows.map((r) => (
          <li key={r.key} className={toneClass(r.tone)}>
            <span className="report-legend__swatch" aria-hidden="true" />
            <span className="u-grow">{r.label}</span>
            <strong className="u-ink">{r.n}</strong>
            <span className="text-small report-legend__pct">{percent(r.n, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Attention({ d }: { d: DashboardNumbers }) {
  const { update } = useAdmin();
  const tickets = Object.values(d.open_tickets ?? {}).reduce((n, v) => n + v, 0);
  const rows: Array<{ icon: IconName; tone: Tone; label: string; value: string; open: () => void }> = [
    {
      icon: "invoice",
      tone: d.overdue_invoices.count ? "red" : "green",
      label: "Overdue invoices",
      value: d.overdue_invoices.count ? `${d.overdue_invoices.count} · ${formatCents(d.overdue_invoices.total_cents)}` : "None",
      open: () => update({ tab: "payments", billingView: "inv" }),
    },
    {
      icon: "calendarCheck",
      tone: "sky",
      label: "Calls in the next 7 days",
      value: String(d.calls_next_7_days),
      open: () => update({ tab: "calendar" }),
    },
    {
      icon: "bug",
      tone: tickets ? "amber" : "green",
      label: "Open bug reports",
      value: tickets ? String(tickets) : "None",
      open: () => update({ tab: "bugs" }),
    },
  ];
  return (
    <div className="report-attention">
      {rows.map((r) => (
        <button key={r.label} type="button" className="report-attention__row" onClick={r.open}>
          <IconTile tone={r.tone} size="sm">
            <Icon name={r.icon} size={14} strokeWidth={2} />
          </IconTile>
          <span className="u-grow u-semibold">{r.label}</span>
          <span className="report-attention__value">{r.value}</span>
          <Icon name="chevronRight" size={14} className="u-muted" />
        </button>
      ))}
    </div>
  );
}
