import { del, get, post } from "./client";
import type { FeedbackIn, FeedbackOut, FeedbackSummaryOut, MyVaOut } from "./models";

// Engagement › Feedback (staff).
export const listFeedback = () => get<FeedbackOut[]>("/admin/feedback");
export const feedbackSummary = () => get<FeedbackSummaryOut>("/admin/feedback/summary");
export const deleteFeedback = (id: string) => del(`/admin/feedback/${id}`);

// Client portal › Your VA.
export const listMyVas = () => get<MyVaOut[]>("/portal/vas");
export const listMyFeedback = () => get<FeedbackOut[]>("/portal/feedback");
export const giveFeedback = (body: FeedbackIn) => post<FeedbackOut>("/portal/feedback", body);
