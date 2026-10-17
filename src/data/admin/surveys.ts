import type { IconName } from "@/components/ui";

// =============================================================================
// Surveys: multi-question surveys and quizzes you can embed on any page.
// =============================================================================

export type QuestionType = "name" | "short" | "long" | "single" | "multi" | "dropdown" | "rating" | "scale" | "yesno" | "email" | "number" | "date";

/** `contact` = the answer fills that field on the lead's contact record. */
export const QUESTION_TYPES: Record<QuestionType, { label: string; icon: IconName; desc: string; contact?: "name" | "email" }> = {
  name: { label: "Name", icon: "user", desc: "First and last name", contact: "name" },
  email: { label: "Email", icon: "mail", desc: "Email address", contact: "email" },
  single: { label: "Multiple choice", icon: "radio", desc: "Pick one answer" },
  multi: { label: "Checkboxes", icon: "checkbox", desc: "Pick all that apply" },
  dropdown: { label: "Dropdown", icon: "dropdown", desc: "Pick one from a list" },
  rating: { label: "Star rating", icon: "star", desc: "1 to 5 stars" },
  scale: { label: "0–10 scale", icon: "gauge", desc: "How likely… (NPS)" },
  yesno: { label: "Yes / No", icon: "circleCheck", desc: "Simple yes or no" },
  short: { label: "Short answer", icon: "textShort", desc: "One line of text" },
  long: { label: "Long answer", icon: "textLong", desc: "A paragraph" },
  number: { label: "Number", icon: "hash", desc: "Any number" },
  date: { label: "Date", icon: "calendar", desc: "Pick a date" },
};

/** Question types that need a list of answer choices. */
export const CHOICE_TYPES: QuestionType[] = ["single", "multi", "dropdown"];

export type SurveyQuestion = {
  id: number;
  type: QuestionType;
  title: string;
  /** Small help text under the question. */
  help: string;
  req: boolean;
  /** Answer choices (multiple choice, checkboxes, dropdown). */
  options: string[];
  /** Adds an "Other" choice with a text box. */
  other?: boolean;
  /** Name question: ask first and last name in two boxes (default) or one. */
  fullNameOnly?: boolean;
  /** Labels at each end of a 0–10 scale. */
  lowLabel?: string;
  highLabel?: string;
  /** Save the answer to the contact under this field key. */
  key?: string;
};

export type Survey = {
  id: number;
  name: string;
  intro: string;
  on: boolean;
  responses: number;
  /** Share of people who started and finished, in percent. */
  completion: number;
  button: string;
  thanks: string;
  /** Tag added to the contact when they finish (tag id, "" = none). */
  tag: string;
  /** Show one question per screen with a progress bar. */
  oneAtATime: boolean;
  questions: SurveyQuestion[];
};

export const INITIAL_SURVEYS: Survey[] = [
  {
    id: 1, name: "Client satisfaction survey", on: true, responses: 23, completion: 82,
    intro: "Two minutes to tell us how we are doing. Your answers help us improve.",
    button: "Send my answers", thanks: "Thank you! We read every answer.", tag: "", oneAtATime: true,
    questions: [
      { id: 1001, type: "rating", title: "How happy are you with your system so far?", help: "", req: true, options: [] },
      { id: 1002, type: "scale", title: "How likely are you to recommend us to a friend?", help: "", req: true, options: [], lowLabel: "Not likely", highLabel: "Very likely" },
      { id: 1003, type: "multi", title: "Which parts do you use most?", help: "Pick all that apply", req: false, options: ["Landing page", "Booking calendar", "Email follow-ups", "Daily reports"], other: true },
      { id: 1004, type: "long", title: "What is one thing we could do better?", help: "", req: false, options: [] },
    ],
  },
  {
    id: 2, name: "New lead qualifier", on: true, responses: 41, completion: 67,
    intro: "Answer a few quick questions so we can point you to the right plan.",
    button: "See my results", thanks: "Thanks! We will email you a plan that fits within 24 hours.", tag: "hot", oneAtATime: false,
    questions: [
      { id: 2000, type: "name", title: "What’s your name?", help: "", req: true, options: [] },
      { id: 2001, type: "short", title: "What is your business called?", help: "", req: true, options: [], key: "business_name" },
      { id: 2002, type: "single", title: "How many leads do you get each month?", help: "", req: true, options: ["Under 20", "20 – 100", "100 – 500", "500+"], key: "monthly_leads" },
      { id: 2003, type: "dropdown", title: "What is your biggest challenge?", help: "", req: false, options: ["Getting leads", "Following up", "Booking calls", "Closing sales"] },
      { id: 2004, type: "yesno", title: "Do you already use a CRM?", help: "", req: false, options: [] },
      { id: 2005, type: "email", title: "Where should we send your results?", help: "", req: true, options: [] },
    ],
  },
  {
    id: 3, name: "Post-call feedback", on: false, responses: 0, completion: 0,
    intro: "", button: "Submit", thanks: "Thanks for the feedback!", tag: "", oneAtATime: false,
    questions: [
      { id: 3001, type: "rating", title: "How useful was the call?", help: "", req: true, options: [] },
      { id: 3002, type: "long", title: "Anything we should know before next time?", help: "", req: false, options: [] },
    ],
  },
];
