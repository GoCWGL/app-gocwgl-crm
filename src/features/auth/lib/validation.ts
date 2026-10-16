import { ADMIN_EMAILS } from "@/data/auth";
import { isEmail } from "@/lib/utils";

export function emailError(value: string): string {
  if (!value.trim()) return "Enter your email.";
  if (!isEmail(value)) return "That email doesn’t look right.";
  return "";
}

export function isAdminEmail(value: string): boolean {
  return ADMIN_EMAILS.includes(value.trim().toLowerCase());
}

export type PasswordStrength = {
  /** 0 (empty) to 4 (strong). */
  score: number;
  label: string;
};

const STRENGTH_LABELS = ["STRENGTH", "WEAK", "FAIR", "GOOD", "STRONG"];

export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password && score === 0) score = 1;
  return { score, label: STRENGTH_LABELS[score] };
}
