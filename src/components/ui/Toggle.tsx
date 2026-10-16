import { cn } from "@/lib/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name. Shown next to the switch only when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  className?: string;
};

/** On/off switch rendered as a pressed/unpressed button. */
export function Toggle({ checked, onChange, label, showLabel, className }: ToggleProps) {
  return (
    <button
      type="button"
      className={cn("toggle", className)}
      aria-pressed={checked}
      aria-label={showLabel ? undefined : label}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__knob" />
      </span>
      {showLabel && label}
    </button>
  );
}
