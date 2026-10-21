import { CHOICE_TYPES, QUESTION_TYPES, type QuestionType, type Survey, type SurveyQuestion } from "@/data/admin";
import { embedScript, iframeEmbed, surveyUrl } from "@/features/public/links";
import { newFieldId } from "@/utils/mappers/forms";

export type SurveyEmbedMode = "inline" | "popup" | "link";

/** Snippet to paste into a website (or a plain link for emails and social posts). The page is /survey/{id}. */
export function surveyEmbed(s: Survey, mode: SurveyEmbedMode, opts: { height: number; button: string }): string {
  const url = surveyUrl(s.id || "save-the-survey-first");
  if (mode === "link") return url;
  if (mode === "popup") {
    const label = (opts.button || "Take the survey").replace(/</g, "&lt;");
    return [`<!-- ${s.name} (popup) -->`, `<button type="button" data-gocwgl-popup="${url}">${label}</button>`, embedScript()].join("\n");
  }
  return [`<!-- ${s.name} -->`, iframeEmbed(url, s.name, opts.height)].join("\n");
}

export const blankSurvey = (): Survey => ({
  id: "",
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
    id: newFieldId(),
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
