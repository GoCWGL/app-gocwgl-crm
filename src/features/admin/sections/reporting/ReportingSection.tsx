"use client";

import { useState } from "react";
import { BarChart, BarRow, Field, LoadState, SegmentedControl } from "@/components/ui";
import { SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { percent } from "@/lib/utils";
import type { DashboardRange } from "@/utils/api/reporting";
import { addDaysIso, formatLong, formatShort, todayIso } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useDashboard } from "@/utils/hooks/useReporting";

/** The API reports on the last 7, 30 or 90 days. */
const PRESETS: Array<{ value: "7" | "30" | "90"; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

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
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const report = useDashboard(Number(range) as DashboardRange);
  const d = report.data;
  const today = todayIso();
  const start = addDaysIso(today, -Number(range) + 1);

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
        <p className="text-muted report-filter__summary">
          Showing{" "}
          <strong className="u-ink">
            {formatLong(start)} – {formatLong(today)}
          </strong>{" "}
          · {total} signups in this range
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
