"use client";

import { Icon } from "@/components/ui";
import { kindInfo } from "./shared";

type Payment = {
  kind: string;
  accountName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  paymentLink?: string | null;
  details?: string | null;
};

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * How to pay, line by line: bank, account name and number, the payment link, other details.
 * `payNow` shows the link as a button (the client's invoice).
 */
export function PaymentLines({ payment, payNow }: { payment: Payment; payNow?: boolean }) {
  const info = kindInfo(payment.kind);
  const rows: Array<[string, string]> = [
    ...(payment.bankName ? [["Bank", payment.bankName] as [string, string]] : []),
    ...(payment.accountName ? [["Account name", payment.accountName] as [string, string]] : []),
    ...(payment.accountNumber ? [[info.number, payment.accountNumber] as [string, string]] : []),
  ];
  return (
    <div className="pay-lines">
      {rows.length > 0 && (
        <dl className="pay-lines__rows">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={k === info.number ? "is-number" : undefined}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {payment.paymentLink &&
        (payNow ? (
          <a className="btn btn--primary pay-lines__now" href={payment.paymentLink} target="_blank" rel="noopener noreferrer">
            <Icon name="card" size={14} /> Pay now with {info.label}
          </a>
        ) : (
          <a className="pay-lines__link" href={payment.paymentLink} target="_blank" rel="noopener noreferrer">
            <Icon name="link" size={12} /> {bare(payment.paymentLink)}
          </a>
        ))}
      {payment.details && <p className="va-pre pay-lines__details">{payment.details}</p>}
    </div>
  );
}
