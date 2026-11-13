import { Avatar } from "@/components/ui";
import { avatarTone, toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { STATE_LABEL, STATE_TONE, type VaState } from "../lib/vaTeam";

/** A VA's avatar with a presence dot (working · on break · offline). */
export function VaPresence({ id, name, state, size = "lg" }: { id: string; name: string; state: VaState; size?: "md" | "lg" | "xl" }) {
  return (
    <span className={cn("presence", `is-${state}`)}>
      <Avatar name={name} tone={avatarTone(id)} size={size} ring />
      <span className="presence__dot" aria-hidden="true" />
    </span>
  );
}

export function StateChip({ state, children }: { state: VaState; children?: React.ReactNode }) {
  return (
    <span className={cn("status-chip", `is-${state}`, toneClass(STATE_TONE[state]))}>
      <span className="status-chip__dot" aria-hidden="true" />
      {STATE_LABEL[state]}
      {children}
    </span>
  );
}
