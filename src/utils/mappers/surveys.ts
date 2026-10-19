import type { Survey, SurveyQuestion } from "@/data/admin";
import type { SurveyIn, SurveyOut } from "@/utils/api/models";

/** API survey → the builder's draft. */
export function surveyToDraft(s: SurveyOut): Survey {
  return {
    id: s.id,
    name: s.name,
    intro: s.intro,
    on: s.isActive,
    responses: s.responses,
    completion: s.completion,
    button: s.button,
    thanks: s.thanks,
    tag: s.tagId ?? "",
    oneAtATime: s.oneAtATime,
    questions: (s.questions as SurveyQuestion[]).map((q) => ({ ...q, id: String(q.id), help: q.help ?? "", options: q.options ?? [], req: !!q.req })),
  };
}

/** The builder's draft → POST/PATCH body (only documented fields; blank choices dropped). */
export function draftToSurvey(d: Survey): SurveyIn {
  return {
    name: d.name.trim(),
    intro: d.intro,
    isActive: d.on,
    button: d.button,
    thanks: d.thanks,
    tagId: d.tag || null,
    oneAtATime: d.oneAtATime,
    questions: d.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title.trim(),
      help: q.help,
      req: q.req,
      options: q.options.map((o) => o.trim()).filter(Boolean),
      other: !!q.other,
      fullNameOnly: !!q.fullNameOnly,
      lowLabel: q.lowLabel ?? "",
      highLabel: q.highLabel ?? "",
      ...(q.key ? { key: q.key } : {}),
    })),
  };
}
