"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Used for aria-labelledby. */
  titleId: string;
  title: ReactNode;
  kicker?: ReactNode;
  /** Optional icon / avatar shown left of the title. */
  media?: ReactNode;
  /** Extra line under the title. */
  subtitle?: ReactNode;
  /** "dialog" is centered; "drawer" slides in from the right. */
  variant?: "dialog" | "drawer";
  width?: number;
  /** Render the panel as a <form> with this submit handler. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  footer?: ReactNode;
  /** Extra class on the overlay, for a page's own sizing or entrance. */
  className?: string;
  /** Buttons in the header, before the close button (e.g. widen). */
  headerActions?: ReactNode;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  titleId,
  title,
  kicker,
  media,
  subtitle,
  variant = "dialog",
  width,
  onSubmit,
  footer,
  className,
  headerActions,
  children,
}: ModalProps) {
  const root = useRef<HTMLDivElement>(null);
  useExitAnimation(root, open);
  // Close with Escape: only the topmost dialog, so a dialog opened over another closes on its own.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = document.querySelectorAll(".modal");
      if (open[open.length - 1] === root.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const Panel = onSubmit ? "form" : "section";
  const style = width ? ({ "--modal-width": `${width}px` } as CSSProperties) : undefined;

  return (
    <div ref={root} className={cn("modal", variant === "drawer" && "modal--drawer", className)}>
      <button type="button" className="modal__backdrop" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <Panel
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={style}
        onSubmit={onSubmit}
        autoComplete={onSubmit ? "off" : undefined}
      >
        <header className="modal__header">
          {media}
          <div className="modal__heading">
            {kicker && <span className="kicker">{kicker}</span>}
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle && <span className="text-small">{subtitle}</span>}
          </div>
          {headerActions}
          <button type="button" className="icon-btn icon-btn--lg" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </Panel>
    </div>
  );
}

/** Longest exit animation (`.modal--closing` in components/_modal.scss), plus a little slack. */
const EXIT_MS = 320;

/**
 * Animates a pop-up out when it closes, however it's closed. Most callers unmount
 * the modal outright (`{x && <Modal open …/>}`), so it can't wait to animate itself.
 * Instead, once its element has actually left the page, a static copy is put in
 * <body> to play the closing animation and then removed. The copy is inert and
 * hidden from assistive tech; the real dialog (and focus handling) is already gone.
 */
function useExitAnimation(root: RefObject<HTMLDivElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const node = root.current;
    if (!open || !node) return;
    return () => {
      // Read scroll positions now, while the element is still laid out.
      const scrollTops = [node, ...node.querySelectorAll<HTMLElement>(".modal__body")].map((el) => el.scrollTop);
      // Wait until React has finished the commit: if the element is still on the page
      // this was only React re-running effects (dev Strict Mode), not a close.
      queueMicrotask(() => {
        if (node.isConnected) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const ghost = node.cloneNode(true) as HTMLDivElement;
        ghost.classList.add("modal--closing");
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        ghost.removeAttribute("id");
        ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        document.body.appendChild(ghost);
        [ghost, ...ghost.querySelectorAll<HTMLElement>(".modal__body")].forEach((el, i) => {
          el.scrollTop = scrollTops[i] ?? 0;
        });
        window.setTimeout(() => ghost.remove(), EXIT_MS);
      });
    };
  }, [root, open]);
}
