"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/trainings";
import type { ProgressIn, TrainingAudience, TrainingUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

const ALL = [qk.trainings];
export const useTrainings = () => useQuery({ queryKey: qk.trainings, queryFn: api.listTrainings });
export const useTrainingStats = (audience: TrainingAudience) =>
  useQuery({ queryKey: [...qk.trainings, "stats", audience], queryFn: () => api.trainingStats(audience) });
export const useTrainingResults = (id: string) =>
  useQuery({ queryKey: [...qk.trainings, "results", id], queryFn: () => api.trainingResults(id), enabled: !!id });
export const useTrainingLearners = (id: string) =>
  useQuery({ queryKey: [...qk.trainings, "learners", id], queryFn: () => api.trainingLearners(id), enabled: !!id });
export const useCreateTraining = () => useApiMutation(api.createTraining, { invalidate: ALL });
export const useUpdateTraining = () =>
  useApiMutation((v: { id: string; body: TrainingUpdate }) => api.updateTraining(v.id, v.body), { invalidate: ALL });
export const useDeleteTraining = () => useApiMutation(api.deleteTraining, { invalidate: ALL });

// VA portal
export const useMyTrainings = (enabled = true) => useQuery({ queryKey: qk.myTrainings, queryFn: api.listMyTrainings, enabled });
export const useSubmitQuiz = () =>
  useApiMutation((v: { id: string; answers: Array<number | null> }) => api.submitQuiz(v.id, v.answers), { invalidate: [qk.myTrainings] });
export const useEnrollTraining = () => useApiMutation(api.enrollTraining, { invalidate: [qk.myTrainings] });
export const useSaveTrainingProgress = () =>
  useApiMutation((v: { id: string } & ProgressIn) => api.saveTrainingProgress(v.id, { watched: v.watched, currentStep: v.currentStep }), {
    invalidate: [qk.myTrainings],
  });
