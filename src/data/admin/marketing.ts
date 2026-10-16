import type { IconName } from "@/components/ui";
import type { Tone } from "@/lib/tones";

// =============================================================================
// Email, forms and automations.
// =============================================================================

// -------------------------------------------------------------------- Email
export type TemplateKind = "welcome" | "reminder" | "followup" | "payment" | "other";

export type EmailTemplate = {
  id: number;
  kind: TemplateKind;
  /** Built-in templates cannot be deleted. */
  starter?: boolean;
  name: string;
  subject: string;
  body: string;
};

export const TEMPLATE_KINDS: Record<TemplateKind, { label: string; icon: IconName; tone: Tone }> = {
  welcome: { label: "Welcome", icon: "mail", tone: "cyan" },
  reminder: { label: "Call reminder", icon: "clock", tone: "amber" },
  followup: { label: "Follow-up", icon: "message", tone: "purple" },
  payment: { label: "Payment thank-you", icon: "dollar", tone: "green" },
  other: { label: "Other", icon: "form", tone: "neutral" },
};

export const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 1, kind: "welcome", starter: true, name: "Welcome",
    subject: "Welcome, {first_name}! Book your free call",
    body: "Hi {first_name},\n\nThanks for signing up! Pick a time for your free discovery call here: [YOUR BOOKING LINK]\n\nTalk soon,\n[Your Name]",
  },
  {
    id: 2, kind: "reminder", starter: true, name: "Call reminder",
    subject: "Reminder: our call is coming up",
    body: "Hi {first_name},\n\nJust a reminder about our discovery call. If you need to reschedule, use this link: [YOUR BOOKING LINK]\n\nSee you soon,\n[Your Name]",
  },
  {
    id: 3, kind: "followup", starter: true, name: "Follow-up",
    subject: "Still want to chat, {first_name}?",
    body: "Hi {first_name},\n\nI noticed you have not booked your call yet. Grab a time that works for you: [YOUR BOOKING LINK]\n\nBest,\n[Your Name]",
  },
  {
    id: 4, kind: "payment", starter: true, name: "Payment thank-you",
    subject: "Thanks for subscribing, {first_name}!",
    body: "Hi {first_name},\n\nThank you for subscribing! Here is what happens next…\n\nWelcome aboard,\n[Your Name]",
  },
];

/** Placeholders you can insert into an email body. */
export const MERGE_FIELDS = [
  { value: "{first_name}", label: "First name" },
  { value: "{last_name}", label: "Last name" },
  { value: "{email}", label: "Email" },
  { value: "[YOUR BOOKING LINK]", label: "Booking link" },
];

export type EmailStatus = "Opened" | "Clicked" | "Delivered" | "Sent";

export type SentEmail = {
  id: number;
  to: string;
  /** Contact id, or 0 when sent to a group. */
  cid: number;
  count?: number;
  subject: string;
  preview: string;
  date: string;
  status: EmailStatus;
};

export const EMAIL_STATUS_TONES: Record<EmailStatus, Tone> = {
  Opened: "cyan",
  Clicked: "green",
  Delivered: "slate",
  Sent: "amber",
};

export const INITIAL_SENT_EMAILS: SentEmail[] = [
  { id: 1, to: "James Carter", cid: 1, subject: "Welcome, James! Book your free call", preview: "Thanks for signing up! Pick a time for your free discovery call…", date: "Oct 14", status: "Opened" },
  { id: 2, to: "Hannah Lee", cid: 5, subject: "Still want to chat, Hannah?", preview: "I noticed you have not booked your call yet…", date: "Oct 14", status: "Delivered" },
  { id: 3, to: "Daniel Kim", cid: 2, subject: "Your call is confirmed", preview: "See you Wednesday at 2:00 PM. Here is the meeting link…", date: "Oct 13", status: "Clicked" },
  { id: 4, to: "Liam Walsh", cid: 12, subject: "Quick follow-up", preview: "Just checking in to see if you had any questions…", date: "Oct 10", status: "Delivered" },
  { id: 5, to: "Marco Bianchi", cid: 8, subject: "Thanks for subscribing, Marco!", preview: "Welcome aboard. Here is what happens next…", date: "Oct 8", status: "Opened" },
];

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

