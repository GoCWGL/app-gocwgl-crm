import { del, get, patch, post, put } from "./client";
import type { AttemptOut, LearnerOut, ProgressIn, TrainingAudience, TrainingIn, TrainingOut, TrainingResultOut, TrainingStatsOut, TrainingUpdate, VaTrainingOut } from "./models";

// Engagement › Training (staff).
export const listTrainings = () => get<TrainingOut[]>("/admin/trainings");
export const createTraining = (body: TrainingIn) => post<TrainingOut>("/admin/trainings", body);
export const updateTraining = (id: string, body: TrainingUpdate) => patch<TrainingOut>(`/admin/trainings/${id}`, body);
export const deleteTraining = (id: string) => del(`/admin/trainings/${id}`);
export const trainingStats = (audience: TrainingAudience) => get<TrainingStatsOut>("/admin/trainings/stats", { audience });
export const trainingResults = (id: string) => get<TrainingResultOut[]>(`/admin/trainings/${id}/results`);
export const trainingLearners = (id: string) => get<LearnerOut[]>(`/admin/trainings/${id}/learners`);

// VA portal › Training (VAs).
export const listMyTrainings = () => get<VaTrainingOut[]>("/va/trainings").then(withTrainingDefaults);
export const submitQuiz = (id: string, answers: Array<number | string | null>) => post<AttemptOut>(`/va/trainings/${id}/attempts`, { answers });
export const enrollTraining = (id: string) => post<void>(`/va/trainings/${id}/enroll`);
export const saveTrainingProgress = (id: string, body: ProgressIn) => put<void>(`/va/trainings/${id}/progress`, body);

/**
 * Fills fields a slightly older API may not send yet (lesson provider/length/summary, registration and progress),
 * so the Training page keeps working while the frontend and API deploy at different times.
 */
export function withTrainingDefaults(rows: VaTrainingOut[]): VaTrainingOut[] {
  return rows.map((t) => ({
    ...t,
    lessons: (t.lessons ?? []).map((l) => ({ ...l, provider: l.provider ?? "youtube", minutes: l.minutes ?? 0, summary: l.summary ?? "" })),
    questions: (t.questions ?? []).map((q) => ({ ...q, kind: q.kind ?? "choice" })),
    enrolledAt: t.enrolledAt ?? null,
    myWatched: t.myWatched ?? [],
    myCurrentStep: t.myCurrentStep ?? "",
    completedAt: t.completedAt ?? null,
  }));
}
