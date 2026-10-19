"use client";

import { useQuery } from "@tanstack/react-query";
import * as forms from "@/utils/api/forms";
import * as surveys from "@/utils/api/surveys";
import type { FormPatch, SurveyPatch } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useForms = () => useQuery({ queryKey: qk.forms, queryFn: forms.listForms });
export const useCreateForm = () => useApiMutation(forms.createForm, { invalidate: [qk.forms] });
export const useUpdateForm = () => useApiMutation((v: { id: string; body: FormPatch }) => forms.updateForm(v.id, v.body), { invalidate: [qk.forms] });
export const useDeleteForm = () => useApiMutation(forms.deleteForm, { invalidate: [qk.forms] });
export const useFormSubmissions = (id: string) =>
  useQuery({ queryKey: qk.formSubmissions(id), queryFn: () => forms.listFormSubmissions(id, { limit: 100 }), enabled: !!id });

export const useSurveys = () => useQuery({ queryKey: qk.surveys, queryFn: surveys.listSurveys });
export const useCreateSurvey = () => useApiMutation(surveys.createSurvey, { invalidate: [qk.surveys] });
export const useUpdateSurvey = () =>
  useApiMutation((v: { id: string; body: SurveyPatch }) => surveys.updateSurvey(v.id, v.body), { invalidate: [qk.surveys] });
export const useDeleteSurvey = () => useApiMutation(surveys.deleteSurvey, { invalidate: [qk.surveys] });
export const useSurveyResponses = (id: string) =>
  useQuery({ queryKey: qk.surveyResponses(id), queryFn: () => surveys.listSurveyResponses(id, { limit: 100 }), enabled: !!id });
