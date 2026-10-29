export type AuthMode = "login" | "signup" | "forgot" | "verify" | "reset" | "invite" | "done";

/** Why the code screen is shown: confirming a new email, or a 2-step check after the password. */
export type VerifyReason = "signup" | "admin2fa";

export type NoticeKind = "info" | "success" | "warning";

export type Notice = { kind: NoticeKind; text: string } | null;

export type SignupData = {
  firstName: string;
  lastName: string;
  business: string;
  email: string;
  phone: string;
  /** Referral ID of the client who referred them (their portal’s Affiliate page). */
  referral: string;
  password: string;
  agree: boolean;
};

export const EMPTY_SIGNUP: SignupData = {
  firstName: "",
  lastName: "",
  business: "",
  email: "",
  phone: "",
  referral: "",
  password: "",
  agree: false,
};
