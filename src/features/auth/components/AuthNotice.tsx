import type { Notice } from "../types";

const ICONS = { info: "i", success: "✓", warning: "!" } as const;

export function AuthNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={`notice notice--${notice.kind}`} role="status">
      <span className="u-strong" aria-hidden="true">
        {ICONS[notice.kind]}
      </span>
      <span>{notice.text}</span>
    </div>
  );
}