export type FormField = {
  id: number;
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

export type LeadForm = {
  id: number;
  name: string;
  on: boolean;
  subs: number;
  button: string;
  success: string;
  stage: string;
  tag: string;
  thanksMode?: "message" | "redirect";
  redirectUrl?: string;
  fields: FormField[];
};

export const INITIAL_FORMS: LeadForm[] = [
  {
    id: 1, name: "Landing page signup", on: true, subs: 38, button: "Get started",
    success: "Thanks! Check your email for your booking link.", stage: "lead", tag: "hot", thanksMode: "message",
    fields: [
      { id: 101, type: "text", label: "Full name", ph: "Jane Doe", req: true, opts: "" },
      { id: 102, type: "email", label: "Email", ph: "you@example.com", req: true, opts: "" },
      { id: 103, type: "phone", label: "Phone", ph: "(555) 000-0000", req: false, opts: "" },
      { id: 104, type: "select", label: "What do you need help with?", ph: "", req: false, opts: "Marketing, Sales, Operations, Something else" },
      { id: 105, type: "select", label: "How did you hear about us?", ph: "", req: false, opts: "Facebook, Google, A friend, Other", custom: true, key: "heard_from" },
    ],
  },
  {
    id: 2, name: "Discovery call intake", on: true, subs: 17, button: "Submit",
    success: "Got it — see you on the call!", stage: "booked", tag: "",
    fields: [
      { id: 201, type: "text", label: "Your name", ph: "", req: true, opts: "" },
      { id: 202, type: "email", label: "Email", ph: "", req: true, opts: "" },
      { id: 203, type: "text", label: "Business name", ph: "", req: false, opts: "" },
      { id: 204, type: "select", label: "Monthly budget", ph: "", req: false, opts: "Under $500, $500 – $2,000, $2,000+" },
      { id: 205, type: "textarea", label: "What are your goals?", ph: "Tell us a bit about your business", req: false, opts: "" },
    ],
  },
  {
    id: 3, name: "Newsletter signup", on: true, subs: 54, button: "Subscribe",
    success: "You are on the list!", stage: "", tag: "newsletter",
    fields: [
      { id: 301, type: "email", label: "Email", ph: "you@example.com", req: true, opts: "" },
      { id: 302, type: "checkbox", label: "Send me tips and updates", ph: "", req: false, opts: "" },
    ],
  },
  {
    id: 4, name: "Referral form", on: false, subs: 0, button: "Send referral",
    success: "Thank you for the referral!", stage: "lead", tag: "referral",
    fields: [
      { id: 401, type: "text", label: "Your name", ph: "", req: true, opts: "" },
      { id: 402, type: "text", label: "Friend’s name", ph: "", req: true, opts: "" },
      { id: 403, type: "email", label: "Friend’s email", ph: "", req: true, opts: "" },
    ],
  },
];

// -------------------------------------------------------------- Automations
/** What kind of options a step / trigger value is chosen from. */
export type OptionSource = "template" | "tag" | "stage" | "calendar" | "delay" | "text";

export type ActionType = "email" | "sms" | "wait" | "tag" | "removeTag" | "stage" | "notify";

export const ACTION_TYPES: Record<
  ActionType,
  { label: string; short: string; field: OptionSource; fieldLabel: string; placeholder?: string; icon: IconName; tone: Tone }
> = {
  email: { label: "Send email", short: "Email", field: "template", fieldLabel: "Email template", icon: "mail", tone: "cyan" },
  sms: { label: "Send text message", short: "Text", field: "text", fieldLabel: "Message", placeholder: "Type the text message", icon: "message", tone: "teal" },
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
  opened: { label: "Contact opened email", field: "template" },
  booked: { label: "Contact has booked a call" },
  paid: { label: "Contact has paid" },
};

export const DELAYS = ["1 hour", "1 day", "2 days", "3 days", "1 week"];

export type ActionStep = { id: number; type: ActionType; value: string };
export type ConditionStep = { id: number; type: "condition"; cond: ConditionType; value: string; yes: ActionStep[]; no: ActionStep[] };
export type AutomationStep = ActionStep | ConditionStep;

export type Automation = {
  id: number;
  name: string;
  on: boolean;
  runs: number;
  trigger: { type: TriggerType; value: string };
  steps: AutomationStep[];
};

export const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: 1, name: "New landing page signup", on: true, runs: 38, trigger: { type: "form", value: "" },
    steps: [
      { id: 11, type: "stage", value: "lead" },
      { id: 12, type: "tag", value: "hot" },
      { id: 13, type: "email", value: "Welcome" },
      { id: 14, type: "notify", value: "New lead just signed up" },
    ],
  },
  {
    id: 2, name: "Call booked", on: true, runs: 17, trigger: { type: "booked", value: "discovery" },
    steps: [
      { id: 21, type: "stage", value: "booked" },
      { id: 22, type: "email", value: "Call reminder" },
      { id: 23, type: "sms", value: "Reminder: our call starts in 1 hour" },
    ],
  },
  {
    id: 3, name: "Subscription paid", on: true, runs: 9, trigger: { type: "paid", value: "" },
    steps: [
      { id: 31, type: "stage", value: "paid" },
      { id: 32, type: "tag", value: "vip" },
      { id: 33, type: "email", value: "Payment thank-you" },
      { id: 34, type: "notify", value: "New paying client!" },
    ],
  },
  {
    id: 4, name: "No booking after 2 days", on: false, runs: 0, trigger: { type: "noBooking", value: "2 days" },
    steps: [
      { id: 41, type: "email", value: "Follow-up" },
      { id: 42, type: "wait", value: "2 days" },
      {
        id: 43, type: "condition", cond: "booked", value: "",
        yes: [{ id: 431, type: "notify", value: "Lead booked after the follow-up" }],
        no: [
          { id: 432, type: "email", value: "Follow-up" },
          { id: 433, type: "tag", value: "follow" },
        ],
      },
    ],
  },
];
