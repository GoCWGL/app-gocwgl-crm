import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  onClose: () => void;
  /** Dark toast fixed to the bottom-right corner instead of an inline banner. */
  floating?: boolean;
};

export function Toast({ message, onClose, floating }: ToastProps) {
  if (!message) return null;
  return (
    <div className={cn("toast", floating && "toast--floating")} role="status">
      <span className="toast__dot" aria-hidden="true" />
      <span className="toast__text">{message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
