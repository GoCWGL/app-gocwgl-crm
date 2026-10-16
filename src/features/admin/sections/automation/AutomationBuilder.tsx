"use client";

import { useState } from "react";
import { Button, Field, Icon, IconButton, IconTile, Input, Select, Toggle } from "@/components/ui";
import {
  ACTION_TYPES,
  CONDITION_STEP,
  CONDITION_TYPES,
  TRIGGER_TYPES,
  type ActionStep,
  type ActionType,
  type Automation,
  type AutomationStep,
  type ConditionStep,
  type ConditionType,
  type TriggerType,
} from "@/data/admin";
import { moveItem, newId } from "@/lib/utils";
import { firstOption, newStep, optionsFor, stepMeta, type OptionContext } from "../../lib/automation";
import { useAdmin } from "../../state/AdminContext";

type BuilderProps = {
  draft: Automation;
  ctx: OptionContext;
  onChange: (draft: Automation) => void;
  onClose: () => void;
};

/**
 * Where the "add step" menu is open:
 *   "main:<index>"          insert into the main flow at index
 *   "branch:<step>:yes|no"  append to a condition's branch
 */
type MenuAt = string;

export function AutomationBuilder({ draft, ctx, onChange, onClose }: BuilderProps) {
  const { update } = useAdmin();
  const [menuAt, setMenuAt] = useState<MenuAt>("");
  const [error, setError] = useState("");

  const set = (patch: Partial<Automation>) => {
    onChange({ ...draft, ...patch });
    setError("");
  };
  const setSteps = (steps: AutomationStep[]) => set({ steps });
  const patchStep = (i: number, patch: Partial<ActionStep> | Partial<ConditionStep>) =>
    setSteps(draft.steps.map((s, k) => (k === i ? ({ ...s, ...patch } as AutomationStep) : s)));
  const toggleMenu = (at: MenuAt) => setMenuAt(menuAt === at ? "" : at);

  const insert = (type: ActionType | "condition") => {
    const step = newStep(type, ctx);
    if (menuAt.startsWith("branch:")) {
      const [, index, branch] = menuAt.split(":") as [string, string, "yes" | "no"];
      setSteps(
        draft.steps.map((s, k) => (k === Number(index) && s.type === "condition" ? { ...s, [branch]: [...s[branch], step as ActionStep] } : s)),
      );
    } else {
      const at = Number(menuAt.split(":")[1]);
      const steps = draft.steps.slice();
      steps.splice(at, 0, step);
      setSteps(steps);
    }
    setMenuAt("");
  };

  const save = () => {
    if (!draft.name.trim()) return setError("Give your automation a name before saving.");
    if (!draft.steps.length) return setError("Add at least one step with the + button.");
    const saved = { ...draft, name: draft.name.trim() };
    update((s) => ({
      automations: draft.id ? s.automations.map((a) => (a.id === draft.id ? saved : a)) : [...s.automations, { ...saved, id: newId() }],
    }));
    onClose();
  };

  const trigger = TRIGGER_TYPES[draft.trigger.type];

  /** "+" connector between steps that opens the step menu. */
  const addButton = (at: MenuAt) => (
    <>
      <div className="flow-connector">
        <span className="flow-connector__line" />
        <button type="button" className="flow-connector__add" onClick={() => toggleMenu(at)} aria-label="Add a step here" title="Add step">
          +
        </button>
        <span className="flow-connector__line" />
      </div>
      {menuAt === at && <StepMenu inBranch={false} onPick={insert} />}
    </>
  );

  return (
    <div className="page-stack">
      <div className="toolbar toolbar--card">
        <Button variant="soft" onClick={onClose}>
          <Icon name="arrowLeft" size={14} strokeWidth={2.4} />
          All automations
        </Button>
        <label className="sr-only" htmlFor="au-name">
          Automation name
        </label>
        <input id="au-name" className="title-input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name your automation" />
        <Toggle showLabel label={draft.on ? "Active" : "Paused"} checked={draft.on} onChange={(on) => set({ on })} />
        <Button variant="primary" onClick={save}>
          Save automation
        </Button>
      </div>

      <div className="flow">
        <div className="flow__column">
          <section className="flow-card flow-card--trigger">
            <div className="cluster cluster--nowrap">
              <IconTile tone="amber" size="md">
                <Icon name="bolt" size={17} strokeWidth={1.8} />
              </IconTile>
              <div className="stack stack--2">
                <span className="kicker kicker--amber">TRIGGER</span>
                <span className="text-strong">Start this automation when…</span>
              </div>
            </div>
            <label className="sr-only" htmlFor="au-trig">
              Trigger
            </label>
            <Select
              id="au-trig"
              className="u-semibold"
              value={draft.trigger.type}
              options={(Object.keys(TRIGGER_TYPES) as TriggerType[]).map((k) => ({ value: k, label: TRIGGER_TYPES[k].label }))}
              onChange={(e) => {
                const type = e.target.value as TriggerType;
                set({ trigger: { type, value: firstOption(TRIGGER_TYPES[type].field, ctx) } });
              }}
            />
            {trigger.field && (
              <Field label={trigger.fieldLabel} htmlFor="au-trig-val">
                <Select
                  id="au-trig-val"
                  value={draft.trigger.value}
                  options={optionsFor(trigger.field, ctx)}
                  onChange={(e) => set({ trigger: { ...draft.trigger, value: e.target.value } })}
                />
              </Field>
            )}
          </section>

          {addButton("main:0")}

          {draft.steps.map((step, i) => (
            <div className="flow__step" key={step.id}>
              {step.type === "condition" ? (
                <ConditionCard
                  step={step}
                  index={i}
                  count={draft.steps.length}
                  ctx={ctx}
                  menuAt={menuAt}
                  onToggleMenu={toggleMenu}
                  onPick={insert}
                  onPatch={(p) => patchStep(i, p)}
                  onMove={(to) => setSteps(moveItem(draft.steps, i, to))}
                  onDelete={() => setSteps(draft.steps.filter((_, k) => k !== i))}
                />
              ) : (
                <section className="flow-card">
                  <StepHeader
                    step={step}
                    index={i}
                    count={draft.steps.length}
                    onMove={(to) => setSteps(moveItem(draft.steps, i, to))}
                    onDelete={() => setSteps(draft.steps.filter((_, k) => k !== i))}
                  />
                  <ActionField step={step} ctx={ctx} onValue={(value) => patchStep(i, { value })} />
                </section>
              )}
              {addButton(`main:${i + 1}`)}
            </div>
          ))}

          <div className="flow__end">
            <span className="flow__end-dot" />
            End of automation
          </div>
          {error && (
            <p className="text-error flow__error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Pieces
function StepMenu({ inBranch, onPick, compact }: { inBranch: boolean; onPick: (t: ActionType | "condition") => void; compact?: boolean }) {
  const types: Array<ActionType | "condition"> = [...(Object.keys(ACTION_TYPES) as ActionType[]), ...(inBranch ? [] : (["condition"] as const))];
  return (
    <div className={compact ? "step-menu step-menu--compact" : "step-menu"}>
      {types.map((t) => {
        const meta = t === "condition" ? CONDITION_STEP : ACTION_TYPES[t];
        return (
          <button key={t} type="button" className="step-menu__item" onClick={() => onPick(t)}>
            <IconTile tone={meta.tone} size={compact ? "xs" : "sm"}>
              <Icon name={meta.icon} size={compact ? 12 : 14} />
            </IconTile>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function StepHeader({
  step,
  index,
  count,
  onMove,
  onDelete,
}: {
  step: AutomationStep;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onDelete: () => void;
}) {
  const meta = stepMeta(step.type);
  const isCondition = step.type === "condition";
  return (
    <div className="cluster cluster--nowrap">
      <IconTile tone={meta.tone} size="md">
        <Icon name={meta.icon} size={17} strokeWidth={1.9} />
      </IconTile>
      <div className="stack stack--2 u-grow">
        <span className={isCondition ? "kicker kicker--violet" : "kicker kicker--muted"}>
          STEP {index + 1}
          {isCondition && " · CONDITION"}
        </span>
        <span className="text-strong">{isCondition ? "If / else" : meta.label}</span>
      </div>
      <IconButton label="Move step up" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <Icon name="chevronUp" size={13} strokeWidth={2.4} />
      </IconButton>
      <IconButton label="Move step down" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
        <Icon name="chevronDown" size={13} strokeWidth={2.4} />
      </IconButton>
      <IconButton label={isCondition ? "Delete condition" : "Delete step"} danger onClick={onDelete}>
        <Icon name="trash" size={13} />
      </IconButton>
    </div>
  );
}

function ActionField({ step, ctx, onValue, size }: { step: ActionStep; ctx: OptionContext; onValue: (v: string) => void; size?: "sm" }) {
  const meta = ACTION_TYPES[step.type];
  const input =
    meta.field === "text" ? (
      <Input size={size} aria-label={meta.fieldLabel} value={step.value} placeholder={meta.placeholder} onChange={(e) => onValue(e.target.value)} />
    ) : (
      <Select size={size} aria-label={meta.fieldLabel} value={step.value} options={optionsFor(meta.field, ctx)} onChange={(e) => onValue(e.target.value)} />
    );
  if (size) return input;
  return <Field label={meta.fieldLabel}>{input}</Field>;
}

type ConditionCardProps = {
  step: ConditionStep;
  index: number;
  count: number;
  ctx: OptionContext;
  menuAt: MenuAt;
  onToggleMenu: (at: MenuAt) => void;
  onPick: (t: ActionType | "condition") => void;
  onPatch: (p: Partial<ConditionStep>) => void;
  onMove: (to: number) => void;
  onDelete: () => void;
};

function ConditionCard({ step, index, count, ctx, menuAt, onToggleMenu, onPick, onPatch, onMove, onDelete }: ConditionCardProps) {
  const cond = CONDITION_TYPES[step.cond];

  return (
    <>
      <section className="flow-card flow-card--condition">
        <StepHeader step={step} index={index} count={count} onMove={onMove} onDelete={onDelete} />
        <div className="cluster cluster--8">
          <span className="u-strong kicker--violet">If</span>
          <Select
            className="u-grow input--auto"
            aria-label="Condition"
            value={step.cond}
            options={(Object.keys(CONDITION_TYPES) as ConditionType[]).map((k) => ({ value: k, label: CONDITION_TYPES[k].label }))}
            onChange={(e) => {
              const c = e.target.value as ConditionType;
              onPatch({ cond: c, value: CONDITION_TYPES[c].field ? firstOption(CONDITION_TYPES[c].field, ctx) : "" });
            }}
          />
          {cond.field && (
            <Select
              className="u-grow input--auto"
              aria-label="Condition value"
              value={step.value}
              options={optionsFor(cond.field, ctx)}
              onChange={(e) => onPatch({ value: e.target.value })}
            />
          )}
        </div>
      </section>

      <div className="flow-connector">
        <span className="flow-connector__line" />
      </div>

      <div className="branches">
        {(["yes", "no"] as const).map((branch) => {
          const at = `branch:${index}:${branch}`;
          const steps = step[branch];
          const setBranch = (list: ActionStep[]) => onPatch({ [branch]: list });
          return (
            <div key={branch} className={`branch branch--${branch}`}>
              <span className="branch__label">{branch === "yes" ? "Yes" : "No"}</span>
              {steps.map((s, j) => {
                const meta = ACTION_TYPES[s.type];
                return (
                  <div className="branch__step" key={s.id}>
                    <div className="cluster cluster--8 cluster--nowrap">
                      <IconTile tone={meta.tone} size="xs">
                        <Icon name={meta.icon} size={14} />
                      </IconTile>
                      <span className="u-grow text-strong">{meta.label}</span>
                      <IconButton label="Delete step" size="sm" danger onClick={() => setBranch(steps.filter((_, q) => q !== j))}>
                        <Icon name="close" size={12} strokeWidth={2.2} />
                      </IconButton>
                    </div>
                    <ActionField
                      step={s}
                      ctx={ctx}
                      size="sm"
                      onValue={(value) => setBranch(steps.map((x, q) => (q === j ? { ...x, value } : x)))}
                    />
                  </div>
                );
              })}
              {steps.length === 0 && <span className="text-small">No steps — the contact just continues.</span>}
              <Button variant="dashed" size="sm" block onClick={() => onToggleMenu(at)}>
                + Add step
              </Button>
              {menuAt === at && <StepMenu inBranch compact onPick={onPick} />}
            </div>
          );
        })}
      </div>
      <div className="flow__join">
        <span>Both paths continue here</span>
      </div>
    </>
  );
}
