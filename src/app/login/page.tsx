import type { Metadata } from "next";
import { SignInPage } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return <SignInPage />;
}
