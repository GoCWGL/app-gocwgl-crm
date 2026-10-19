// Embed code kinds clients can paste into their portal from their own CRM
// (forms, surveys, calendars, custom snippets). The codes themselves come from the API.

export type EmbedKind = "form" | "survey" | "calendar" | "custom";

export const EMBED_KINDS: Array<{ kind: EmbedKind; label: string; short: string; placeholder: string }> = [
  { kind: "form", label: "Form", short: "FRM", placeholder: "e.g. Free week signup form" },
  { kind: "survey", label: "Survey", short: "SRV", placeholder: "e.g. Fitness goals quiz" },
  { kind: "calendar", label: "Calendar", short: "CAL", placeholder: "e.g. Intro call booking" },
  { kind: "custom", label: "Custom code", short: "</>", placeholder: "e.g. Chat widget" },
];
