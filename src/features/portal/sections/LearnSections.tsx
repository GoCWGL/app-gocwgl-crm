"use client";

import { TrainingList } from "@/features/va/sections/TrainingSection";
import { useClientTrainings } from "@/utils/hooks/useClientWork";
import { usePortal } from "../state/PortalContext";

/** Client portal › Training: GoCWGL lessons for clients (same player and quizzes as the VA portal). */
export function ClientTrainingSection() {
  const { readOnly } = usePortal();
  return <TrainingList query={useClientTrainings()} audience="client" readOnly={readOnly} />;
}

/** Client portal › SOPs: your own SOPs for your VAs, and the GoCWGL guides. */
export { ClientSopsSection } from "./ClientSopsSection";
