import { del, get, patch, post } from "./client";
import type { PublicAnswers, PublicSurveyOut, ResponseOut, SurveyIn, SurveyOut, SurveyPatch } from "./models";

export const listSurveys = () => get<SurveyOut[]>("/admin/surveys");
export const getSurvey = (id: string) => get<SurveyOut>(`/admin/surveys/${id}`);
export const createSurvey = (body: SurveyIn) => post<SurveyOut>("/admin/surveys", body);
export const updateSurvey = (id: string, body: SurveyPatch) => patch<SurveyOut>(`/admin/surveys/${id}`, body);
export const deleteSurvey = (id: string) => del(`/admin/surveys/${id}`);
export const listSurveyResponses = (id: string, opts: { limit?: number; offset?: number } = {}) =>
  get<ResponseOut[]>(`/admin/surveys/${id}/responses`, opts);

// ------------------------------------------------------------------ Public embed (no sign-in)
export const getPublicSurvey = (id: string) => get<PublicSurveyOut>(`/public/surveys/${id}`);
export const startPublicSurvey = (id: string) => post<void>(`/public/surveys/${id}/start`);
export const submitPublicSurvey = (id: string, body: PublicAnswers) => post<unknown>(`/public/surveys/${id}/responses`, body);
