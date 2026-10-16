import type { Metadata } from "next";
import { AdminApp } from "@/features/admin";

export const metadata: Metadata = {
  title: "Admin CRM",
};

export default function AdminPage() {
  return <AdminApp />;
}
