"use client";

import { Badge, Button, FormError, Icon } from "@/components/ui";
import type { ProjectOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useSetTeamComplete } from "@/utils/hooks/useDelivery";

/**
 * A launched build the client and the team each mark complete. The client marks theirs in the portal; the team marks
 * (or takes back) theirs here. Once both have, it's complete: for CRMs, new features are then quoted from $100.
 */
export function BuildCompletion({ project: p, canWrite }: { project: ProjectOut; canWrite: boolean }) {
  const save = useSetTeamComplete();
  if (p.status !== "Launched" && !p.completed && !p.teamCompletedAt) return null;

  const sides = [
    { who: "Client", at: p.clientCompletedAt, waiting: "Not yet: they mark it in their portal once they’ve checked it" },
    { who: "GoCWGL", at: p.teamCompletedAt, waiting: "Not yet" },
  ];

  return (
    <div className="inset build-completion">
      <div className="cluster cluster--nowrap">
        <span className="stack stack--2 u-grow">
          <span className="kicker kicker--sm">COMPLETION</span>
          <span className="text-small">
            {p.completed
              ? "Complete: both sides confirmed. Changes now go through Revisions, and new features are quoted."
              : "Launched. The build is complete once the client and GoCWGL have both marked it."}
          </span>
        </span>
        {p.completed && (
          <Badge tone="green" dot>
            Complete
          </Badge>
        )}
      </div>
      <div className="build-completion__sides">
        {sides.map((s) => (
          <span key={s.who} className={`build-completion__side${s.at ? " is-done" : ""}`}>
            <Icon name={s.at ? "check" : "clock"} size={14} strokeWidth={2.4} />
            <span>
              <strong>{s.who}:</strong> {s.at ? `marked complete ${formatShort(s.at)}` : s.waiting}
            </span>
          </span>
        ))}
      </div>
      {canWrite && (
        <div className="cluster cluster--8">
          {p.teamCompletedAt ? (
            <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ projectId: p.id, complete: false })}>
              Take back GoCWGL’s confirmation
            </Button>
          ) : (
            <Button size="sm" variant="primary" disabled={save.isPending} onClick={() => save.mutate({ projectId: p.id, complete: true })}>
              <Icon name="check" strokeWidth={2.6} />
              Mark complete for GoCWGL
            </Button>
          )}
        </div>
      )}
      <FormError error={save.error} />
    </div>
  );
}
