"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/** Decorative grid paper and color blobs behind the main column. */
export function AppBackdrop() {
  return (
    <div className="app-backdrop" aria-hidden="true">
      <div className="app-backdrop__blob app-backdrop__blob--cyan" />
      <div className="app-backdrop__blob app-backdrop__blob--violet" />
      <div className="app-backdrop__blob app-backdrop__blob--orange" />
    </div>
  );
}

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /** Rendered outside <main>, e.g. full-screen overlays. */
  overlays?: ReactNode;
};

// Phones and portrait tablets (same width as the `md` breakpoint in the styles).
const DRAWER_QUERY = "(max-width: 800px)";

// Clicking one of these in the drawer goes to a page, so the drawer closes. Buttons that only open a
// sub-menu (they carry aria-expanded) or are locked keep it open.
const NAVIGATES = ".nav-item:not([aria-expanded]):not([aria-disabled]), .profile-button, .subnav__item";

/**
 * Sidebar on the left, scrolling main column on the right. On phones and tablets the sidebar becomes a
 * drawer opened from a slim top bar.
 */
export function AppShell({ sidebar, children, overlays }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia(DRAWER_QUERY);
    const close = () => setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onResize = () => !mq.matches && close();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const onNavClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(NAVIGATES)) setMenuOpen(false);
  };

  return (
    <div className={cn("app-shell", menuOpen && "app-shell--menu-open")}>
      <header className="app-topbar">
        <button
          type="button"
          className="app-topbar__menu"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="app-drawer"
        >
          <Icon name="menu" size={20} strokeWidth={2.2} />
        </button>
        <Image src={logoWordmark} alt="GoCWGL" height={26} className="app-topbar__logo" priority />
      </header>

      <div className="app-drawer" id="app-drawer" onClick={onNavClick}>
        <button
          type="button"
          className="app-drawer__close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
        >
          <Icon name="close" size={18} strokeWidth={2.2} />
        </button>
        {sidebar}
      </div>
      <div className="app-drawer__scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <main className="app-main">
        <AppBackdrop />
        {children}
      </main>
      {overlays}
    </div>
  );
}
