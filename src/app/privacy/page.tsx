import type { Metadata } from "next";
import { PrivacyPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function Privacy() {
  return <PrivacyPage />;
}
