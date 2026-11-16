import { api, del, get, patch, post, put } from "./client";
import type { AttemptOut, DefaultThumbnailOut, LearnerOut, LessonFileOut, ProgressIn, TrainingAudience, TrainingIn, TrainingOut, TrainingResultOut, TrainingStatsOut, TrainingUpdate, VaTrainingOut } from "./models";

// Engagement › Training (staff).
export const listTrainings = () => get<TrainingOut[]>("/admin/trainings");
export const createTraining = (body: TrainingIn) => post<TrainingOut>("/admin/trainings", body);
export const updateTraining = (id: string, body: TrainingUpdate) => patch<TrainingOut>(`/admin/trainings/${id}`, body);
export const deleteTraining = (id: string) => del(`/admin/trainings/${id}`);
export const trainingStats = (audience: TrainingAudience) => get<TrainingStatsOut>("/admin/trainings/stats", { audience });
export const trainingResults = (id: string) => get<TrainingResultOut[]>(`/admin/trainings/${id}/results`);
export const trainingLearners = (id: string) => get<LearnerOut[]>(`/admin/trainings/${id}/learners`);

// Thumbnails: each course's own, and the default shown on courses without one.
const imageForm = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return body;
};
/** Never sit on "Uploading…" forever. */
const UPLOAD_TIMEOUT = 120_000;
export const setTrainingThumbnail = (id: string, file: File) =>
  api<TrainingOut>(`/admin/trainings/${id}/thumbnail`, { method: "PUT", body: imageForm(file), signal: AbortSignal.timeout(UPLOAD_TIMEOUT) });
export const removeTrainingThumbnail = (id: string) => del<TrainingOut>(`/admin/trainings/${id}/thumbnail`);
export const getDefaultThumbnail = () => get<DefaultThumbnailOut>("/admin/trainings/default-thumbnail");
export const setDefaultThumbnail = (file: File) =>
  api<DefaultThumbnailOut>("/admin/trainings/default-thumbnail", { method: "PUT", body: imageForm(file), signal: AbortSignal.timeout(UPLOAD_TIMEOUT) });
export const removeDefaultThumbnail = () => del<DefaultThumbnailOut>("/admin/trainings/default-thumbnail");

// Reading lessons' documents (PDF, image, Word, PowerPoint, Excel or text, up to 25 MB).
export const LESSON_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.txt";
export const LESSON_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const uploadLessonFile = (id: string, file: File) =>
  api<LessonFileOut>(`/admin/trainings/${id}/files`, { method: "POST", body: imageForm(file), signal: AbortSignal.timeout(UPLOAD_TIMEOUT) });
/** Where a reading lesson's document is fetched from (signed in), for staff, VAs or client users. */
export const lessonFilePath = (scope: "admin" | "va" | "portal", trainingId: string, fileId: string) =>
  `/${scope}/trainings/${trainingId}/files/${encodeURIComponent(fileId)}`;

/** Where a course's thumbnail is fetched from (signed in), for staff, VAs or client users; null when it has none. */
export const trainingThumbPath = (scope: "admin" | "va" | "portal", id: string, version: string | null | undefined) =>
  version ? `/${scope}/trainings/${id}/thumbnail?v=${encodeURIComponent(version)}` : null;
export const defaultThumbPath = (version: string | null | undefined) =>
  version ? `/admin/trainings/default-thumbnail/image?v=${encodeURIComponent(version)}` : null;

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
    lessons: (t.lessons ?? []).map((l) => ({
      ...l,
      kind: l.kind ?? "video",
      provider: l.kind === "reading" ? null : (l.provider ?? "youtube"),
      minutes: l.minutes ?? 0,
      summary: l.summary ?? "",
      body: l.body ?? "",
      file: l.file ?? null,
      locked: l.locked ?? false,
    })),
    dailyLessons: t.dailyLessons ?? 0,
    unlockHour: t.unlockHour ?? 8,
    nextUnlockAt: t.nextUnlockAt ?? null,
    quizLocked: t.quizLocked ?? false,
    questions: (t.questions ?? []).map((q) => ({ ...q, kind: q.kind ?? "choice" })),
    enrolledAt: t.enrolledAt ?? null,
    myWatched: t.myWatched ?? [],
    myCurrentStep: t.myCurrentStep ?? "",
    completedAt: t.completedAt ?? null,
  }));
}
