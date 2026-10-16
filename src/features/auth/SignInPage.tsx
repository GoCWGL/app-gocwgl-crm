"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";
import { DEMO_ADMIN_EMAIL, DEMO_CLIENT_EMAIL } from "@/data/auth";
import { AuthBrandPanel } from "./components/AuthBrandPanel";
import { AuthNotice } from "./components/AuthNotice";
import { ForgotForm } from "./components/ForgotForm";
import { LoginForm } from "./components/LoginForm";
import { SignedInCard } from "./components/SignedInCard";
import { SignupForm } from "./components/SignupForm";
import { VerifyForm } from "./components/VerifyForm";
import { EMPTY_SIGNUP, type AuthMode, type Notice, type SignupData, type VerifyReason } from "./types";

/**
 * Sign in, sign up, forgot password and the security-code step.
 * Admin emails (see data/auth.ts) go through a 2-step code and land on /admin;
 * everyone else lands on the client portal.
 */
export function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [notice, setNotice] = useState<Notice>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [signup, setSignup] = useState<SignupData>(EMPTY_SIGNUP);
  const [verifyReason, setVerifyReason] = useState<VerifyReason>("signup");
  const [doneAfterSignup, setDoneAfterSignup] = useState(false);

  const go = (next: AuthMode, nextNotice: Notice = null) => {
    setMode(next);
    setNotice(nextNotice);
  };

  const backToLogin = () => {
    setIsAdmin(false);
    go("login");
  };

  const head = getHeading(mode, { verifyReason, doneAfterSignup, isAdmin, signupEmail: signup.email });

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
              onAdminSignIn={() => {
                setIsAdmin(true);
                setVerifyReason("admin2fa");
                go("verify");
              }}
              onClientSignIn={() => {
                setIsAdmin(false);
                setDoneAfterSignup(false);
                go("done");
              }}
              onForgot={() => go("forgot")}
              onSignup={() => go("signup")}
            />
          )}

          {mode === "signup" && (
            <SignupForm
              data={signup}
              onChange={(patch) => setSignup((s) => ({ ...s, ...patch }))}
              onCreated={() => {
                setVerifyReason("signup");
                go("verify", { kind: "success", text: "Account created. One last step: confirm your email." });
              }}
              onLogin={backToLogin}
            />
          )}

          {mode === "forgot" && (
            <ForgotForm
              initialEmail={loginEmail}
              onSent={(email) =>
                setNotice({
                  kind: "success",
                  text: `If ${email} has an account, a reset link is on its way. It expires in 30 minutes.`,
                })
              }
              onBack={backToLogin}
            />
          )}

          {mode === "verify" && (
            <VerifyForm
              reason={verifyReason}
              onVerified={() => {
                setDoneAfterSignup(verifyReason === "signup");
                go("done");
              }}
              onResend={() => setNotice({ kind: "info", text: `New code sent to ${signup.email || "your email"}.` })}
              onBack={backToLogin}
            />
          )}

          {mode === "done" && (
            <SignedInCard
              {...getSignedInSummary({ doneAfterSignup, isAdmin, signup, loginEmail })}
              onContinue={() => router.push(!doneAfterSignup && isAdmin ? "/admin" : "/portal")}
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
function getHeading(
  mode: AuthMode,
  ctx: { verifyReason: VerifyReason; doneAfterSignup: boolean; isAdmin: boolean; signupEmail: string },
) {
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
    case "verify":
      return ctx.verifyReason === "signup"
        ? {
            kicker: "VERIFY EMAIL",
            title: "Check your inbox",
            sub: `We sent a 6-digit code to ${ctx.signupEmail || "your email"}.`,
          }
        : {
            kicker: "ADMIN ACCOUNT DETECTED",
            title: "Enter your security code",
            sub: "This is a GoCWGL admin account. Open your authenticator app and enter the 6-digit code.",
          };
    case "done":
      return ctx.doneAfterSignup
        ? {
            kicker: "ACCOUNT READY",
            title: "You are all set",
            sub: "Your portal is ready. We will guide you through the next steps.",
          }
        : {
            kicker: "SIGNED IN",
            title: "You are in",
            sub: ctx.isAdmin
              ? "Admin account, redirecting you to the admin dashboard."
              : "Redirecting you to your client portal.",
          };
    default:
      return { kicker: "SECURE ACCESS", title: "Welcome back", sub: "Sign in to your GoCWGL account." };
  }
}

function getSignedInSummary(ctx: { doneAfterSignup: boolean; isAdmin: boolean; signup: SignupData; loginEmail: string }) {
  if (ctx.doneAfterSignup) {
    return {
      who: `${ctx.signup.name || "New client"} · ${ctx.signup.business || "Your business"}`,
      email: ctx.signup.email,
      steps: ["Email verified", "Portal created", "Welcome email sent to GoCWGL team"],
      cta: "Go to my portal",
    };
  }
  if (ctx.isAdmin) {
    return {
      who: "GoCWGL Admin",
      email: ctx.loginEmail || DEMO_ADMIN_EMAIL,
      steps: ["Password checked", "Admin account detected", "Two-step check passed", "Redirecting to admin dashboard"],
      cta: "Go to admin dashboard",
    };
  }
  return {
    who: "Rahman Wellness",
    email: ctx.loginEmail || DEMO_CLIENT_EMAIL,
    steps: ["Password checked", "Client account", "Redirecting to client portal"],
    cta: "Go to my portal",
  };
}
