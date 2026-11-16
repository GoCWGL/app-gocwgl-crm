"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { useMe } from "@/utils/hooks/useUsers";

/** "Remind me later" hides the card for this long (per account, per browser). */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const key = (userId: string) => `gocwgl.mfa-reminder.${userId}`;

function snoozedUntil(userId: string): number {
  try {
    return Number(window.localStorage.getItem(key(userId))) || 0;
  } catch {
    return 0;
  }
}

/**
 * Dashboard step for VAs and clients who haven't turned on 2-step verification: highly recommended, not required.
 * Hidden for staff (in "View as" they're looking at someone else's portal) and once it's on.
 */
export function TwoStepReminder({ onSetUp }: { onSetUp: () => void }) {
  const me = useMe().data;
  const [snoozed, setSnoozed] = useState<string | null>(null);
  // When the dashboard opened: a snooze that runs out shows the card again on the next visit.
  const [openedAt] = useState(() => Date.now());
  if (!me || me.isStaff || me.mfaEnabled) return null;
  if (snoozed === me.id || (typeof window !== "undefined" && snoozedUntil(me.id) > openedAt)) return null;

  const later = () => {
    try {
      window.localStorage.setItem(key(me.id), String(Date.now() + SNOOZE_MS));
    } catch {
      // Private mode: it just hides until the page reloads.
    }
    setSnoozed(me.id);
  };

  return (
    <section className="card reminder-banner" role="status" aria-label="Recommended: turn on 2-step verification">
      <span className="reminder-banner__icon" aria-hidden="true">
        <Icon name="shield" size={20} />
      </span>
      <span className="stack stack--2 u-grow">
        <span className="kicker kicker--sm">HIGHLY RECOMMENDED</span>
        <strong>Turn on 2-step verification</strong>
        <span className="text-small">
          Protect your account with a code from your phone when you sign in on a new device. It takes about a minute.
        </span>
      </span>
      <span className="cluster">
        <Button variant="outline" size="sm" onClick={later}>
          Remind me later
        </Button>
        <Button variant="primary" size="sm" onClick={onSetUp}>
          Set it up <Icon name="arrowRight" size={14} />
        </Button>
      </span>
    </section>
  );
}
