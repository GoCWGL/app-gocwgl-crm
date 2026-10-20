import type { Metadata } from "next";
import { TermsPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function Terms() {
  return <TermsPage />;
}
