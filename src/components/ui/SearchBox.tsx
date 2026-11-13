import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Search clients". */
  label: string;
  placeholder?: string;
  id?: string;
  className?: string;
};

/** Search field with a magnifier icon (Clients, VAs). */
export function SearchBox({ value, onChange, label, placeholder = "Search name or email", id, className }: SearchBoxProps) {
  return (
    <label className={cn("search-box", className)}>
      <Icon name="search" size={15} />
      <input id={id} type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
