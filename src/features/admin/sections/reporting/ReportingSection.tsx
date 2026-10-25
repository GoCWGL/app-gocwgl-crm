"use client";

import { useState } from "react";
import { BarChart, BarRow, Button, Field, Input, LoadState, SegmentedControl } from "@/components/ui";
import { SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { percent } from "@/lib/utils";
import type { CustomRange, DashboardRange } from "@/utils/api/reporting";
import { addDaysIso, formatLong, formatShort, todayIso } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useDashboard } from "@/utils/hooks/useReporting";

type Preset = "7" | "30" | "90" | "custom";

/** The last 7, 30 or 90 days, or any range you pick (whole days in the business time zone). */
const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

/** About three years, like the API. */
const MAX_DAYS = 1100;

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

/** Group the API's daily leads into weeks starting on Monday (display only). */
function weekly(perDay: Array<{ date: string; leads: number }>) {
  const weeks = new Map<string, number>();
  for (const p of perDay) {
    const [y, m, d] = p.date.split("-").map(Number);
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    const monday = addDaysIso(p.date, -dow);
    weeks.set(monday, (weeks.get(monday) ?? 0) + p.leads);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function ReportingSection() {
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

  const total = d?.new_leads ?? 0;
  const sourceTotal = (d?.sources ?? []).reduce((n, s) => n + s.count, 0);
  const metrics = d
    ? [
        { label: "Signups", value: d.new_leads },
        { label: "Revenue collected", value: formatCents(d.revenue_cents) },
        { label: "Signup → booked call", value: `${d.conversion.lead_to_call_pct}%` },
        {
          label: "Booked call → paid",
          value: d.conversion.lead_to_call_pct ? `${Math.round((d.conversion.lead_to_paid_pct / d.conversion.lead_to_call_pct) * 100)}%` : "0%",
        },
        { label: "Signup → paid", value: `${d.conversion.lead_to_paid_pct}%` },
        { label: "Monthly recurring revenue", value: formatCents(d.mrr_cents) },
      ]
    : [];
  const weeks = weekly(d?.leads_per_day ?? []);

  return (
    <div className="page-stack">
      <section className="toolbar toolbar--card report-filter" aria-label="Date filter">
        <Field label="Date range">
          <SegmentedControl variant="soft" label="Date range presets" options={PRESETS} value={range} onChange={setRange} />
        </Field>
        {range === "custom" && (
          <div className="report-filter__custom">
            <Field label="From" htmlFor="report-from">
              <Input id="report-from" type="date" value={draft.start} max={draft.end || today} onChange={(e) => pick({ ...draft, start: e.target.value })} />
            </Field>
            <Field label="To" htmlFor="report-to">
              <Input id="report-to" type="date" value={draft.end} min={draft.start} max={today} onChange={(e) => pick({ ...draft, end: e.target.value })} />
            </Field>
            <div className="cluster cluster--8 report-filter__shortcuts">
              {shortcuts(today).map((s) => (
                <Button key={s.label} size="sm" variant="outline" onClick={() => pick(s.range)}>
                  {s.label}
                </Button>
              ))}
            </div>
            {draftError && draft.start && draft.end && (
              <span className="field__error report-filter__error" role="alert">
                {draftError} Showing the last valid range.
              </span>
            )}
          </div>
        )}
        <p className="text-muted report-filter__summary">
          Showing{" "}
          <strong className="u-ink">
            {formatLong(start)} – {formatLong(end)}
          </strong>{" "}
          · {total} signups in this range
          {d?.new_leads_delta != null && ` (${d.new_leads_delta >= 0 ? "+" : ""}${d.new_leads_delta}% vs the ${d.period_days} days before)`}
          {report.isFetching && !report.isPending && " · updating…"}
        </p>
      </section>

      <LoadState query={report} loadingText="Loading report…">
        <div className="stat-grid">
          {metrics.map((m) => (
            <div className="card card--tight report-metric-card" key={m.label}>
              <span className="kpi-card__label">{m.label}</span>
              <span className="metric metric--lg">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="card-row card-row--stretch">
          <section className="card report-weekly">
            <h2 className="card-title">Signups per week</h2>
            {weeks.length === 0 ? (
              <p className="text-muted">No signups in this date range.</p>
            ) : (
              <BarChart
                label="Signups per week"
                data={weeks.map(([monday, n]) => ({ label: formatShort(monday), value: n, color: "#0891B2" }))}
                minHeight={0}
              />
            )}
          </section>
          <section className="card report-sources">
            <h2 className="card-title">Where signups came from</h2>
            {(d?.sources ?? []).length === 0 && <p className="text-muted">No signups in this date range.</p>}
            {(d?.sources ?? []).map((s) => (
              <BarRow
                key={s.source}
                label={SOURCE_LABELS[s.source as LeadSource] ?? s.source}
                percent={sourceTotal ? (s.count / sourceTotal) * 100 : 0}
                color="#0891B2"
                value={`${s.count} · ${percent(s.count, sourceTotal)}`}
              />
            ))}
          </section>
        </div>
      </LoadState>
    </div>
  );
}
