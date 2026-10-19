import { del, get, patch, post } from "./client";
import type { FormIn, FormOut, FormPatch, PublicFormOut, PublicSubmission, SubmissionOut, SubmissionResult } from "./models";

export const listForms = () => get<FormOut[]>("/admin/forms");
export const getForm = (id: string) => get<FormOut>(`/admin/forms/${id}`);
/** A form must contain an email field. */
export const createForm = (body: FormIn) => post<FormOut>("/admin/forms", body);
export const updateForm = (id: string, body: FormPatch) => patch<FormOut>(`/admin/forms/${id}`, body);
export const deleteForm = (id: string) => del(`/admin/forms/${id}`);
export const listFormSubmissions = (id: string, opts: { limit?: number; offset?: number } = {}) =>
  get<SubmissionOut[]>(`/admin/forms/${id}/submissions`, opts);

// ------------------------------------------------------------------ Public embed (no sign-in)
export const getPublicForm = (id: string) => get<PublicFormOut>(`/public/forms/${id}`);
export const submitPublicForm = (id: string, body: PublicSubmission) =>
  post<SubmissionResult>(`/public/forms/${id}/submissions`, body);
