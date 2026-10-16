import type { ReactNode } from "react";

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

/** Sidebar on the left, scrolling main column on the right. */
export function AppShell({ sidebar, children, overlays }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar}
      <main className="app-main">
        <AppBackdrop />
        {children}
      </main>
      {overlays}
    </div>
  );
}
