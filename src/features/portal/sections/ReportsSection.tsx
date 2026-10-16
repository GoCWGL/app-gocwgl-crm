"use client";

import { useState } from "react";
import { Checkbox, Icon, ProgressBar, buttonClass } from "@/components/ui";
import { DAILY_REPORTS, SOURCE_COLORS, type DailyReport } from "@/data/portal";
import { formatMoney, toCsvDataUrl } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";

const DAY_NAMES: Record<DailyReport["dow"], string> = {
  WED: "Wednesday",
  TUE: "Tuesday",
  MON: "Monday",
  SUN: "Sunday",
  SAT: "Saturday",
};

type MetricKey = "leads" | "calls" | "show" | "clients" | "rev" | "spend";

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "leads", label: "New leads" },
  { key: "calls", label: "Calls booked" },
  { key: "show", label: "Show-up rate" },
  { key: "clients", label: "New clients" },
  { key: "rev", label: "Revenue" },
  { key: "spend", label: "Ad spend" },
];

function formatMetric(report: DailyReport, key: MetricKey): string {
  if (key === "rev" || key === "spend") return formatMoney(report[key]);
  if (key === "show") return report.calls ? report.show + "%" : "—";
  return String(report[key]);
}

/** "+2 vs day before" and whether the change is good (spend going up is bad). */
function compare(report: DailyReport, previous: DailyReport | undefined, key: MetricKey) {
  if (!previous) return { text: "—", color: "#4F6280" };
  const diff = report[key] - previous[key];
  if (diff === 0) return { text: "same as day before", color: "#4F6280" };
  const abs = Math.abs(diff);
  const amount = key === "rev" || key === "spend" ? formatMoney(abs) : key === "show" ? abs + " pts" : abs;
  const good = diff > 0 !== (key === "spend");
  return { text: `${diff > 0 ? "+" : "−"}${amount} vs day before`, color: good ? "#047857" : "#BE185D" };
}

export function ReportsSection() {
  const { notify } = usePortal();
  const [selected, setSelected] = useState(0);
  const [emailMe, setEmailMe] = useState(true);

  const report = DAILY_REPORTS[selected];
  const previous = DAILY_REPORTS[selected + 1];
  const maxSource = Math.max(1, ...report.sources.map(([, n]) => n));

  const csv = toCsvDataUrl([
    ["Metric", "Value"],
    ["Date", `Oct ${report.day}, 2026`],
    ["New leads", report.leads],
    ["Calls booked", report.calls],
    ["Show-up rate", report.show + "%"],
    ["New clients", report.clients],
    ["Revenue", report.rev],
    ["Ad spend", report.spend],
    ...report.sources.map(([label, n]) => ["Leads from " + label, n]),
  ]);

  const toggleEmail = () => {
    notify(emailMe ? "Daily report emails turned off." : "You will get your report by email each morning.");
    setEmailMe(!emailMe);
  };

  return (
    <div className="split">
      <section className="split__side stack stack--8 report-list" aria-label="Report list">
        <div className="cluster cluster--between">
          <span className="kicker">DAILY REPORTS</span>
          <Checkbox brand className="text-small" label="Email me each morning" checked={emailMe} onChange={toggleEmail} />
        </div>
        {DAILY_REPORTS.map((r, i) => (
          <button
            key={r.day}
            type="button"
            className="report-pick"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <span className="report-pick__date">
              <span className="report-pick__dow">{r.dow}</span>
              <span className="report-pick__day">{r.day}</span>
            </span>
            <span className="stack stack--2">
              <span className="text-strong">
                {r.leads} leads · {r.clients} new client{r.clients === 1 ? "" : "s"}
              </span>
              <span className="text-small">
                {formatMoney(r.rev)} revenue · {r.calls} calls
              </span>
            </span>
          </button>
        ))}
      </section>

      <section className="split__main report-detail" aria-label="Report">
        <div className="section-head">
          <div className="stack stack--2">
            <span className="kicker">DAILY REPORT</span>
            <h2 className="report-detail__title">
              {DAY_NAMES[report.dow]}, October {report.day}
            </h2>
          </div>
          <a className={buttonClass({ variant: "outline" })} href={csv} download={`daily-report-oct-${report.day}.csv`}>
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
          {report.sources.map(([label, n]) => (
            <div className="source-row" key={label}>
              <span className="source-row__label">{label}</span>
              <ProgressBar value={(n / maxSource) * 100} color={SOURCE_COLORS[label] ?? "#0891B2"} />
              <span className="source-row__count">{n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
