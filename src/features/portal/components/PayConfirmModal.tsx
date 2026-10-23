"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, Textarea, buttonClass } from "@/components/ui";
import { formatCents } from "@/utils/format/money";
import { useCreatePortalTicket } from "@/utils/hooks/useSupport";
import { useMe } from "@/utils/hooks/useUsers";
import { usePortal } from "../state/PortalContext";

/** The invoice being paid through its Wise link. */
export type PayTarget = { number: string; totalCents: number; payUrl: string; what?: string };

/**
 * Before the client leaves for Wise: what they're paying, that verifying it takes up to 24 business hours (then we
 * email them), and that the name on the payment must match their portal account. Paid under another name (e.g. their
 * business or a partner)? They send the Wise transaction ID, which reaches the team as a support ticket.
 */
export function PayConfirmModal({
  target,
  start = "confirm",
  onClose,
}: {
  target: PayTarget;
  /** "other-name" opens straight on the transaction-ID form (they already paid under another name). */
  start?: "confirm" | "other-name";
  onClose: () => void;
}) {
  const { notify } = usePortal();
  const me = useMe().data;
  const name = me?.fullName?.trim() || "the name on your portal account";
  const ticket = useCreatePortalTicket();
  const [step, setStep] = useState(start);
  const [payer, setPayer] = useState("");
  const [txId, setTxId] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const total = formatCents(target.totalCents);

  const sendTicket = (e: FormEvent) => {
    e.preventDefault();
    if (!payer.trim() || !txId.trim()) return setTried(true);
    ticket.mutate(
      {
        type: "question",
        area: "Billing",
        title: `Payment under a different name: ${target.number}`,
        description: [
          `Invoice: ${target.number} (${total})${target.what ? ` for ${target.what}` : ""}`,
          `Portal account name: ${me?.fullName ?? ""}`,
          `Name on the payment: ${payer.trim()}`,
          `Wise transaction ID: ${txId.trim()}`,
          note.trim() && `Note: ${note.trim()}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        onSuccess: (t) => {
          notify(`Thanks! We sent ${t.code} to your team so they can match your payment.`);
          onClose();
        },
      },
    );
  };

  if (step === "other-name") {
    return (
      <Modal
        open
        onClose={onClose}
        onSubmit={sendTicket}
        titleId="pay-other-title"
        kicker={`INVOICE ${target.number}`}
        title="Paid under a different name?"
        subtitle="Tell us who paid and the Wise transaction ID, so your team can match the payment to your invoice."
        width={560}
        media={
          <IconTile tone="amber" size="lg">
            <Icon name="message" size={18} />
          </IconTile>
        }
        footer={
          <>
            <Button onClick={() => (start === "other-name" ? onClose() : setStep("confirm"))}>{start === "other-name" ? "Cancel" : "Back"}</Button>
            <Button type="submit" variant="primary" disabled={ticket.isPending}>
              {ticket.isPending ? "Sending…" : "Send to my team"}
            </Button>
          </>
        }
      >
        <Field label="Name on the payment" htmlFor="pay-payer" required hint={`Your portal account is under “${name}”.`}>
          <Input
            id="pay-payer"
            maxLength={120}
            value={payer}
            aria-invalid={tried && !payer.trim()}
            onChange={(e) => setPayer(e.target.value)}
            placeholder="e.g. Acme LLC"
          />
        </Field>
        <Field label="Wise transaction ID" htmlFor="pay-tx" required hint="It’s in your Wise receipt or the payment confirmation email from Wise.">
          <Input
            id="pay-tx"
            mono
            maxLength={100}
            value={txId}
            aria-invalid={tried && !txId.trim()}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="e.g. 1234567890"
          />
        </Field>
        <Field label="Anything else?" htmlFor="pay-note" hint="Optional">
          <Textarea id="pay-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {tried && (!payer.trim() || !txId.trim()) && (
          <p className="text-error" role="alert">
            Please add {[!payer.trim() && "the name on the payment", !txId.trim() && "the transaction ID"].filter(Boolean).join(" and ")}.
          </p>
        )}
        <FormError error={ticket.error} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      titleId="pay-confirm-title"
      kicker={`INVOICE ${target.number}`}
      title={`Pay ${total} with Wise`}
      subtitle={target.what}
      width={560}
      media={
        <IconTile brand size="lg">
          <Icon name="check" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <a
            className={buttonClass({ variant: "primary" })}
            href={target.payUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              notify("Wise opened in a new tab. We’ll email you once your payment is verified (up to 24 business hours).");
              onClose();
            }}
          >
            Continue to Wise ↗
          </a>
        </>
      }
    >
      <PaymentNotes reference={target.number} />
      <div className="inset inset--soft pay-confirm__other">
        <span className="text-small">
          Paying under a different name (e.g. your business or a partner)? Send us the Wise transaction ID after you pay so we can match it.
        </span>
        <Button variant="link" size="sm" onClick={() => setStep("other-name")}>
          Paid under a different name?
        </Button>
      </div>
    </Modal>
  );
}

/**
 * What to know before paying through Wise, shown wherever a client pays or requests a paid build: pay under the name on
 * their portal account, verification takes up to 24 business hours (then we email them), and a payment under another
 * name gets matched once they message us the Wise transaction ID from the portal.
 */
export function PaymentNotes({
  reference,
  later = false,
}: {
  reference?: string;
  /** Paid later, from the invoice (e.g. a CRM after the call). */ later?: boolean;
}) {
  const me = useMe().data;
  const name = me?.fullName?.trim() || "the name on your portal account";
  return (
    <ul className="pay-confirm">
      <li>
        <span className="text-strong">Pay under the name on your portal account:</span> <span className="text-strong">“{name}”</span>, so we can match
        the payment to your invoice
        {reference ? (
          <>
            . Please use <span className="u-mono">{reference}</span> as the payment reference.
          </>
        ) : (
          ". Please use your invoice number as the payment reference."
        )}
      </li>
      <li>
        <span className="text-strong">Verifying your payment takes up to 24 business hours.</span> Once it’s verified, we’ll email you and the invoice
        changes to Paid.
      </li>
      <li>
        <span className="text-strong">Paying under a different name</span> (e.g. your business or a partner)? After you pay, use{" "}
        <span className="text-strong">Paid under a different name?</span> on the invoice to message us the Wise transaction ID from your portal.
      </li>
      {later ? (
        <li>Your invoice comes after your discovery call, with its Wise payment link. It also shows on this request in your portal.</li>
      ) : (
        <li>Wise opens in a new tab, so you can come back to your portal anytime.</li>
      )}
    </ul>
  );
}
