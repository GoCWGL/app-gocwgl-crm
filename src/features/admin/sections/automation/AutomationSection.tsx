"use client";

import { useState } from "react";
import { Button, Icon, IconButton, IconTile, StatGrid, Toggle } from "@/components/ui";
import type { Automation } from "@/data/admin";
import { cn } from "@/lib/utils";
import { stepMeta, triggerText, type OptionContext } from "../../lib/automation";
import { getSalesStages } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { AutomationBuilder } from "./AutomationBuilder";

export function AutomationSection() {
  const { state, update } = useAdmin();
  const { automations } = state;
  const [draft, setDraft] = useState<Automation | null>(null);

  const ctx: OptionContext = {
    templates: state.templates,
    tags: state.tags,
    stages: getSalesStages(state.pipelines),
    calendars: state.calendars,
  };

  const setAutomations = (fn: (list: Automation[]) => Automation[]) => update((s) => ({ automations: fn(s.automations) }));

  return (
    <div className="page-stack">
      <div className="engine-status">
        <span className="engine-status__dot" aria-hidden="true" />
        AUTOMATION ENGINE // ONLINE
      </div>

      {draft ? (
        <AutomationBuilder draft={draft} ctx={ctx} onChange={setDraft} onClose={() => setDraft(null)} />
      ) : (
        <>
          <StatGrid
            plain
            items={[
              { label: "Active automations", value: `${automations.filter((a) => a.on).length} of ${automations.length}` },
              { label: "Runs this month", value: automations.reduce((n, a) => n + a.runs, 0) },
              { label: "Steps automated", value: automations.reduce((n, a) => n + a.steps.length, 0) },
            ]}
          />

          <div className="section-head">
            <div className="stack stack--2">
              <h2 className="section-title">Your automations</h2>
              <span className="text-muted">Each one runs on its own when its trigger happens</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setDraft({ id: 0, name: "", on: true, runs: 0, trigger: { type: "form", value: "" }, steps: [] })}
            >
              <Icon name="plus" strokeWidth={2.4} />
              Create automation
            </Button>
          </div>

          <div className="tile-grid tile-grid--wide">
            {automations.map((a) => (
              <article key={a.id} className={cn("card automation-card", !a.on && "automation-card--off")}>
                <div className="cluster cluster--nowrap automation-card__head">
                  <IconTile tone="amber" size="lg">
                    <Icon name="bolt" size={18} strokeWidth={1.8} />
                  </IconTile>
                  <div className="stack stack--2 u-grow">
                    <h3 className="card-title u-strong">{a.name}</h3>
                    <span className="text-small">
                      When: <strong className="u-ink-soft">{triggerText(a.trigger, ctx)}</strong>
                    </span>
                  </div>
                  <Toggle
                    label={`Turn ${a.name} on or off`}
                    checked={a.on}
                    onChange={() => setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, on: !x.on } : x)))}
                  />
                </div>
                <div className="inset inset--soft step-chain">
                  {a.steps.map((st) => {
                    const meta = stepMeta(st.type);
                    return (
                      <span className="step-chip" title={meta.label} key={st.id}>
                        <IconTile tone={meta.tone} size="xs">
                          <Icon name={meta.icon} size={13} />
                        </IconTile>
                        {meta.short}
                      </span>
                    );
                  })}
                  {a.steps.length === 0 && <span className="text-small">No steps yet</span>}
                </div>
                <div className="cluster cluster--8 cluster--nowrap">
                  <span className="text-small u-grow">
                    {a.steps.length} steps · {a.runs} runs this month · {a.on ? "Active" : "Paused"}
                  </span>
                  <Button size="sm" onClick={() => setDraft(structuredClone(a))}>
                    Edit
                  </Button>
                  <IconButton label={`Delete ${a.name}`} size="lg" onClick={() => setAutomations((list) => list.filter((x) => x.id !== a.id))}>
                    <Icon name="trash" size={14} />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
