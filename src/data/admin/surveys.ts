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
  id: string;
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

/** The survey builder's draft ("" id = not saved yet). utils/mappers/surveys.ts converts it to and from the API. */
export type Survey = {
  id: string;
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
