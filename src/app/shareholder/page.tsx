import type { Metadata } from "next";
import { ShareholderApp } from "@/features/shareholder/ShareholderApp";

export const metadata: Metadata = {
  title: "Shareholder Dashboard",
};

export default function ShareholderPage() {
  return <ShareholderApp />;
}
