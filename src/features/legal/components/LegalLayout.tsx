import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { LegalLinks } from "./LegalLinks";

type LegalLayoutProps = {
  kicker: string;
  title: string;
  /** Short line under the title, e.g. "Last updated October 20, 2026". */
  meta?: ReactNode;
  children: ReactNode;
};

/** Shared frame for /privacy, /terms and /status: logo bar, grid-paper hero, content column, footer. */
export function LegalLayout({ kicker, title, meta, children }: LegalLayoutProps) {
  return (
    <div className="legal">
      <header className="legal__bar">
        <Link href="/login" aria-label="GoCWGL sign in">
          <Image className="legal__logo" src={logoWordmark} alt="GoCWGL" priority />
        </Link>
        <Link className="legal__back" href="/login">
          ← Back to sign in
        </Link>
      </header>

      <section className="legal__hero">
        <div className="legal__inner">
          <span className="kicker">{kicker}</span>
          <h1 className="legal__title">{title}</h1>
          {meta && <p className="legal__meta">{meta}</p>}
        </div>
      </section>

      <main className="legal__body">
        <div className="legal__inner">{children}</div>
      </main>

      <footer className="legal__footer">
        <LegalLinks className="legal__inner" />
      </footer>
    </div>
  );
}
