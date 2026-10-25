"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { roleLabel } from "@/data/admin";
import { refresh } from "@/utils/api/client";
import type { SessionResponse, User } from "@/utils/api/models";
import { getSession, useSession } from "@/utils/auth/session";
import { acceptSession } from "@/utils/hooks/useAuth";
import { AcceptInviteForm } from "./components/AcceptInviteForm";
import { AuthBrandPanel } from "./components/AuthBrandPanel";
import { AuthNotice } from "./components/AuthNotice";
import { ForgotForm } from "./components/ForgotForm";
import { LoginForm } from "./components/LoginForm";
import { ResetPasswordForm } from "./components/ResetPasswordForm";
import { SignedInCard } from "./components/SignedInCard";
import { SignupForm } from "./components/SignupForm";
import { VerifyForm } from "./components/VerifyForm";
import { EMPTY_SIGNUP, type AuthMode, type Notice, type SignupData, type VerifyReason } from "./types";

const OAUTH_NOTICES: Record<string, Notice> = {
  unverified: {
    kind: "warning",
    text: "That account’s email isn’t confirmed with the provider. Sign in with your email and password instead.",
  },
  error: { kind: "warning", text: "We couldn’t sign you in with that provider. Please try again or use your password." },
  cancelled: { kind: "info", text: "Sign-in was cancelled." },
};

/**
 * Where a signed-in user goes, straight after sign-in:
 * team roles (owner = Super Admin, admin, sales, viewer) → the CRM dashboard; clients → their portal.
 * The API sets `isStaff`; staff without 2-step get a reminder in the CRM (`?enroll=mfa`) instead of a detour.
 */
function homeFor(user: User | null | undefined, enrollMfa = false): string {
  if (!user) return "/login";
  if (!user.isStaff) return "/portal";
  return enrollMfa ? "/admin?enroll=mfa" : "/admin";
}

/**
 * Sign in, sign up, forgot / reset password, accept invite and the security-code step.
 * The API decides who is staff (→ /admin) and who is a client (→ /portal).
 */
/** Links from emails and the Google / Microsoft round trip land on /login with one of these. */
function readLink(params: URLSearchParams) {
  return { reset: params.get("reset_token"), invite: params.get("invite"), oauth: params.get("oauth") };
}

/** A client's sign-up link (/login?ref=ID, from their Affiliate page) opens sign-up with the referral ID filled in. */
function readReferral(params: URLSearchParams): string {
  return (params.get("ref") ?? "").trim().slice(0, 32);
}

function initialScreen(link: ReturnType<typeof readLink>): { mode: AuthMode; notice: Notice } {
  if (link.reset) return { mode: "reset", notice: null };
  if (link.invite) return { mode: "invite", notice: null };
  if (link.oauth === "mfa") return { mode: "verify", notice: null };
  if (link.oauth && link.oauth !== "success") return { mode: "login", notice: OAUTH_NOTICES[link.oauth] ?? OAUTH_NOTICES.error };
  return { mode: "login", notice: null };
}

