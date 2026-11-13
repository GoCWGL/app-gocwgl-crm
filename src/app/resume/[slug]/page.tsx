import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicResumePage } from "@/features/va/PublicResumePage";

export const metadata: Metadata = {
  title: "Resume",
  // Personal details: shared by link, never listed in search engines.
  robots: { index: false, follow: false },
};

export default function Resume() {
  // PublicResumePage reads the link from the URL, so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <PublicResumePage />
    </Suspense>
  );
}
