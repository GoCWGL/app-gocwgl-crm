"use client";

import { useState } from "react";
import { Badge, Button, FormError, Icon, IconTile, Modal } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import type { SubscriptionOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useCancelMySubscription } from "@/utils/hooks/useBilling";

const TONES: Record<string, Tone> = { Active: "green", "Awaiting payment": "amber", Trial: "purple", Paused: "neutral", Canceled: "slate" };
/** Client-facing status: the first invoice of a new plan is waiting on payment. */
const LABELS: Record<string, string> = { "Awaiting payment": "Pending payment", Canceled: "Cancelled" };

type SubscriptionCardProps = {
  sub: SubscriptionOut;
  readOnly: boolean;
  onCancelled: (message: string) => void;
};

/** The client's plan (e.g. yearly hosting): what it costs, when the next invoice comes, and a way to cancel it. */
export function SubscriptionCard({ sub, readOnly, onCancelled }: SubscriptionCardProps) {
  const cancel = useCancelMySubscription();
  const [confirming, setConfirming] = useState(false);
  const cancelled = sub.status === "Canceled";
  // Card plans are cancelled in Polar's portal, not here.
  const canCancel = !readOnly && !cancelled && !sub.managedByPolar;
  const every = sub.interval.toLowerCase();

  return (
    <section className="card subscription-card" aria-label="Your subscription">
      <div className="subscription-card__main">
        <IconTile brand size="lg">
          <Icon name="calendarCheck" size={18} />
        </IconTile>
        <div className="stack stack--4 u-grow">
          <span className="kicker">YOUR SUBSCRIPTION</span>
          <span className="subscription-card__plan">{sub.plan}</span>
          <span className="text-small">
            {formatCentsExact(sub.amountCents, sub.currency)} per {every}
            {cancelled
              ? " · You won’t be billed again."
              : sub.status === "Paused"
                ? " · Paused"
                : sub.nextBillingDate
                  ? ` · Next invoice ${formatLong(sub.nextBillingDate)}`
                  : ""}
          </span>
        </div>
        <div className="subscription-card__side">
          <Badge tone={TONES[sub.status] ?? "neutral"} dot>
            {LABELS[sub.status] ?? sub.status}
          </Badge>
          {canCancel && (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              Cancel subscription
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <Modal
          open
          width={460}
          onClose={() => setConfirming(false)}
          titleId="cancel-sub-title"
          kicker="SUBSCRIPTION"
          title="Cancel your subscription?"
          subtitle={`We’ll stop sending you invoices for ${sub.plan}. Any unpaid invoice for it is cancelled too.`}
          footer={
            <>
              <Button onClick={() => setConfirming(false)}>Keep subscription</Button>
              <Button
                variant="danger"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(undefined, {
                    onSuccess: () => {
                      setConfirming(false);
                      onCancelled("Your subscription was cancelled. You won’t be billed again.");
                    },
                  })
                }
              >
                {cancel.isPending ? "Cancelling…" : "Yes, cancel it"}
              </Button>
            </>
          }
        >
          <FormError error={cancel.error} />
        </Modal>
      )}
    </section>
  );
}
