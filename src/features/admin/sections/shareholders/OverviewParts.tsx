import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

/** The dark card at the top of a tab: one headline number, what it means, and a few supporting figures. */
export function Hero({
  label,
  value,
  text,
  badge,
  actions,
  stats,
}: {
  label: string;
  value: ReactNode;
  text: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: ReactNode; hint?: ReactNode }>;
}) {
  return (
    <section className="ov-hero" aria-label={label}>
      <div className="ov-hero__main">
        <span className="ov-hero__label">{label}</span>
        <span className="ov-hero__value">
          {value} {badge}
        </span>
        <p className="ov-hero__text">{text}</p>
        {actions && <div className="ov-hero__actions">{actions}</div>}
      </div>
      {stats && (
        <dl className="ov-hero__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
              {s.hint && <span>{s.hint}</span>}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** "↑ growing" / "↓ shrinking": an arrow and a word, never color alone. */
export function Trend({ up, children }: { up: boolean; children: ReactNode }) {
  return (
    <span className={cn("ov-trend", up ? "is-up" : "is-down")}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span> {children}
    </span>
  );
}

/** A white card with a plain-words title, an optional line under it, and an action. */
export function Panel({ title, hint, action, children, className }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card ov-panel", className)} aria-label={title}>
      <header className="ov-panel__head">
        <div className="stack stack--2">
          <h3>{title}</h3>
          {hint && <span className="text-small">{hint}</span>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export type FlowStep = { label: string; hint?: string; value: string; icon: IconName; kind: "start" | "in" | "out" | "total" };

/** A sum, step by step: where it started, what came in and out, and the result. */
export function Flow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="ov-flow">
      {steps.map((s) => (
        <li key={s.label} className={`ov-flow__step is-${s.kind}`}>
          <span className="ov-flow__icon" aria-hidden="true">
            <Icon name={s.icon} size={15} />
          </span>
          <span className="ov-flow__label">
            {s.label}
            {s.hint && <span className="text-small">{s.hint}</span>}
          </span>
          <span className="ov-flow__value">{s.value}</span>
        </li>
      ))}
    </ol>
  );
}

/** Labelled bars on one scale. */
export function Bars({ rows }: { rows: Array<{ label: string; value: number; display: string; color: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="ov-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="ov-bars__head">
            <span>{r.label}</span>
            <b>{r.display}</b>
          </span>
          <span className="ov-bars__track" aria-hidden="true">
            <span style={{ width: r.value > 0 ? `max(4px, ${(r.value / max) * 100}%)` : 0, background: r.color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A dated list: entries, balances, upcoming dates. */
export function Entry({ date, title, hint, value, actions }: { date: string; title: ReactNode; hint?: ReactNode; value?: ReactNode; actions?: ReactNode }) {
  return (
    <li className="ov-entry">
      <span className="ov-entry__date">{date}</span>
      <span className="ov-entry__main">
        <span className="sh-text">{title}</span>
        {hint && <span className="text-small">{hint}</span>}
      </span>
      {value && <span className="ov-entry__value">{value}</span>}
      {actions && <span className="ov-entry__actions">{actions}</span>}
    </li>
  );
}
