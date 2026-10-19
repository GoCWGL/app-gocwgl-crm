"use client";

import { Badge, Button, FormError, LoadState } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { canWriteCrm } from "@/utils/auth/session";
import { formatRelative, formatShortDateTime } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useAutomationRuns, useCancelAutomationRun } from "@/utils/hooks/useMarketing";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../../lib/contacts";

const RUN_TONES: Record<string, Tone> = { active: "cyan", waiting: "amber", completed: "green", cancelled: "slate", failed: "red" };

/** Each time this automation started for a contact, what it did, and what it's waiting on. */
export function AutomationRuns({ automationId }: { automationId: string }) {
  const canWrite = canWriteCrm(useMe().data);
  const runs = useAutomationRuns(automationId);
  const contacts = useAllContacts().data ?? [];
  const cancel = useCancelAutomationRun();
  const nameOf = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    return c ? contactName(c) : "Contact";
  };

  return (
    <section className="card">
      <span className="kicker">RECENT RUNS</span>
      <FormError error={cancel.error} />
      <LoadState query={runs} isEmpty={!runs.data?.length} empty="This automation hasn’t run yet.">
        <div>
          {runs.data?.map((r) => {
            const open = r.status === "active" || r.status === "waiting";
            const last = (r.log as Array<{ result?: string }>).at(-1)?.result;
            return (
              <div className="list-row list-row--nowrap" key={r.id}>
                <div className="stack stack--2 u-grow">
                  <span className="u-strong">{nameOf(r.contactId)}</span>
                  <span className="text-small">
                    Started {formatRelative(r.createdAt)} · {r.stepsLeft} steps left
                    {r.nextRunAt && ` · next step ${formatShortDateTime(r.nextRunAt)}`}
                    {last && ` · ${last}`}
                  </span>
                </div>
                <Badge tone={RUN_TONES[r.status] ?? "neutral"}>{r.status}</Badge>
                {canWrite && open && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate({ runId: r.id, automationId })}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </LoadState>
    </section>
  );
}
