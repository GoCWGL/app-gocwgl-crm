"use client";

import { AgreementCard } from "../components/AgreementCard";

/**
 * VA portal › Agreement: the VA agreement on its own page. While there's something to sign (the agreement itself, or a
 * new client match) it's shown in full with the sign-off; afterwards, the agreement and each client's tile.
 */
export function AgreementSection() {
  return (
    <div className="page-stack">
      <AgreementCard show="pending" />
      <AgreementCard show="signed" openByDefault />
    </div>
  );
}
