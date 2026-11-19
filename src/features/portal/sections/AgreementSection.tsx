"use client";

import { useState } from "react";
import { Button, Checkbox, FormError, Icon, LoadState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { useAcceptMyVaAgreement, useMyVaAgreement } from "@/utils/hooks/useClientWork";
import { ClientVaAgreementDocument } from "../components/ClientVaAgreement";
import { VaRequestModal } from "../components/VaRequestModal";
import { VA_MAINTENANCE_FEE_DOLLARS, VA_TRAINING_FEE_DOLLARS_PER_HOUR, VA_TRAINING_MONTHS } from "../lib/vaAgreement";
import { useShowPackages } from "../lib/vaAccess";
import { usePortal } from "../state/PortalContext";

/** The agreement's key terms, at the top of the page. */
const TERMS = [
  { label: "Maintenance fee", value: `$${VA_MAINTENANCE_FEE_DOLLARS[10]}–$${VA_MAINTENANCE_FEE_DOLLARS[40]}`, unit: "/ month" },
  { label: "Training fee", value: `$${VA_TRAINING_FEE_DOLLARS_PER_HOUR}`, unit: "/ VA hour" },
  { label: "Training period", value: String(VA_TRAINING_MONTHS), unit: "months per VA" },
  { label: "Payment terms", value: "3", unit: "business days" },
];

/**
 * Client portal › VA › Agreement: the VA agreement on its own page, like the VA portal's, so the client can come back
 * anytime to check it. Before their first VA request they tick that they've read and understand it (saved as soon as
 * it's ticked; the server refuses a request until then). Then Request a VA opens right here.
 */
export function AgreementSection() {
  const { readOnly, goTo } = usePortal();
  const query = useMyVaAgreement();
  const accept = useAcceptMyVaAgreement();
  // Request a VA shows once the team turns on the VA packages for this client.
  const canRequest = useShowPackages("va") && !readOnly;
  const [asking, setAsking] = useState(false);
  const acceptedAt = query.data?.acceptedAt ?? null;
  const pending = query.isSuccess && !acceptedAt;

  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading your agreement…">
        <section className={cn("cagr", pending && "cagr--pending")} aria-labelledby="cagr-title">
          <div className="cagr__main">
            <span className="cagr__eyebrow">GoCWGL · Client VA agreement</span>
            <h3 id="cagr-title" className="cagr__title">
              Virtual assistant services agreement
            </h3>
            <p className="cagr__lead">
              How the monthly maintenance fee, the training fee for your VA’s first {VA_TRAINING_MONTHS} months, your VA’s pay and billing work.
              Come back to it anytime.
            </p>
            <span className={cn("cagr__status", acceptedAt ? "cagr__status--done" : "cagr__status--pending")}>
              <Icon name={acceptedAt ? "circleCheck" : "clock"} size={13} />
              {acceptedAt ? `Accepted ${formatShort(acceptedAt)}` : "Awaiting your confirmation"}
            </span>
            <dl className="cagr__terms">
              {TERMS.map((t) => (
                <div key={t.label} className="cagr__term">
                  <dt>{t.label}</dt>
                  <dd>
                    {t.value}
                    <small> {t.unit}</small>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className={cn("cagr-confirm", acceptedAt && "cagr-confirm--done")}>
            <span className="cagr-confirm__label">{acceptedAt ? "Confirmed" : "Your confirmation"}</span>
            <Checkbox
              brand
              checked={!!acceptedAt || accept.isPending}
              disabled={!!acceptedAt || readOnly || accept.isPending}
              onChange={(e) => e.target.checked && accept.mutate()}
              label="I’ve read the GoCWGL VA agreement and I understand it."
            />
            <FormError error={accept.error} />
            {acceptedAt ? (
              <>
                <span className="cagr-confirm__note">Accepted on {formatShort(acceptedAt)}.</span>
                {canRequest ? (
                  <Button variant="primary" onClick={() => setAsking(true)}>
                    <Icon name="userPlus" size={14} /> Request a VA
                  </Button>
                ) : (
                  !readOnly && (
                    <span className="cagr-confirm__note">
                      GoCWGL turns on Request a VA for your account. Message us through Request support if you need a VA.
                    </span>
                  )
                )}
              </>
            ) : (
              <span className="cagr-confirm__note">
                {readOnly
                  ? "Only the client can confirm this. You’re viewing their portal."
                  : accept.isPending
                    ? "Saving…"
                    : "Read the agreement below, then tick the box. You can request your first VA right after."}
              </span>
            )}
          </aside>
        </section>

        <ClientVaAgreementDocument />
      </LoadState>

      {asking && <VaRequestModal onClose={() => setAsking(false)} onSent={() => goTo("team")} />}
    </div>
  );
}
