"use client";

import { SopLibrary } from "@/features/va/sections/SopLibrarySection";
import { TrainingList } from "@/features/va/sections/TrainingSection";
import { useClientSops, useClientTrainings } from "@/utils/hooks/useClientWork";
import { usePortal } from "../state/PortalContext";

/** Client portal › Training: GoCWGL lessons for clients (same player and quizzes as the VA portal). */
export function ClientTrainingSection() {
  const { readOnly } = usePortal();
  return <TrainingList query={useClientTrainings()} audience="client" readOnly={readOnly} />;
}

/** Client portal › SOPs: published client guides. */
export function ClientSopsSection() {
  return <SopLibrary query={useClientSops()} />;
}
