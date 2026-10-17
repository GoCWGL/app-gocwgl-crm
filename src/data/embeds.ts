// Embed codes clients paste into their portal from their own CRM
// (forms, surveys, calendars, custom snippets). Shared by the portal and
// the admin client profile through lib/embedStore.

export type EmbedKind = "form" | "survey" | "calendar" | "custom";

export type ClientEmbed = {
  id: number;
  /** Portal funnel id and name (the admin side only knows the name). */
  funnelId: number;
  funnel: string;
  kind: EmbedKind;
  label: string;
  code: string;
  updated: string;
  /** The GoCWGL team flagged a problem with the code that the client needs to fix. */
  issue?: boolean;
  comments?: EmbedComment[];
};

export type EmbedComment = {
  id: number;
  from: "team" | "client";
  who: string;
  text: string;
  when: string;
  /** Comment that flagged the code as broken. */
  flag?: boolean;
};

export const EMBED_KINDS: Array<{ kind: EmbedKind; label: string; short: string; placeholder: string }> = [
  { kind: "form", label: "Form", short: "FRM", placeholder: "e.g. Free week signup form" },
  { kind: "survey", label: "Survey", short: "SRV", placeholder: "e.g. Fitness goals quiz" },
  { kind: "calendar", label: "Calendar", short: "CAL", placeholder: "e.g. Intro call booking" },
  { kind: "custom", label: "Custom code", short: "</>", placeholder: "e.g. Chat widget" },
];

/** Embed codes by contact id (contact 9 is the sample portal client). */
export const INITIAL_CLIENT_EMBEDS: Record<number, ClientEmbed[]> = {
  9: [
    {
      id: 1,
      funnelId: 1,
      funnel: "Instagram lead ad funnel",
      kind: "form",
      label: "Free week signup form",
      code: `<iframe src="https://crm.rahmanwellness.example/widget/form/free-week" style="width:100%;height:560px;border:none" id="free-week-form" title="Free week signup"></iframe>
<script src="https://crm.rahmanwellness.example/js/form_embed.js"></script>`,
      updated: "Oct 14",
    },
    {
      id: 2,
      funnelId: 1,
      funnel: "Instagram lead ad funnel",
      kind: "calendar",
      label: "Intro call (20 min)",
      code: `<iframe src="https://crm.rahmanwellness.example/widget/booking/intro-call" style="width:100%;border:none;overflow:hidden" scrolling="no" id="intro-call"></iframe>
<script src="https://crm.rahmanwellness.example/js/form_embed.js" type="text/javascript"></script>`,
      updated: "Oct 14",
      issue: true,
      comments: [
        {
          id: 1,
          from: "team",
          who: "Christian",
          text: "This calendar iframe has no height, so it shows up 150px tall and cut off. Could you copy the code again from your CRM with the height setting turned on?",
          when: "Oct 14",
          flag: true,
        },
      ],
    },
  ],
};
