"use client";

import { Avatar, Badge, Button, FormError, LoadState } from "@/components/ui";
import { avatarTone, type Tone } from "@/lib/tones";
import type { ContactOut, FunnelOut } from "@/utils/api/models";
import { formatCents } from "@/utils/format/money";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useAdminFunnels, useMarkFunnelPaid, useStartFunnelBuild } from "@/utils/hooks/usePortal";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

const PACKAGE_LABELS: Record<string, string> = { foundation: "Foundation Build", bundle: "Full Bundle", vip: "VIP Repeat Funnel" };
const STATUSES: Record<string, { label: string; tone: Tone }> = {
  quote: { label: "Needs a quote", tone: "cyan" },
  pay: { label: "Awaiting payment", tone: "amber" },
  queued: { label: "Paid · ready to build", tone: "green" },
  build: { label: "In build", tone: "brand" },
};

type Request = { typeKey?: string; offer?: string; audience?: string; notes?: string; package?: string | null };

/** Funnel requests that aren't live yet: waiting on a quote or payment, paid and ready, or in build. */
export const openFunnelRequests = (funnels: FunnelOut[]) => funnels.filter((f) => f.request && f.status in STATUSES);

/** Build Progress › Funnel requests: what each client asked for, whether it's paid, and a way to start the build. */
export function FunnelRequestsPanel({ canWrite }: { canWrite: boolean }) {
  const { update } = useAdmin();
  const query = useAdminFunnels();
  const contacts = useAllContacts().data ?? [];
  const markPaid = useMarkFunnelPaid();
  const start = useStartFunnelBuild();
  // Waiting on you first: paid and ready, then awaiting payment, then quotes, then those already in build.
  const order = ["queued", "pay", "quote", "build"];
  const requests = openFunnelRequests(query.data ?? []).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <LoadState
      query={query}
      isEmpty={!requests.length}
      empty="No open funnel requests. When a client uses “Request a new funnel” in their portal, it shows up here."
    >
      <FormError error={markPaid.error ?? start.error} />
      <div className="stack stack--10">
        {requests.map((f) => (
          <FunnelRequestCard
            key={f.id}
            funnel={f}
            contact={contacts.find((c) => c.id === f.contactId)}
            canWrite={canWrite}
            busy={markPaid.isPending || start.isPending}
            onMarkPaid={() =>
              f.invoiceId && markPaid.mutate(f.invoiceId, { onSuccess: () => update({ toast: `${f.name} is paid and ready to build.` }) })
            }
            onStart={() =>
              start.mutate(f.id, {
                // Jump to the new build on the Builds tab.
                onSuccess: (build) => update({ progressView: "builds", projectId: build.id, toast: `${build.package} build started.` }),
              })
            }
            onOpen={() => update({ progressView: "builds", projectId: f.projectId ?? "" })}
          />
        ))}
      </div>
    </LoadState>
  );
}

function FunnelRequestCard({
  funnel: f,
  contact,
  canWrite,
  busy,
  onMarkPaid,
  onStart,
  onOpen,
}: {
  funnel: FunnelOut;
  contact?: ContactOut;
  canWrite: boolean;
  busy: boolean;
  onMarkPaid: () => void;
  onStart: () => void;
  onOpen: () => void;
}) {
  const r = (f.request ?? {}) as Request;
  const status = STATUSES[f.status];
  const client = contact ? contactName(contact) : "Client";
  const pkg = r.package ? PACKAGE_LABELS[r.package] : "Custom quote";

  return (
    <article className="card stack stack--10 crm-request">
      <div className="cluster cluster--nowrap">
        <Avatar name={client} tone={avatarTone(f.contactId)} size="md" />
        <div className="stack stack--2 u-grow">
          <span className="text-strong">{f.name}</span>
          <span className="text-small">
            {client}
            {contact?.company && ` · ${contact.company}`}
            {contact?.email && ` · ${contact.email}`} · {f.type}
          </span>
        </div>
        <Badge tone="orange" mono>
          {pkg.toUpperCase()}
          {f.priceCents > 0 && ` · ${formatCents(f.priceCents)}`}
        </Badge>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>

      <dl className="inset crm-request-review">
        <dt className="kicker kicker--sm kicker--muted">OFFER / MAIN GOAL</dt>
        <dd className="text-body u-ink crm-request__goal">{r.offer || f.goal || "—"}</dd>
        {r.audience && (
          <>
            <dt className="kicker kicker--sm kicker--muted">AUDIENCE</dt>
            <dd className="text-body u-ink crm-request__goal">{r.audience}</dd>
          </>
        )}
        {r.notes && (
          <>
            <dt className="kicker kicker--sm kicker--muted">NOTES</dt>
            <dd className="text-body u-ink crm-request__goal">{r.notes}</dd>
          </>
        )}
      </dl>

      {canWrite && (
        <div className="cluster cluster--8">
          {f.projectId ? (
            <Button variant="outline" size="sm" onClick={onOpen}>
              Open the build
            </Button>
          ) : (
            <Button variant={f.status === "queued" ? "primary" : "outline"} size="sm" disabled={busy} onClick={onStart}>
              Start {r.package ? `${PACKAGE_LABELS[r.package]} ` : ""}build
            </Button>
          )}
          {f.status === "pay" && f.invoiceId && (
            <Button size="sm" disabled={busy} onClick={onMarkPaid} title="When their Wise payment has arrived">
              Mark paid
            </Button>
          )}
          {f.status === "pay" && (
            <span className="text-small">{f.payUrl ? "Paying through its Wise link" : "No Wise link for this price: send them payment details"}</span>
          )}
        </div>
      )}
    </article>
  );
}
