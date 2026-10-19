import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Email, form and automation options (pure UI constants). Records come from the API.
// =============================================================================

// -------------------------------------------------------------------- Email
export type TemplateKind = "welcome" | "reminder" | "followup" | "payment" | "other";

export const TEMPLATE_KINDS: Record<TemplateKind, { label: string; icon: IconName; tone: Tone }> = {
  welcome: { label: "Welcome", icon: "mail", tone: "cyan" },
  reminder: { label: "Call reminder", icon: "clock", tone: "amber" },
  followup: { label: "Follow-up", icon: "message", tone: "purple" },
  payment: { label: "Payment thank-you", icon: "dollar", tone: "green" },
  other: { label: "Other", icon: "form", tone: "neutral" },
};

/** Placeholders you can insert into an email body. */
export const MERGE_FIELDS = [
  { value: "{first_name}", label: "First name" },
  { value: "{last_name}", label: "Last name" },
  { value: "{email}", label: "Email" },
  { value: "[YOUR BOOKING LINK]", label: "Booking link" },
];

/** Sent emails are "Queued" until the background worker sends them. Open/click tracking is backend item F-5. */
export type EmailStatus = "Queued" | "Sent" | "Failed";

export const EMAIL_STATUS_TONES: Record<EmailStatus, Tone> = {
  Queued: "amber",
  Sent: "green",
  Failed: "red",
};

// -------------------------------------------------------------------- Forms
export type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";

/** `html` is the <input type> used in the preview ("" = not an <input>). */
export const FIELD_TYPES: Record<FieldType, { label: string; html: string; icon: IconName }> = {
  text: { label: "Short text", html: "text", icon: "textShort" },
  email: { label: "Email", html: "email", icon: "mail" },
  phone: { label: "Phone", html: "tel", icon: "phone" },
  textarea: { label: "Long text", html: "", icon: "textLong" },
  select: { label: "Dropdown", html: "", icon: "dropdown" },
  checkbox: { label: "Checkbox", html: "", icon: "checkbox" },
  date: { label: "Date", html: "date", icon: "calendar" },
  number: { label: "Number", html: "number", icon: "hash" },
};

/** A field in the form builder (same shape the API stores; ids are short strings). */
export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  ph: string;
  req: boolean;
  /** Dropdown choices, comma separated. */
  opts: string;
  /** Custom question saved to the contact under `key`. */
  custom?: boolean;
  key?: string;
};

/** The form builder's draft ("" id = not saved yet). utils/mappers/forms.ts converts it to and from the API. */
export type LeadForm = {
  id: string;
  name: string;
  on: boolean;
  subs: number;
  button: string;
  success: string;
  stage: "lead" | "booked" | "paid" | "lost";
  /** Tag id ("" = none). */
  tag: string;
  thanksMode?: "message" | "redirect";
  redirectUrl?: string;
  fields: FormField[];
};

// -------------------------------------------------------------- Automations
/** What kind of options a step / trigger value is chosen from. */
export type OptionSource = "template" | "tag" | "stage" | "calendar" | "delay" | "text";

export type ActionType = "email" | "sms" | "wait" | "tag" | "removeTag" | "stage" | "notify";

export const ACTION_TYPES: Record<
  ActionType,
  { label: string; short: string; field: OptionSource; fieldLabel: string; placeholder?: string; icon: IconName; tone: Tone }
> = {
  email: { label: "Send email", short: "Email", field: "template", fieldLabel: "Email template", icon: "mail", tone: "cyan" },
  // Texting isn't built yet (backend F-3): the step can be added but is skipped when it runs.
  sms: { label: "Send text message (not available yet)", short: "Text", field: "text", fieldLabel: "Message", placeholder: "Type the text message", icon: "message", tone: "teal" },
  wait: { label: "Wait", short: "Wait", field: "delay", fieldLabel: "Wait for", icon: "clock", tone: "amber" },
  tag: { label: "Add tag", short: "Add tag", field: "tag", fieldLabel: "Tag to add", icon: "tag", tone: "purple" },
  removeTag: { label: "Remove tag", short: "Remove tag", field: "tag", fieldLabel: "Tag to remove", icon: "tagMinus", tone: "pink" },
  stage: { label: "Move pipeline stage", short: "Move stage", field: "stage", fieldLabel: "Move contact to", icon: "pipeline", tone: "orange" },
  notify: { label: "Notify my team", short: "Notify", field: "text", fieldLabel: "Notification", placeholder: "What should the team see?", icon: "bell", tone: "lime" },
};

export const CONDITION_STEP = { label: "If / else condition", short: "If / else", icon: "branch" as IconName, tone: "purple" as Tone };

export type TriggerType = "form" | "booked" | "paid" | "tagAdded" | "stageChanged" | "noBooking";

export const TRIGGER_TYPES: Record<TriggerType, { label: string; field?: OptionSource; fieldLabel?: string }> = {
  form: { label: "Landing page form is submitted" },
  booked: { label: "A call is booked", field: "calendar", fieldLabel: "On calendar" },
  paid: { label: "A payment is received" },
  tagAdded: { label: "A tag is added to a contact", field: "tag", fieldLabel: "Tag" },
  stageChanged: { label: "A contact moves pipeline stage", field: "stage", fieldLabel: "Moved to" },
  noBooking: { label: "A lead has not booked a call", field: "delay", fieldLabel: "After" },
};

export type ConditionType = "tag" | "stage" | "opened" | "booked" | "paid";

export const CONDITION_TYPES: Record<ConditionType, { label: string; field?: OptionSource }> = {
  tag: { label: "Contact has tag", field: "tag" },
  stage: { label: "Contact is in pipeline stage", field: "stage" },
  // Open tracking isn't built yet (backend F-5): this condition is always "no" for now.
  opened: { label: "Contact opened email (coming soon)", field: "template" },
  booked: { label: "Contact has booked a call" },
  paid: { label: "Contact has paid" },
};

export const DELAYS = ["1 hour", "1 day", "2 days", "3 days", "1 week"];

export type ActionStep = { id: string; type: ActionType; value: string };
export type ConditionStep = { id: string; type: "condition"; cond: ConditionType; value: string; yes: ActionStep[]; no: ActionStep[] };
export type AutomationStep = ActionStep | ConditionStep;

/** The automation builder's draft ("" id = not saved yet); the API stores the same trigger and step shapes. */
export type Automation = {
  id: string;
  name: string;
  on: boolean;
  runs: number;
  trigger: { type: TriggerType; value: string };
  steps: AutomationStep[];
};
