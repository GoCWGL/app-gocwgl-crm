import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminApp } from "@/features/admin";

export const metadata: Metadata = {
  title: "Admin CRM",
};

export default function AdminPage() {
  // AdminApp reads ?tab= / ?section= deep links (e.g. from sign-in), so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <AdminApp />
    </Suspense>
  );
}
