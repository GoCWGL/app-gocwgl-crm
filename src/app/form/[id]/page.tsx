import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicFormPage } from "@/features/public/PublicFormPage";

export const metadata: Metadata = {
  title: "Form",
};

export default function Form() {
  // PublicFormPage reads the id and ?embed=1 from the URL, so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <PublicFormPage />
    </Suspense>
  );
}
