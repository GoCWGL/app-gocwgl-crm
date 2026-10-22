import type { ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ Field
type FieldProps = {
  label?: ReactNode;
  /** id of the control, so clicking the label focuses it. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Darker, larger label (used on the sign-in page and previews). */
  strongLabel?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, required, strongLabel, className, children }: FieldProps) {
  const labelClass = cn("field__label", strongLabel && "field__label--strong");
  return (
    <div className={cn("field", className)}>
      {label &&
        (htmlFor ? (
          <label className={labelClass} htmlFor={htmlFor}>
            {label}
            {required && <span className="field__required"> *</span>}
          </label>
        ) : (
          <span className={labelClass}>
            {label}
            {required && <span className="field__required"> *</span>}
          </span>
        ))}
      {children}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  );
}

// --------------------------------------------------------------- Controls
type ControlSize = { size?: "sm" | "md"; mono?: boolean };

export function Input({
  className,
  size = "md",
  mono,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & ControlSize) {
  return <input className={cn("input", size === "sm" && "input--sm", mono && "input--mono", className)} {...rest} />;
}

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> &
  ControlSize & {
    options?: Array<SelectOption | string>;
    /** Optional first option with an empty value ("Any tag", "Choose…"). */
    placeholder?: string;
  };

export function Select({ className, size = "md", options, placeholder, children, ...rest }: SelectProps) {
  return (
    <select className={cn("select", size === "sm" && "select--sm", className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((opt) =>
        typeof opt === "string" ? (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ) : (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ),
      )}
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn("textarea", className)} {...rest} />;
}

// --------------------------------------------------------------- Checkbox
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  /** Orange check instead of cyan. */
  brand?: boolean;
};

export function Checkbox({ label, brand, className, ...rest }: CheckboxProps) {
  return (
    <label className={cn("check", brand && "check--brand", className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
