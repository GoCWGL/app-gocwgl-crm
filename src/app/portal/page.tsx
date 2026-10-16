import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalApp } from "@/features/portal";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default function PortalPage() {
  // PortalApp reads ?as=&biz= (used by the admin's "View as client"),
  // so it renders on the client inside a Suspense boundary.
  return (
    <Suspense>
      <PortalApp />
    </Suspense>
  );
}
