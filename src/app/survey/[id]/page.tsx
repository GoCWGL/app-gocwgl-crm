import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicSurveyPage } from "@/features/public/PublicSurveyPage";

export const metadata: Metadata = {
  title: "Survey",
};

export default function Survey() {
  // PublicSurveyPage reads the id and ?embed=1 from the URL, so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <PublicSurveyPage />
    </Suspense>
  );
}
