export type AuthMode = "login" | "forgot" | "verify" | "reset" | "invite" | "done";

/** Why the code screen is shown: confirming a new email, or a 2-step check after the password. */
export type VerifyReason = "signup" | "admin2fa";

export type NoticeKind = "info" | "success" | "warning";

export type Notice = { kind: NoticeKind; text: string } | null;
