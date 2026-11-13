"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { FormError } from "./LoadState";
import { Icon, type IconName } from "./Icon";
import { Modal } from "./Modal";

/**
 * A small "Are you sure?" pop-up before an action that's hard to undo (e.g. starting a build).
 * Rendered into <body> so it sits above any pop-up it's opened from.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  icon = "rocket",
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  icon?: IconName;
  pending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <Modal
      open
      width={460}
      onClose={onClose}
      titleId="confirm-dialog"
      className="confirm-dialog"
      title={title}
      media={
        <span className="confirm-dialog__icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" disabled={pending} onClick={onConfirm} autoFocus>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack stack--10">
        <FormError error={error} />
        <div className="confirm-dialog__body">{children}</div>
      </div>
    </Modal>,
    document.body,
  );
}
