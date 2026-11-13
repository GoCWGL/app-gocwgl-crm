"use client";

import { useEffect, useState } from "react";
import { Icon, LoadState, StatGrid } from "@/components/ui";
import type { LiveVa } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { useLiveWork } from "@/utils/hooks/useClientWork";
import { StateChip, VaPresence } from "../components/VaPresence";
import { hm } from "../lib/vaTeam";
import { usePortal } from "../state/PortalContext";

/** Client portal › Live work: who's on the clock for this business right now, and on what. */
export function LiveWorkSection() {
  const live = useLiveWork();
  const vas = live.data?.vas ?? [];
  // The API's numbers are as of the last fetch; tick running timers forward in between.
  const since = Math.max(0, (useNow() - live.dataUpdatedAt) / 1000);
  const ticking = vas.filter((v) => v.state === "working").length * since;

  return (
    <div className="page-stack">
      <LoadState
        query={live}
        loadingText="Checking who’s working…"
        isEmpty={!vas.length}
        empty="No VA is working with you yet. Once GoCWGL places a VA with your business, you’ll see their live work here."
      >
        {live.data && (
          <>
            <StatGrid
              items={[
                { label: "Working for you now", value: `${live.data.working} of ${vas.length}`, tone: live.data.working ? "green" : "slate" },
                { label: "Hours today", value: hm(live.data.todaySeconds + ticking), tone: "cyan" },
                { label: "Hours this week", value: hm(live.data.weekSeconds + ticking), tone: "purple" },
              ]}
            />
            <div className="cp-live">
              {vas.map((va) => (
                <LiveCard key={va.vaId} va={va} since={since} />
              ))}
            </div>
            <p className="text-small cp-note">
              <Icon name="eye" size={13} /> You only see work logged for your business. Updates every 30 seconds.
            </p>
          </>
        )}
      </LoadState>
    </div>
  );
}

function LiveCard({ va, since }: { va: LiveVa; since: number }) {
  const { goTo } = usePortal();
  const c = va.current;
  const extra = va.state === "working" ? since : 0;

  return (
    <article className={`card cp-live-card is-${va.state}`}>
      <header className="cp-live-card__head">
        <VaPresence id={va.vaId} name={va.name} state={va.state} />
        <div className="stack stack--2 u-grow">
          <strong className="cp-live-card__name">{va.name}</strong>
          {va.headline && <span className="text-small">{va.headline}</span>}
        </div>
        <StateChip state={va.state} />
      </header>

      {c ? (
        <div className="cp-live-card__now">
          <span className="kicker kicker--sm kicker--muted">{va.state === "on_break" ? "ON A BREAK FROM" : "WORKING ON"}</span>
          <strong>{c.note || c.category || "Work for your business"}</strong>
          {c.note && c.category && <span className="text-small">{c.category}</span>}
          <span className="cp-live-card__timer">
            <Icon name="clock" size={13} /> {hm((c?.workedSeconds ?? 0) + extra)} · started {new Date(c.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      ) : (
        <div className="cp-live-card__now is-idle">
          <span className="text-small">
            {va.lastWorkedAt ? `Last worked for you ${formatRelative(va.lastWorkedAt)}.` : "Hasn’t logged work for you yet."}
          </span>
        </div>
      )}

      <footer className="cp-live-card__foot">
        <span>
          <b>{hm(va.todaySeconds + extra)}</b> today
        </span>
        <span>
          <b>{hm(va.weekSeconds + extra)}</b> this week
        </span>
        <button type="button" className="cp-link" onClick={() => goTo("journal")}>
          VA tracker <Icon name="arrowRight" size={12} />
        </button>
      </footer>
    </article>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
