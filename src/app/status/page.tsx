import type { Metadata } from "next";
import { StatusPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "System Status",
};

export default function Status() {
  return <StatusPage />;
}
