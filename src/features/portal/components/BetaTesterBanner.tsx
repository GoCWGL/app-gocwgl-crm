"use client";

import { Button, Icon } from "@/components/ui";
import { useOverview } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

/**
 * Top of every portal page for a client the team marked as a beta tester (client profile › Portal menu › Beta tester).
 * Hidden for everyone else.
 */
export function BetaTesterBanner() {
  const { openSupport, readOnly } = usePortal();
  const beta = useOverview(30).data?.betaTester === true;
  if (!beta) return null;

  return (
    <section className="beta-banner" aria-label="Beta tester">
      <span className="beta-banner__icon" aria-hidden="true">
        <Icon name="sparkle" size={18} strokeWidth={2} />
      </span>
      <span className="beta-banner__text">
        <span className="beta-banner__kicker">BETA TESTER</span>
        <span className="beta-banner__title">You’re testing the new client portal</span>
        <span className="beta-banner__body">
          Thanks for trying it first. Some pages may still change. If something looks wrong or doesn’t work, tell us.
        </span>
      </span>
      {!readOnly && (
        <Button size="sm" variant="outline" className="beta-banner__action" onClick={() => openSupport()}>
          <Icon name="mail" size={13} />
          Send feedback
        </Button>
      )}
    </section>
  );
}