export function SignInPage() {
  const router = useRouter();
  const { status } = useSession();
  const params = useSearchParams();
  const [link] = useState(() => readLink(params));
  const [referral] = useState(() => readReferral(params));
  const [first] = useState(() => {
    const screen = initialScreen(link);
    return referral && screen.mode === "login" && !screen.notice ? { mode: "signup" as AuthMode, notice: null } : screen;
  });
  const [mode, setMode] = useState<AuthMode>(first.mode);
  const [notice, setNotice] = useState<Notice>(first.notice);
  const [loginEmail, setLoginEmail] = useState("");
  const [signup, setSignup] = useState<SignupData>(() => ({ ...EMPTY_SIGNUP, referral }));
  // After Google / Microsoft sign-in the 2-step challenge travels in a cookie, so there is no mfaToken.
  const [verifyReason, setVerifyReason] = useState<VerifyReason>(link.oauth === "mfa" ? "admin2fa" : "signup");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [doneAfterSignup, setDoneAfterSignup] = useState(false);
  const [session, setSessionState] = useState<{ user: User; enrollMfa: boolean } | null>(null);
  const resetToken = link.reset ?? "";
  const inviteToken = link.invite ?? "";
  const handledParams = useRef(false);
  const fromLink = !!(link.reset || link.invite || link.oauth);

  const go = (next: AuthMode, nextNotice: Notice = null) => {
    setMode(next);
    setNotice(nextNotice);
  };

  const backToLogin = () => {
    setMfaToken(null);
    go("login");
  };

  const signedIn = (s: SessionResponse, afterSignup = false) => {
    acceptSession(s);
    setDoneAfterSignup(afterSignup);
    setSessionState({ user: s.user, enrollMfa: !!s.mfaEnrollmentRequired });
    go("done");
    router.replace(homeFor(s.user, !!s.mfaEnrollmentRequired));
  };

  // Tidy the address bar, and finish a Google / Microsoft sign-in by trading the new cookie for a session.
  useEffect(() => {
    if (handledParams.current || !fromLink) return;
    handledParams.current = true;
    window.history.replaceState(null, "", "/login");
    if (link.oauth !== "success") return;
    void refresh().then((ok) => {
      const { user } = getSession();
      if (ok && user) {
        setSessionState({ user, enrollMfa: !!user.isStaff && !user.mfaEnabled });
        go("done");
        router.replace(homeFor(user, !!user.isStaff && !user.mfaEnabled));
      } else go("login", OAUTH_NOTICES.error);
    });
  }, [fromLink, link.oauth, router]);

  // Already signed in (the session was restored from the cookie): go straight to the right app.
  useEffect(() => {
    // A sign-up link (?ref=) opens on sign-up, but someone already signed in still goes to their app.
    if (status !== "authenticated" || fromLink || (mode !== "login" && !(referral && mode === "signup"))) return;
    const { user } = getSession();
    if (user) router.replace(homeFor(user));
  }, [status, mode, router, fromLink, referral]);

  const head = getHeading(mode, { verifyReason, doneAfterSignup, isStaff: !!session?.user.isStaff, email: verifyEmail });

  return (
    <div className="auth">
      <AuthBrandPanel />

      <main className="auth-panel">
        <div className="auth-panel__inner">
          <div className="stack stack--6">
            <span className="kicker">{head.kicker}</span>
            <h2 className="auth-panel__title">{head.title}</h2>
            <p className="auth-panel__sub">{head.sub}</p>
          </div>

          <AuthNotice notice={notice} />

          {mode === "login" && (
            <LoginForm
              email={loginEmail}
              onEmailChange={setLoginEmail}
              onSignedIn={(s) => signedIn(s)}
              onMfaRequired={(token) => {
                setMfaToken(token);
                setVerifyReason("admin2fa");
                go("verify");
              }}
              onEmailNotVerified={(email, message) => {
                setVerifyEmail(email);
                setVerifyReason("signup");
                go("verify", { kind: "info", text: message });
              }}
              onForgot={() => go("forgot")}
              onSignup={() => go("signup")}
            />
          )}

          {mode === "signup" && (
            <SignupForm
              data={signup}
              onChange={(patch) => setSignup((s) => ({ ...s, ...patch }))}
              onCreated={(message) => {
                setVerifyEmail(signup.email.trim());
                setVerifyReason("signup");
                go("verify", { kind: "success", text: message || "Account created. One last step: confirm your email." });
              }}
              onLogin={backToLogin}
            />
          )}

          {mode === "forgot" && (
            <ForgotForm
              initialEmail={loginEmail}
              onSent={(message) => setNotice({ kind: "success", text: message })}
              onBack={backToLogin}
            />
          )}

          {mode === "reset" && resetToken && (
            <ResetPasswordForm
              token={resetToken}
              onDone={() =>
                go("login", { kind: "success", text: "Password changed. Sign in with your new password." })
              }
              onBack={backToLogin}
            />
          )}

          {mode === "invite" && inviteToken && (
            <AcceptInviteForm token={inviteToken} onAccepted={(s) => signedIn(s, true)} onBack={backToLogin} />
          )}

          {mode === "verify" && (
            <VerifyForm
              reason={verifyReason}
              email={verifyEmail}
              mfaToken={mfaToken}
              onVerified={(s) => signedIn(s, verifyReason === "signup")}
              onResent={(text) => setNotice({ kind: "info", text })}
              onBack={backToLogin}
            />
          )}

          {mode === "done" && session && (
            <SignedInCard
              {...getSignedInSummary(session.user, { doneAfterSignup, enrollMfa: session.enrollMfa })}
              onContinue={() => router.push(homeFor(session.user, session.enrollMfa))}
            />
          )}

          <p className="auth-secure">
            <Icon name="lock" size={13} strokeWidth={2.2} />
            Encrypted connection · Need help? <a href="mailto:support@gocwgl.com">support@gocwgl.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------- Copy
function getHeading(mode: AuthMode, ctx: { verifyReason: VerifyReason; doneAfterSignup: boolean; isStaff: boolean; email: string }) {
  switch (mode) {
    case "signup":
      return {
        kicker: "NEW CLIENT ACCOUNT",
        title: "Create your portal account",
        sub: "Set up your login to track your system, reports and billing.",
      };
    case "forgot":
      return {
        kicker: "RESET PASSWORD",
        title: "Forgot your password?",
        sub: "Enter your email and we will send you a reset link.",
      };
    case "reset":
      return {
        kicker: "RESET PASSWORD",
        title: "Choose a new password",
        sub: "You’ll be signed out on every device, then you can sign in with the new password.",
      };
    case "invite":
      return {
        kicker: "YOU’RE INVITED",
        title: "Accept your invitation",
        sub: "Choose a password to finish setting up your account.",
      };
    case "verify":
      return ctx.verifyReason === "signup"
        ? {
            kicker: "VERIFY EMAIL",
            title: "Check your inbox",
            sub: `We sent a 6-digit code to ${ctx.email || "your email"}.`,
          }
        : {
            kicker: "2-STEP CHECK",
            title: "Enter your security code",
            sub: "Open your authenticator app and enter the 6-digit code.",
          };
    case "done":
      return ctx.doneAfterSignup
        ? {
            kicker: "ACCOUNT READY",
            title: "You are all set",
            sub: "Your account is ready. We will guide you through the next steps.",
          }
        : {
            kicker: "SIGNED IN",
            title: "You are in",
            sub: ctx.isStaff ? "Taking you to the CRM dashboard." : "Taking you to your client portal.",
          };
    default:
      return { kicker: "SECURE ACCESS", title: "Welcome back", sub: "Sign in to your GoCWGL account." };
  }
}

function getSignedInSummary(user: User, ctx: { doneAfterSignup: boolean; enrollMfa: boolean }) {
  const role = user.isStaff ? `${roleLabel(user.role)} · GoCWGL team` : user.portalRole === "viewer" ? "Portal viewer" : "Client";
  const steps = ctx.doneAfterSignup
    ? ["Email verified", user.isStaff ? "Team account ready" : "Portal ready"]
    : ["Password checked", user.mfaEnabled ? "Two-step check passed" : user.isStaff ? "Team account" : "Client account"];
  steps.push(user.isStaff ? "Opening the CRM…" : "Opening your portal…");
  return {
    who: `${user.fullName || user.email} · ${role}`,
    email: user.email,
    steps,
    cta: user.isStaff ? "Go to the CRM" : "Go to my portal",
  };
}
