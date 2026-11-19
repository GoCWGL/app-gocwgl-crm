"use client";

import { useVaAccess } from "../lib/access";
import { useMemo } from "react";
import { Button, Icon, IconTile, StatGrid } from "@/components/ui";
import { formatDuration, useNow } from "@/lib/duration";
import { VA_NAV, VA_PAGES, type VaTab } from "@/data/va";
import { formatCentsExact } from "@/utils/format/money";
import { useMyClients, useMyShift, useTimeEntries } from "@/utils/hooks/useShifts";
import { useMyAgreement, useOpenJobs } from "@/utils/hooks/useVaPortal";
import { clientLabel, hms, rangeFor } from "../lib/time";
import { useVa } from "../state/VaContext";
import { TwoStepReminder } from "@/features/account/TwoStepReminder";
import { UnpaidInvoicesCard } from "../components/UnpaidInvoicesCard";

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
  // The agreement has its own page now; while something's waiting to be signed, the dashboard points to it.
  const toSign = useMyAgreement(va).data?.pending;

  const weekSecs = (entries.data ?? []).reduce((t, e) => t + e.workedSeconds, 0);
  const weekCents = (entries.data ?? []).reduce((t, e) => t + e.earningsCents, 0);
  const running = shift.data?.shift;
  const ticking = shift.data?.state === "working";
  const elapsed = running ? running.workedSeconds + (ticking && shift.dataUpdatedAt ? Math.max(0, (now - shift.dataUpdatedAt) / 1000) : 0) : 0;
  const dash = (v: string) => (va ? v : "–");
  // The timer card only when a client uses the time tracker (turned on in their VA request), or one is running.
  const tracker = clients.data?.clients.find((c) => c.active && c.wantsTimeTracker);

  return (
    <div className="page-stack">
      <TwoStepReminder onSetUp={() => goTo("account")} />
      {toSign && (
        <section className="card va-sign-nudge">
          <IconTile tone="orange" size="lg">
            <Icon name="journal" size={20} />
          </IconTile>
          <span className="stack stack--2 u-grow">
            <span className="kicker kicker--sm">ACTION NEEDED</span>
            <strong className="va-now__title">Sign your VA agreement before you start working.</strong>
          </span>
          <Button variant="primary" onClick={() => goTo("agreement")}>
            Open agreement <Icon name="arrowRight" size={14} />
          </Button>
        </section>
      )}
      <UnpaidInvoicesCard />
      <StatGrid
        items={[
          { label: "Active clients", value: dash(String(clients.data?.clients.filter((c) => c.active).length ?? 0)), tone: "cyan" },
          { label: "Hours this week", value: dash(formatDuration(weekSecs)), tone: "purple" },
          { label: "Earned this week", value: dash(formatCentsExact(weekCents)), tone: "green" },
          { label: "Open jobs", value: dash(String(jobs.data?.length ?? 0)), tone: "orange" },
        ]}
      />

      {va && (running || tracker) && (
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
          <Button variant={running ? "outline" : "primary"} onClick={() => goTo("time", running?.client?.id ?? tracker?.id)}>
            {running ? "Open tracker" : "Start tracking"} <Icon name="arrowRight" size={14} />
          </Button>
        </section>
      )}

      <section className="card stack stack--10">
        <span className="kicker">JUMP TO</span>
        <div className="va-shortcuts">
          {SHORTCUTS.filter((tab) => tab !== "time" || tracker).map((tab) => (
            <button key={tab} type="button" className="va-shortcut" onClick={() => goTo(tab, tab === "time" ? tracker?.id : undefined)}>
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
