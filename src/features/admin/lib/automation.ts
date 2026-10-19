import {
  ACTION_TYPES,
  CONDITION_STEP,
  DELAYS,
  TRIGGER_TYPES,
  type ActionStep,
  type ActionType,
  type Automation,
  type AutomationStep,
  type OptionSource,
  type TriggerType,
} from "@/data/admin";
import type { SelectOption } from "@/components/ui";
import type { AutomationIn, AutomationOut, CalendarOut, TagOut, TemplateOut } from "@/utils/api/models";
import { newFieldId } from "@/utils/mappers/forms";
import type { StageInfo } from "./contacts";

/** Everything the builder needs to list choices for a step or trigger. */
export type OptionContext = {
  templates: TemplateOut[];
  tags: TagOut[];
  stages: Record<string, StageInfo>;
  calendars: CalendarOut[];
};

/** API automation → builder draft. */
export function automationToDraft(a: AutomationOut): Automation {
  const trigger = (a.trigger ?? {}) as { type?: TriggerType; value?: string };
  return {
    id: a.id,
    name: a.name,
    on: a.isActive,
    runs: a.runs,
    trigger: { type: trigger.type ?? "form", value: trigger.value ?? "" },
    steps: (a.steps ?? []) as unknown as AutomationStep[],
  };
}

/** Builder draft → POST/PATCH body. */
export function draftToAutomation(d: Automation): AutomationIn {
  return { name: d.name.trim(), isActive: d.on, trigger: { type: d.trigger.type, value: d.trigger.value }, steps: d.steps };
}

export function optionsFor(source: OptionSource | undefined, ctx: OptionContext): SelectOption[] {
  switch (source) {
    case "template":
      // Email steps store the template id.
      return ctx.templates.map((t) => ({ value: t.id, label: t.name }));
    case "tag":
      return ctx.tags.map((t) => ({ value: t.id, label: t.name }));
    case "stage":
      return Object.entries(ctx.stages).map(([value, s]) => ({ value, label: s.label }));
    case "calendar":
      return ctx.calendars.map((c) => ({ value: c.id, label: c.name }));
    case "delay":
      return DELAYS.map((d) => ({ value: d, label: d }));
    default:
      return [];
  }
}

export const firstOption = (source: OptionSource | undefined, ctx: OptionContext) => optionsFor(source, ctx)[0]?.value ?? "";

/** "A call is booked · Discovery Call" */
export function triggerText(trigger: { type: keyof typeof TRIGGER_TYPES; value: string }, ctx: OptionContext): string {
  const meta = TRIGGER_TYPES[trigger.type];
  if (!meta.field || !trigger.value) return meta.label;
  const label = optionsFor(meta.field, ctx).find((o) => o.value === trigger.value)?.label ?? trigger.value;
  return `${meta.label} · ${label}`;
}

export function stepMeta(type: AutomationStep["type"]) {
  return type === "condition" ? CONDITION_STEP : ACTION_TYPES[type];
}

export function newStep(type: ActionType | "condition", ctx: OptionContext): AutomationStep {
  if (type === "condition") return { id: newFieldId(), type: "condition", cond: "tag", value: firstOption("tag", ctx), yes: [], no: [] };
  const field = ACTION_TYPES[type].field;
  return { id: newFieldId(), type, value: field === "text" ? "" : firstOption(field, ctx) } satisfies ActionStep;
}
