"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { cn } from "@/lib/utils";
import { useReportHeight } from "./embed";

type PublicShellProps = {
  /** Inside an iframe: no logo bar, no page padding, and the height goes to the parent page. */
  embedded?: boolean;
  /** Narrow column for forms and surveys; booking uses the wide one. */
  narrow?: boolean;
  children: ReactNode;
};

/** Frame for the pages people outside the CRM open: booking links, forms and surveys. */
export function PublicShell({ embedded = false, narrow = false, children }: PublicShellProps) {
  const root = useRef<HTMLDivElement>(null);
  useReportHeight(embedded, root);
  return (
    <div ref={root} className={cn("public-page", embedded && "public-page--embedded")}>
      {!embedded && (
        <header className="public-page__bar">
          <Image className="public-page__logo" src={logoWordmark} alt="GoCWGL" priority />
        </header>
      )}
      <main className={cn("public-page__main", narrow && "public-page__main--narrow")}>{children}</main>
    </div>
  );
}

/** Centered message for "not found", "thanks" and similar states. */
export function PublicMessage({ title, icon, children }: { title: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="public-page__message" role="status">
      {icon}
      <h1 className="public-page__title">{title}</h1>
      {children}
    </div>
  );
}
