import type { Metadata } from "next";
import { Suspense } from "react";
import { VaApp } from "@/features/va";

export const metadata: Metadata = {
  title: "VA Portal",
};

export default function VaPage() {
  // VaApp is client-only (session restore, ?tab= deep links), so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <VaApp />
    </Suspense>
  );
}
