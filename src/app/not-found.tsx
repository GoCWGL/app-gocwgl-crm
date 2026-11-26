import type { Metadata } from "next";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

export const metadata: Metadata = {
  title: "Page not found",
};

// Any URL that matches no route (and any notFound() call) lands here.
export default function NotFound() {
  return <NotFoundPage />;
}
