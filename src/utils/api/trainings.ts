import { del, get, patch, post } from "./client";
import type { AttemptOut, TrainingAudience, TrainingIn, TrainingOut, TrainingResultOut, TrainingStatsOut, TrainingUpdate, VaTrainingOut } from "./models";

// Engagement › Training (staff).
export const listTrainings = () => get<TrainingOut[]>("/admin/trainings");
export const createTraining = (body: TrainingIn) => post<TrainingOut>("/admin/trainings", body);
export const updateTraining = (id: string, body: TrainingUpdate) => patch<TrainingOut>(`/admin/trainings/${id}`, body);
export const deleteTraining = (id: string) => del(`/admin/trainings/${id}`);
export const trainingStats = (audience: TrainingAudience) => get<TrainingStatsOut>("/admin/trainings/stats", { audience });
export const trainingResults = (id: string) => get<TrainingResultOut[]>(`/admin/trainings/${id}/results`);

// VA portal › Training (VAs).
export const listMyTrainings = () => get<VaTrainingOut[]>("/va/trainings");
export const submitQuiz = (id: string, answers: Array<number | null>) => post<AttemptOut>(`/va/trainings/${id}/attempts`, { answers });
