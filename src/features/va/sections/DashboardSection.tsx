"use client";

import { useVaAccess } from "../lib/access";
import { useMemo } from "react";
import { Button, Icon, IconTile, StatGrid } from "@/components/ui";
import { formatDuration, useNow } from "@/lib/duration";
import { VA_NAV, VA_PAGES, type VaTab } from "@/data/va";
import { formatCentsExact } from "@/utils/format/money";
import { useMyClients, useMyShift, useTimeEntries } from "@/utils/hooks/useShifts";
import { useOpenJobs } from "@/utils/hooks/useVaPortal";
import { clientLabel, hms, rangeFor } from "../lib/time";
import { useVa } from "../state/VaContext";

/** The pages a VA opens most, as shortcuts on the dashboard. */
const SHORTCUTS: VaTab[] = ["time", "clients", "tasks", "jobs", "training", "support"];

const ICON_FOR = Object.fromEntries(VA_NAV.flatMap((g) => g.items.map((i) => [i.tab, i.icon])));

export function DashboardSection() {
  const { goTo } = useVa();
  const va = useVaAccess().ready;
  const week = useMemo(() => rangeFor("week"), []);
  const clients = useMyClients(va);
  const shift = useMyShift(va);
  const entries = useTimeEntries(week.start.toISOString(), week.end.toISOString(), va);
  const jobs = useOpenJobs(va);
  const now = useNow(1000);

  const weekSecs = (entries.data ?? []).reduce((t, e) => t + e.workedSeconds, 0);
  const weekCents = (entries.data ?? []).reduce((t, e) => t + e.earningsCents, 0);
  const running = shift.data?.shift;
  const ticking = shift.data?.state === "working";
  const elapsed = running ? running.workedSeconds + (ticking && shift.dataUpdatedAt ? Math.max(0, (now - shift.dataUpdatedAt) / 1000) : 0) : 0;
  const dash = (v: string) => (va ? v : "–");

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Active clients", value: dash(String(clients.data?.clients.filter((c) => c.active).length ?? 0)), tone: "cyan" },
          { label: "Hours this week", value: dash(formatDuration(weekSecs)), tone: "purple" },
          { label: "Earned this week", value: dash(formatCentsExact(weekCents)), tone: "green" },
          { label: "Open jobs", value: dash(String(jobs.data?.length ?? 0)), tone: "orange" },
        ]}
      />

      {va && (
        <section className={`card va-now${running ? " is-running" : ""}`}>
          <IconTile tone={running ? "green" : "slate"} size="lg">
            <Icon name="clock" size={20} />
          </IconTile>
          <span className="stack stack--2 u-grow">
            <span className="kicker kicker--sm kicker--muted">{running ? (ticking ? "TRACKING NOW" : "ON A BREAK") : "NOT TRACKING"}</span>
            <strong className="va-now__title">
              {running ? `${running.note || "Working"} · ${clientLabel(running.client)}` : "Start your timer when you begin working."}
            </strong>
          </span>
          {running && <span className="va-now__clock">{hms(elapsed)}</span>}
          <Button variant={running ? "outline" : "primary"} onClick={() => goTo("time")}>
            {running ? "Open tracker" : "Start tracking"} <Icon name="arrowRight" size={14} />
          </Button>
        </section>
      )}

      <section className="card stack stack--10">
        <span className="kicker">JUMP TO</span>
        <div className="va-shortcuts">
          {SHORTCUTS.map((tab) => (
            <button key={tab} type="button" className="va-shortcut" onClick={() => goTo(tab)}>
              <IconTile tone="brand" size="sm">
                <Icon name={ICON_FOR[tab]} size={14} strokeWidth={1.9} />
              </IconTile>
              <span className="stack stack--2">
                <span className="text-strong">{VA_PAGES[tab].title}</span>
                <span className="text-tiny">{VA_PAGES[tab].subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
