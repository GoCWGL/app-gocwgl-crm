import { Button, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

/** An empty Tasks or Projects list: an icon, what's missing, a line on what shows here, and the request button. */
export function WorkEmpty({
  icon,
  title,
  text,
  action,
  tone = "brand",
}: {
  icon: IconName;
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
  tone?: "brand" | "purple";
}) {
  return (
    <div className={cn("work-empty", `is-${tone}`)}>
      <span className="work-empty__icon" aria-hidden="true">
        <Icon name={icon} size={22} strokeWidth={1.8} />
      </span>
      <strong className="work-empty__title">{title}</strong>
      <span className="work-empty__text">{text}</span>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          <Icon name="plus" size={14} strokeWidth={2.4} /> {action.label}
        </Button>
      )}
    </div>
  );
}
