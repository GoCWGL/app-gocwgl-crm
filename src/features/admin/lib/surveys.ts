import { CHOICE_TYPES, QUESTION_TYPES, type Domain, type QuestionType, type Survey, type SurveyQuestion } from "@/data/admin";
import { newId, slugify } from "@/lib/utils";

export type SurveyEmbedMode = "inline" | "popup" | "link";

/** Verified domain for forms, or the placeholder used on the Forms page. */
export function surveyHost(domains: Domain[]): string {
  return domains.find((d) => d.status === "Verified" && (d.purpose === "forms" || d.purpose === "all"))?.host ?? "forms.[yourdomain].com";
}

export const surveyUrl = (s: Survey, host: string) => `https://${host}/survey/${slugify(s.name || "survey")}`;

/** Snippet to paste into a website (or a plain link for emails and social posts). */
export function surveyEmbed(s: Survey, host: string, mode: SurveyEmbedMode, opts: { height: number; button: string }): string {
  const url = surveyUrl(s, host);
  if (mode === "link") return url;
  if (mode === "popup") {
    return [
      `<!-- ${s.name} (popup) -->`,
      `<button type="button" data-survey-popup="${url}">${opts.button || "Take the survey"}</button>`,
      `<script src="https://${host}/embed/survey.js" async></script>`,
    ].join("\n");
  }
  return [
    `<!-- ${s.name} -->`,
    `<iframe src="${url}?embed=1" title="${s.name}" width="100%" height="${opts.height}" style="border:0;max-width:100%" loading="lazy"></iframe>`,
    `<script src="https://${host}/embed/survey.js" async></script>`,
  ].join("\n");
}

export const blankSurvey = (): Survey => ({
  id: 0,
  name: "",
  intro: "",
  on: false,
  responses: 0,
  completion: 0,
  button: "Submit",
  thanks: "Thanks for your answers!",
  tag: "",
  oneAtATime: false,
  // Start with a name question so every response becomes a lead.
  questions: [newQuestion("name"), newQuestion("single")],
});

const NEW_TITLES: Partial<Record<QuestionType, string>> = {
  name: "What’s your name?",
  email: "What’s your email?",
  scale: "How likely are you to recommend us?",
  rating: "How would you rate us?",
};

export function newQuestion(type: QuestionType): SurveyQuestion {
  return {
    id: newId(),
    type,
    title: NEW_TITLES[type] ?? "",
    help: "",
    req: !!QUESTION_TYPES[type].contact,
    options: CHOICE_TYPES.includes(type) ? ["Option 1", "Option 2", "Option 3"] : [],
    ...(type === "scale" ? { lowLabel: "Not likely", highLabel: "Very likely" } : {}),
  };
}

/** Switch a question's type, keeping or seeding its choices as needed. */
export function changeQuestionType(q: SurveyQuestion, type: QuestionType): SurveyQuestion {
  const needsOptions = CHOICE_TYPES.includes(type);
  return {
    ...q,
    type,
    options: needsOptions ? (q.options.length ? q.options : ["Option 1", "Option 2"]) : [],
    other: needsOptions && type !== "dropdown" ? q.other : false,
    // Contact questions fill a built-in field and are required by default.
    key: QUESTION_TYPES[type].contact ? undefined : q.key,
    req: QUESTION_TYPES[type].contact ? true : q.req,
    lowLabel: type === "scale" ? (q.lowLabel ?? "Not likely") : undefined,
    highLabel: type === "scale" ? (q.highLabel ?? "Very likely") : undefined,
  };
}

/** Problems that stop a survey from being saved. */
export function surveyErrors(s: Survey): string {
  if (!s.name.trim()) return "Give your survey a name before saving.";
  if (!s.questions.length) return "Add at least one question.";
  const i = s.questions.findIndex((q) => !q.title.trim());
  if (i >= 0) return `Question ${i + 1} needs a question.`;
  const c = s.questions.findIndex((q) => CHOICE_TYPES.includes(q.type) && q.options.filter((o) => o.trim()).length < 2);
  if (c >= 0) return `Question ${c + 1} (${QUESTION_TYPES[s.questions[c].type].label}) needs at least two choices.`;
  return "";
}
