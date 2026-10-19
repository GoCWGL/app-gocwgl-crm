import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPage } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  // SignInPage reads ?reset_token=, ?invite= and ?oauth= from the address.
  return (
    <Suspense>
      <SignInPage />
    </Suspense>
  );
}
