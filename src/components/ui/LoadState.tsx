import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/utils/errors";
import { Button } from "./Button";

type QueryLike = { isPending: boolean; isError: boolean; error: unknown; refetch?: () => unknown };

type LoadStateProps = {
  /** A TanStack query (or anything with the same flags). */
  query: QueryLike;
  /** Shown once loaded when there is nothing to list. */
  empty?: ReactNode;
  isEmpty?: boolean;
  loadingText?: string;
  inline?: boolean;
  children: ReactNode;
};

/** Loading, error and empty states for a section that waits on the API; renders children once there is data. */
export function LoadState({ query, empty, isEmpty, loadingText = "Loading…", inline, children }: LoadStateProps) {
  if (query.isPending) return <Loading text={loadingText} inline={inline} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} inline={inline} />;
  if (isEmpty && empty) return <div className={cn("empty-state", inline && "load-state--inline")}>{empty}</div>;
  return <>{children}</>;
}

export function Loading({ text = "Loading…", inline }: { text?: string; inline?: boolean }) {
  return (
    <div className={cn("load-state", inline && "load-state--inline")} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorState({ error, onRetry, inline }: { error: unknown; onRetry?: () => unknown; inline?: boolean }) {
  return (
    <div className={cn("load-state load-state--error", inline && "load-state--inline")} role="alert">
      <span>{errorMessage(error)}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Small "Coming soon" / "Not available yet" pill for features the backend hasn't built. */
export function SoonNote({ children = "Coming soon" }: { children?: ReactNode }) {
  return <span className="soon-note">{children}</span>;
}

/** An API error under a form (the message is written for end users). */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <span className="form-error" role="alert">
      {errorMessage(error)}
    </span>
  );
}
