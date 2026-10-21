import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingPage } from "@/features/booking/BookingPage";

export const metadata: Metadata = {
  title: "Book a call",
};

export default function Book() {
  // BookingPage reads the slug from the URL, so it renders inside a Suspense boundary.
  return (
    <Suspense>
      <BookingPage />
    </Suspense>
  );
}
