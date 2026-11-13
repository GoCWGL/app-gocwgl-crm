"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/feedback";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useFeedback = () => useQuery({ queryKey: qk.feedback, queryFn: api.listFeedback });
export const useFeedbackSummary = () => useQuery({ queryKey: [...qk.feedback, "summary"], queryFn: api.feedbackSummary });
export const useDeleteFeedback = () => useApiMutation(api.deleteFeedback, { invalidate: [qk.feedback] });

// Client portal
export const useMyVas = () => useQuery({ queryKey: qk.portalVas, queryFn: api.listMyVas });
export const useMyFeedback = () => useQuery({ queryKey: [...qk.portalVas, "feedback"], queryFn: api.listMyFeedback });
export const useGiveFeedback = () => useApiMutation(api.giveFeedback, { invalidate: [qk.portalVas] });
