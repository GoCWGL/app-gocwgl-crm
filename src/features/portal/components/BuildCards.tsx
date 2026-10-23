"use client";

import { Badge, Button, Icon, IconTile, ProgressBar } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import type { ProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { usePortal } from "../state/PortalContext";

const STATUS_TONES: Record<string, Tone> = {
  "On track": "green",
  "At risk": "pink",
  "Waiting on client": "amber",
  Launched: "green",
};

/** The client's funnel or CRM builds, each opening its checklist on Build progress. */
export function BuildCards({ builds, icon }: { builds: ProjectOut[]; icon: "funnel" | "users" }) {
  const { update } = usePortal();
  return (
    <div className="build-cards">
      {builds.map((b) => {
        const tasks = b.phases.flatMap((ph) => ph.tasks);
        const current = b.phases.find((ph) => ph.tasks.some((t) => !t.done));
        const launched = b.status === "Launched";
        return (
          <article className="card build-card" key={b.id}>
            <div className="cluster cluster--nowrap">
              <IconTile tone={launched ? "green" : icon === "users" ? "purple" : "orange"} size="lg">
                <Icon name={icon} size={18} />
              </IconTile>
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{b.package}</span>
                <span className="text-small">
                  Started {formatShort(b.startDate)}
                  {b.dueDate && ` · Target launch ${formatShort(b.dueDate)}`}
                </span>
              </div>
              <Badge tone={STATUS_TONES[b.status] ?? "neutral"} mono dot>
                {b.status.toUpperCase()}
              </Badge>
            </div>
            <div className="stack stack--6">
              <ProgressBar value={b.progress} variant="glow" label={`${b.package} build progress`} />
              <span className="text-small">
                {b.progress}% · {tasks.filter((t) => t.done).length} of {tasks.length} tasks done
                {current && !launched && ` · Now: ${current.name}`}
              </span>
            </div>
            <Button variant="outline" size="sm" className="u-self-start" onClick={() => update({ tab: "build", buildId: b.id })}>
              See build progress
            </Button>
          </article>
        );
      })}
    </div>
  );
}
