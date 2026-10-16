"use client";

import { useState } from "react";
import { Badge, BarChart, BarRow, Field, Input, SegmentedControl } from "@/components/ui";
import { SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { daysAgo, formatLongDate, parseIsoDate, parseShortDate, toIsoDate, TODAY } from "@/lib/dates";
import { percent } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

type Range = "7" | "30" | "month" | "90" | "all" | "custom";

const PRESETS: Array<{ value: Range; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

/** Weekly signups (sample history), keyed by the Monday of each week. */
const WEEKLY: Array<[string, number]> = [
  ["Aug 24", 4], ["Aug 31", 6], ["Sep 7", 5], ["Sep 14", 9], ["Sep 21", 7], ["Sep 28", 11], ["Oct 5", 8], ["Oct 12", 12],
];

export function ReportingSection() {
  const { state } = useAdmin();
  const contacts = state.contacts;
  const [range, setRange] = useState<Range>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const earliest = contacts.reduce((min, c) => {
    const d = parseShortDate(c.signed);
    return d < min ? d : min;
  }, TODAY);

  const presetStart: Record<Exclude<Range, "custom" | "all">, Date> = {
    "7": daysAgo(6),
    "30": daysAgo(29),
    month: new Date(2026, 9, 1),
    "90": daysAgo(89),
  };
  const start = range === "custom" ? parseIsoDate(customFrom) : range === "all" ? null : presetStart[range];
  const end = range === "custom" ? (parseIsoDate(customTo) ?? TODAY) : TODAY;

  const inRange = (d: Date) => (!start || d >= start) && d <= end;
  const rows = contacts.filter((c) => inRange(parseShortDate(c.signed)));
  const total = rows.length;
  const paid = rows.filter((c) => c.stage === "paid").length;
  const reachedCall = rows.filter((c) => c.stage === "booked" || c.stage === "paid").length;

  const weeks = WEEKLY.filter(([label]) => {
    const weekStart = parseShortDate(label);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    return (!start || weekEnd >= start) && weekStart <= end;
  });

  // Switching to custom (or typing a date) starts from the currently shown range.
  const pickPreset = (value: Range) => {
    if (value === "custom") {
      setCustomFrom(toIsoDate(start ?? earliest));
      setCustomTo(toIsoDate(end));
    }
    setRange(value);
  };
  const editDate = (which: "from" | "to", value: string) => {
    if (range !== "custom") {
      setCustomFrom(toIsoDate(start ?? earliest));
      setCustomTo(toIsoDate(end));
      setRange("custom");
    }
    if (which === "from") setCustomFrom(value);
    else setCustomTo(value);
  };

  const metrics = [
    { label: "Signups", value: total },
    { label: "New paying clients", value: paid },
    { label: "Signup → booked call", value: percent(reachedCall, total) },
    { label: "Booked call → paid", value: percent(paid, reachedCall) },
    { label: "Signup → paid", value: percent(paid, total) },
    { label: "Lost", value: rows.filter((c) => c.stage === "lost").length },
  ];

  return (
    <div className="page-stack">
      <section className="toolbar toolbar--card report-filter" aria-label="Date filter">
        <Field label="Date range">
          <SegmentedControl variant="soft" label="Date range presets" options={PRESETS} value={range} onChange={pickPreset} />
        </Field>
        <div className="date-range">
          <Field label="From" htmlFor="rep-from">
            <Input id="rep-from" type="date" value={toIsoDate(start ?? earliest)} onChange={(e) => editDate("from", e.target.value)} />
          </Field>
          <span className="date-range__arrow" aria-hidden="true">
            →
          </span>
          <Field label="To" htmlFor="rep-to">
            <Input id="rep-to" type="date" value={toIsoDate(end)} onChange={(e) => editDate("to", e.target.value)} />
          </Field>
        </div>
        <p className="text-muted report-filter__summary">
          Showing{" "}
          <strong className="u-ink">
            {formatLongDate(start ?? earliest)} – {formatLongDate(end)}
          </strong>{" "}
          · {total} signups in this range
        </p>
      </section>

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
          <div className="cluster cluster--between">
            <h2 className="card-title">Signups per week</h2>
            <Badge tone="neutral" size="lg">
              Sample data
            </Badge>
          </div>
          {weeks.length === 0 ? (
            <p className="text-muted">No weekly data in this date range.</p>
          ) : (
            <BarChart
              label="Signups per week"
              data={weeks.map(([label, n]) => ({ label, value: n, color: "#0891B2" }))}
              minHeight={0}
            />
          )}
        </section>
        <section className="card report-sources">
          <h2 className="card-title">Where signups came from</h2>
          {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((source) => {
            const n = rows.filter((c) => c.source === source).length;
            return (
              <BarRow
                key={source}
                label={SOURCE_LABELS[source]!}
                percent={total ? (n / total) * 100 : 0}
                color="#0891B2"
                value={`${n} · ${percent(n, total)}`}
              />
            );
          })}
        </section>
      </div>
    </div>
  );
}
