"use client";

import { useState } from "react";
import { Avatar, Badge, Button, FormError, LoadState, Select } from "@/components/ui";
import { CRM_PACKAGES, type CrmPackageKey } from "@/data/portal";
import { avatarTone, type Tone } from "@/lib/tones";
import type { AdminCrmRequestOut, CrmRequestStatus } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import {
  useCrmRequests,
  useDeleteCrmRequest,
  useMarkCrmRequestPaid,
  useSendCrmRequestInvoice,
  useStartCrmRequestBuild,
  useUpdateCrmRequest,
} from "@/utils/hooks/useDelivery";
import { useAdmin } from "../../state/AdminContext";
import { RequestInvoiceRow } from "./RequestInvoiceRow";

const STATUSES: Array<{ value: CrmRequestStatus; label: string; tone: Tone }> = [
  { value: "new", label: "New", tone: "brand" },
  { value: "contacted", label: "Call booked", tone: "cyan" },
  { value: "started", label: "Build started", tone: "green" },
  { value: "declined", label: "Declined", tone: "neutral" },
];
const statusOf = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

/** Build Progress › CRM requests: what each client asked for in "Request a CRM", so you can prepare for the call. */
export function CrmRequestsPanel({ canWrite }: { canWrite: boolean }) {
  const { update } = useAdmin();
  const query = useCrmRequests();
  const updateRequest = useUpdateCrmRequest();
  const start = useStartCrmRequestBuild();
  const remove = useDeleteCrmRequest();
  const invoice = useSendCrmRequestInvoice();
  const markPaid = useMarkCrmRequestPaid();
  const requests = query.data ?? [];

  return (
    <LoadState
      query={query}
      isEmpty={!requests.length}
      empty="No CRM requests yet. When a client uses “Request a CRM” in their portal, it shows up here."
    >
      <FormError error={updateRequest.error ?? start.error ?? remove.error ?? invoice.error ?? markPaid.error} />
      <div className="stack stack--10">
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            canWrite={canWrite}
            busy={updateRequest.isPending || start.isPending || remove.isPending || invoice.isPending || markPaid.isPending}
            sending={invoice.isPending && invoice.variables === r.id}
            onMarkPaid={() => r.invoice && markPaid.mutate(r.invoice.id, { onSuccess: () => update({ toast: `${r.invoice?.number} marked paid.` }) })}
            onSendInvoice={() =>
              invoice.mutate(r.id, {
                onSuccess: (row) => update({ toast: `Invoice ${row.invoice?.number ?? ""} sent to ${row.email || row.clientName}.` }),
              })
            }
            onStatus={(status) => updateRequest.mutate({ id: r.id, status })}
            onStart={() =>
              start.mutate(r.id, {
                // Jump to the new build on the Builds tab.
                onSuccess: (build) => update({ progressView: "builds", projectId: build.id, toast: `${build.package} build started.` }),
              })
            }
            onDelete={() => remove.mutate(r.id)}
          />
        ))}
      </div>
    </LoadState>
  );
}

function RequestCard({
  request: r,
  canWrite,
  busy,
  sending,
  onSendInvoice,
  onMarkPaid,
  onStatus,
  onStart,
  onDelete,
}: {
  request: AdminCrmRequestOut;
  canWrite: boolean;
  busy: boolean;
  sending: boolean;
  onSendInvoice: () => void;
  onMarkPaid: () => void;
  onStatus: (status: CrmRequestStatus) => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  const { update } = useAdmin();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pkg = CRM_PACKAGES[r.package as CrmPackageKey];
  const status = statusOf(r.status);
  const client = r.clientName || r.company || r.email;

  return (
    <article className="card stack stack--10 crm-request">
      <div className="cluster cluster--nowrap">
        <Avatar name={client} tone={avatarTone(r.contactId)} size="md" />
        <div className="stack stack--2 u-grow">
          <span className="text-strong">{r.name}</span>
          <span className="text-small">
            {client}
            {r.company && r.company !== client && ` · ${r.company}`}
            {r.email && ` · ${r.email}`} · requested {formatShort(r.createdAt)}
          </span>
        </div>
        <Badge tone={r.package === "custom" ? "purple" : "cyan"} mono>
          {(pkg?.label ?? r.package).toUpperCase()}
          {pkg && ` · ${formatCents(pkg.priceCents)}`}
        </Badge>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>

      <div className="inset">
        <span className="kicker kicker--sm kicker--muted">GOAL</span>
        <p className="text-body u-ink crm-request__goal">{r.goal}</p>
      </div>

      {/* Whether you've invoiced them yet, for the package they chose. */}
      <RequestInvoiceRow
        invoice={r.invoice ?? null}
        email={r.email}
        newInvoiceLabel={pkg ? `${formatCents(pkg.priceCents)} ${pkg.label}` : undefined}
        canWrite={canWrite}
        busy={busy}
        sending={sending}
        onSend={onSendInvoice}
        onMarkPaid={onMarkPaid}
      />

      {canWrite && (
        <div className="cluster cluster--8">
          {r.projectId ? (
            <Button variant="outline" size="sm" onClick={() => update({ progressView: "builds", projectId: r.projectId ?? "" })}>
              Open the build
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={busy} onClick={onStart} title={`Starts a ${pkg?.label ?? "CRM"} build named “${r.name}”`}>
              Start {pkg?.label ?? "CRM"} build
            </Button>
          )}
          <Select
            size="sm"
            className="crm-request__status"
            aria-label={`Status of ${r.name}`}
            value={r.status}
            disabled={busy}
            options={STATUSES.filter((s) => s.value !== "started" || r.projectId).map((s) => ({ value: s.value, label: s.label }))}
            onChange={(e) => onStatus(e.target.value as CrmRequestStatus)}
          />
          <span className="u-spacer" />
          {confirmDelete ? (
            <>
              <Button variant="danger-solid" size="sm" disabled={busy} onClick={onDelete}>
                Yes, delete request
              </Button>
              <Button size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
