import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalApp } from "@/features/portal";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default function PortalPage() {
  // PortalApp is client-only (session restore, ?as= for the admin's "View as client"),
  // so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <PortalApp />
    </Suspense>
  );
}
