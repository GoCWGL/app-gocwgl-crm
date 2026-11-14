import { Button, Icon } from "@/components/ui";

type Props = {
  kind: "discovery" | "interview";
  /** Who it's for, read out by screen readers ("Interview Ana Cruz"). */
  name: string;
  onClick: () => void;
};

/**
 * Onboarding rows: opens the call invite (interview for a VA, discovery call for a client). Sits under the name, so
 * it's in view even when the table scrolls sideways (phones, or a narrow page next to a second menu).
 */
export function CallInviteButton({ kind, name, onClick }: Props) {
  const label = kind === "discovery" ? "Discovery call" : "Interview";
  return (
    <Button
      variant="primary"
      size="sm"
      onClick={onClick}
      aria-label={`${label}: email ${name} a booking link`}
      title={`Email ${name} a link to book ${kind === "discovery" ? "a discovery call" : "an interview"}`}
      className="data-table__row-action"
    >
      <Icon name="calendarCheck" size={14} /> {label}
    </Button>
  );
}
