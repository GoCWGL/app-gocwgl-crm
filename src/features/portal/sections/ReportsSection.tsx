"use client";

import { useState } from "react";
import { Checkbox, Icon, LoadState, ProgressBar, SegmentedControl, buttonClass } from "@/components/ui";
import { SOURCE_COLORS, type RangeKey } from "@/data/portal";
import { toCsvDataUrl } from "@/lib/utils";
import type { ReportOut } from "@/utils/api/models";
import type { Range } from "@/utils/api/portal";
import { formatLong } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { usePortalReports } from "@/utils/hooks/usePortal";
import { useMyNotifications, useSetMyNotifications } from "@/utils/hooks/useUsers";
import { usePortal } from "../state/PortalContext";

type MetricKey = "leads" | "calls" | "showRate" | "clients" | "revenueCents" | "spendCents";

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "leads", label: "New leads" },
  { key: "calls", label: "Calls booked" },
  { key: "showRate", label: "Show-up rate" },
  { key: "clients", label: "New clients" },
  { key: "revenueCents", label: "Revenue" },
  { key: "spendCents", label: "Ad spend" },
];

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const isMoney = (key: MetricKey) => key === "revenueCents" || key === "spendCents";

function formatMetric(report: ReportOut, key: MetricKey): string {
  if (isMoney(key)) return formatCents(report[key]);
  if (key === "showRate") return report.calls ? report.showRate + "%" : "—";
  return String(report[key]);
}

/** "+2 vs day before" and whether the change is good (spend going up is bad). */
function compare(report: ReportOut, previous: ReportOut | undefined, key: MetricKey) {
  if (!previous) return { text: "—", color: "#4F6280" };
  const diff = report[key] - previous[key];
  if (diff === 0) return { text: "same as day before", color: "#4F6280" };
  const abs = Math.abs(diff);
  const amount = isMoney(key) ? formatCents(abs) : key === "showRate" ? abs + " pts" : abs;
  const good = diff > 0 !== (key === "spendCents");
  return { text: `${diff > 0 ? "+" : "−"}${amount} vs day before`, color: good ? "#047857" : "#BE185D" };
}

const weekday = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${iso}T12:00:00`)).toUpperCase();
const weekdayLong = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${iso}T12:00:00`));

export function ReportsSection() {
  const { notify, readOnly } = usePortal();
  const [range, setRange] = useState<RangeKey>("30");
  const reportsQuery = usePortalReports(Number(range) as Range);
  // Newest first.
  const reports = [...(reportsQuery.data ?? [])].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  const [selected, setSelected] = useState(0);
  const prefs = useMyNotifications();
  const savePrefs = useSetMyNotifications();
  const emailMe = prefs.data?.prefs?.report ?? true;

  const report = reports[Math.min(selected, Math.max(0, reports.length - 1))];
  const previous = reports[Math.min(selected, reports.length - 1) + 1];
  const sources = (report?.sources ?? []) as Array<[string, number]>;
  const maxSource = Math.max(1, ...sources.map(([, n]) => n));

  const csv = report
    ? toCsvDataUrl([
        ["Metric", "Value"],
        ["Date", formatLong(report.reportDate)],
        ["New leads", report.leads],
        ["Calls booked", report.calls],
        ["Show-up rate", report.showRate + "%"],
        ["New clients", report.clients],
        ["Revenue", (report.revenueCents / 100).toFixed(2)],
        ["Ad spend", (report.spendCents / 100).toFixed(2)],
        ...sources.map(([label, n]) => ["Leads from " + label, n]),
      ])
    : "";

  const toggleEmail = () =>
    savePrefs.mutate(
      { ...(prefs.data?.prefs ?? {}), report: !emailMe },
      { onSuccess: () => notify(emailMe ? "Daily report emails turned off." : "You will get your report by email each morning.") },
    );

  return (
    <div className="split">
      <section className="split__side stack stack--8 report-list" aria-label="Report list">
        <div className="cluster cluster--between">
          <span className="kicker">DAILY REPORTS</span>
          {!readOnly && (
            <Checkbox
              brand
              className="text-small"
              label="Email me each morning"
              checked={emailMe}
              disabled={prefs.isPending || savePrefs.isPending}
              onChange={toggleEmail}
            />
          )}
        </div>
        <SegmentedControl label="Reports from the last" options={RANGES} value={range} onChange={(r) => (setRange(r), setSelected(0))} size="sm" />
        <LoadState query={reportsQuery} inline isEmpty={!reports.length} empty="No reports in this period yet.">
        {reports.map((r, i) => (
          <button
            key={r.reportDate}
            type="button"
            className="report-pick"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <span className="report-pick__date">
              <span className="report-pick__dow">{weekday(r.reportDate)}</span>
              <span className="report-pick__day">{Number(r.reportDate.slice(8, 10))}</span>
            </span>
            <span className="stack stack--2">
              <span className="text-strong">
                {r.leads} leads · {r.clients} new client{r.clients === 1 ? "" : "s"}
              </span>
              <span className="text-small">
                {formatCents(r.revenueCents)} revenue · {r.calls} calls
              </span>
            </span>
          </button>
        ))}
        </LoadState>
      </section>

      {report && (
      <section className="split__main report-detail" aria-label="Report">
        <div className="section-head">
          <div className="stack stack--2">
            <span className="kicker">DAILY REPORT</span>
            <h2 className="report-detail__title">{weekdayLong(report.reportDate)}</h2>
          </div>
          <a className={buttonClass({ variant: "outline" })} href={csv} download={`daily-report-${report.reportDate}.csv`}>
            <Icon name="download" size={14} />
            Download
          </a>
        </div>

        <div className="report-detail__metrics">
          {METRICS.map(({ key, label }) => {
            const delta = compare(report, previous, key);
            return (
              <div className="inset report-metric" key={key}>
                <span className="stat-tile__label">{label}</span>
                <span className="stat-tile__value">{formatMetric(report, key)}</span>
                <span className="report-metric__delta" style={{ color: delta.color }}>
                  {delta.text}
                </span>
              </div>
            );
          })}
        </div>

        <div className="inset inset--brand">
          <span className="kicker kicker--brand">WHAT THIS MEANS</span>
          {report.notes.length === 0 && <span className="text-small">No notes for this day.</span>}
          {report.notes.map((note) => (
            <div className="report-note" key={note}>
              <span className="report-note__arrow" aria-hidden="true">
                →
              </span>
              <span>{note}</span>
            </div>
          ))}
        </div>

        <div className="stack stack--8">
          <span className="kicker">LEADS BY SOURCE</span>
          {sources.length === 0 && <span className="text-small">No source breakdown for this day.</span>}
          {sources.map(([label, n]) => (
            <div className="source-row" key={label}>
              <span className="source-row__label">{label}</span>
              <ProgressBar value={(n / maxSource) * 100} color={SOURCE_COLORS[label] ?? "#0891B2"} />
              <span className="source-row__count">{n}</span>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
