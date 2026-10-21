"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, ErrorState, Field, FormError, Icon, IconTile, Input, Loading, Modal, Textarea } from "@/components/ui";
import { FUNNEL_PACKAGE_COPY, FUNNEL_TYPE_COPY, type FunnelPackageKey, type FunnelRequestDetails, type FunnelTypeKey } from "@/data/portal";
import type { FunnelCatalogOut, FunnelOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { formatCents } from "@/utils/format/money";
import { useCheckoutInvoice } from "@/utils/hooks/useBilling";
import { useFunnelCatalog, usePortalFunnels, useRequestFunnel, useUpdateFunnelRequest } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

type CatalogType = { label: string; steps: string[] };
type CatalogPackage = { label: string; price: number; list_price: number | null };

type Draft = {
  type: FunnelTypeKey;
  name: string;
  offer: string;
  audience: string;
  notes: string;
  /** Empty until chosen; older requests from before packages have none. */
  package: FunnelPackageKey | "";
  pay: "now" | "invoice";
  agree: boolean;
};

export function FunnelRequestDrawer() {
  const { state, update } = usePortal();
  const funnels = usePortalFunnels().data ?? [];
  const catalog = useFunnelCatalog();
  if (!state.funnelRequestOpen) return null;
  const editing = funnels.find((f) => f.id === state.editFunnelId);
  const onClose = () => update({ funnelRequestOpen: false, editFunnelId: "" });
  if (!catalog.data) {
    return (
      <Modal open variant="drawer" width={680} onClose={onClose} titleId="fq-title" kicker="NEW FUNNEL" title="Request a new funnel">
        {catalog.isError ? <ErrorState error={catalog.error} onRetry={catalog.refetch} /> : <Loading text="Loading funnel options…" />}
      </Modal>
    );
  }
  return <FunnelRequestForm key={editing?.id ?? "new"} editing={editing} catalog={catalog.data} onClose={onClose} />;
}

/** What the client filled in when requesting it (the API stores it on the funnel). */
export function requestOf(f: FunnelOut): FunnelRequestDetails | null {
  const r = f.request as Partial<FunnelRequestDetails> | null;
  if (!r?.typeKey) return null;
  return { typeKey: r.typeKey, offer: r.offer ?? "", audience: r.audience ?? "", notes: r.notes ?? "", package: r.package };
}

/** Request fields the client left empty, so the funnel card can nudge them to fill them in. */
export function missingRequestDetails(f: FunnelOut): string[] {
  if (f.status === "live") return [];
  const r = requestOf(f);
  if (!r) return [];
  return [!r.offer.trim() && "offer", !r.audience.trim() && "audience"].filter(Boolean) as string[];
}

function FunnelRequestForm({ editing, catalog, onClose }: { editing?: FunnelOut; catalog: FunnelCatalogOut; onClose: () => void }) {
  const { update } = usePortal();
  const types = catalog.types as Record<FunnelTypeKey, CatalogType>;
  const packages = catalog.packages as Record<FunnelPackageKey, CatalogPackage>;
  const typeKeys = Object.keys(types) as FunnelTypeKey[];
  const packageKeys = Object.keys(packages) as FunnelPackageKey[];
  const create = useRequestFunnel();
  const save = useUpdateFunnelRequest();
  const checkout = useCheckoutInvoice();
  const [error, setError] = useState("");

  const [draft, setDraftState] = useState<Draft>(() => {
    const r = editing ? requestOf(editing) : null;
    return {
      type: r?.typeKey ?? "booking",
      name: editing?.name ?? "",
      offer: r?.offer ?? editing?.goal ?? "",
      audience: r?.audience ?? "",
      notes: r?.notes ?? "",
      package: r?.package ?? "",
      pay: "now",
      agree: false,
    };
  });

  // Once paid (or in build), the scope is fixed: changes to the package or type go through a change request.
  const scopeLocked = !!editing && editing.status !== "quote" && editing.status !== "pay";
  const original = editing ? requestOf(editing) : null;

  const set = (patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
    setError("");
  };

  const type = types[draft.type] ?? types.custom;
  const pkg = draft.package ? packages[draft.package] : null;
  // A preview from the catalog's prices; the API computes the real total and the invoice when you submit.
  // Without a package, an edit keeps the funnel's current price (older requests may still be waiting for a quote).
  const price = pkg ? pkg.price : (editing?.priceCents ?? 0);
  const totalText = pkg || price ? formatCents(price) : editing ? "Quote" : "Choose a package";
  const scopeChanged = !!editing && !scopeLocked && !!draft.package && draft.package !== original?.package;
  const needsAgree = !!pkg && (!editing || scopeChanged);
  const pending = create.isPending || save.isPending || checkout.isPending;
  const apiFields = fieldErrors(create.error ?? save.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing && !draft.package) return setError("Please choose a package.");
    if (!draft.name.trim() || !draft.offer.trim()) return setError("Please add a funnel name and its offer or main goal.");
    if (needsAgree && !draft.agree) return setError("Please confirm the additional charge to continue.");

    // No package keeps the current price, which is what a locked (paid) funnel needs.
    const body = {
      typeKey: scopeLocked && original ? original.typeKey : draft.type,
      name: draft.name.trim(),
      offer: draft.offer.trim(),
      audience: draft.audience.trim(),
      notes: draft.notes.trim(),
      package: scopeLocked ? null : draft.package || null,
    };
    const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));

    if (editing) {
      save.mutate(
        { id: editing.id, body },
        {
          onSuccess: (f) =>
            update({
              funnelRequestOpen: false,
              editFunnelId: "",
              toast: scopeChanged && f.priceCents ? `Request updated. Your new invoice is ${formatCents(f.priceCents)}.` : "Request updated. Your GoCWGL team can see the new details.",
            }),
          onError,
        },
      );
      return;
    }

    create.mutate(body, {
      onSuccess: (f) => {
        // Priced funnels come back with an invoice; "Pay now" goes straight to checkout.
        if (f.invoiceId && draft.pay === "now") {
          checkout.mutate(f.invoiceId, {
            onError: (err) => update({ funnelRequestOpen: false, toast: `Request sent. ${errorMessage(err)} You can pay it from Billing.` }),
          });
          return;
        }
        update({
          funnelRequestOpen: false,
          toast: `Request sent. An invoice for ${formatCents(f.priceCents)} is in Billing.`,
        });
      },
      onError,
    });
  };

  return (
    <Modal
      open
      variant="drawer"
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="fq-title"
      kicker={editing ? "EDIT REQUEST" : "NEW FUNNEL"}
      title={editing ? `Edit “${editing.name}”` : "Request a new funnel"}
      subtitle={editing ? "Add details you didn’t have before, or fix anything that changed. Your team sees updates right away." : undefined}
      media={
        <IconTile brand size="lg">
          <Icon name="funnel" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-muted">
            {!scopeLocked && (
              <>
                Total <strong className="u-mono u-ink">{totalText}</strong>
              </>
            )}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending
              ? "Sending…"
              : editing
                ? "Save changes"
                : draft.pay === "now" && pkg
                    ? `Submit & pay ${totalText}`
                    : "Submit & send invoice"}
          </Button>
        </>
      }
    >
      {scopeLocked && (
        <div className="inset text-small">
          <span>
            This funnel is already paid, so its package and type are locked. You can still update the details below. To change the scope, use{" "}
            <strong>Request a change</strong> on the funnel.
          </span>
        </div>
      )}

      {/* 01 — package */}
      {!scopeLocked && (
        <div className="stack stack--8">
          <span className="kicker">01 · CHOOSE A PACKAGE</span>
          {editing && !original?.package && (
            <span className="text-small">This request was sent before packages. Pick one to get a new invoice, or leave it as it is.</span>
          )}
          <div className="option-grid">
            {packageKeys.map((key) => {
              const p = packages[key];
              const copy = FUNNEL_PACKAGE_COPY[key];
              // VIP unlocks once the team tags the client VIP; a request already on VIP keeps it.
              const locked = key === "vip" && !catalog.vip && original?.package !== "vip";
              return (
                <button
                  key={key}
                  type="button"
                  className="option-card package-card"
                  aria-pressed={draft.package === key}
                  disabled={locked}
                  onClick={() => set({ package: key })}
                >
                  {copy?.tag && (
                    <Badge tone="brand" mono>
                      {copy.tag}
                    </Badge>
                  )}
                  <span className="option-card__head">
                    <span>{p.label}</span>
                    <span className="option-card__price">
                      {p.list_price && <s className="package-card__was">{formatCents(p.list_price)}</s>} {formatCents(p.price)}
                    </span>
                  </span>
                  <span className="option-card__desc">{copy?.tagline}</span>
                  <ul className="package-card__includes">
                    {copy?.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {locked && (
                    <span className="package-card__locked">
                      <Icon name="lock" size={12} /> Available once your team marks you as a VIP client
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 02 — type */}
      {!scopeLocked && (
        <div className="stack stack--8">
          <span className="kicker">02 · WHAT KIND OF FUNNEL?</span>
          <div className="option-grid">
            {typeKeys.map((key) => (
              <button key={key} type="button" className="option-card" aria-pressed={draft.type === key} onClick={() => set({ type: key })}>
                <span className="option-card__head">{types[key].label}</span>
                <span className="option-card__desc">{FUNNEL_TYPE_COPY[key] ?? ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 03 — details */}
      <div className="stack stack--10">
        <span className="kicker">{scopeLocked ? "TELL US ABOUT IT" : "03 · TELL US ABOUT IT"}</span>
        <Field label="Funnel name" htmlFor="fq-name" required error={apiFields.name}>
          <Input
            id="fq-name"
            value={draft.name}
            aria-invalid={!!error && !draft.name.trim()}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Corporate wellness workshops"
          />
        </Field>
        <Field label="Offer or main goal" htmlFor="fq-offer" required error={apiFields.offer}>
          <Input
            id="fq-offer"
            value={draft.offer}
            aria-invalid={!!error && !draft.offer.trim()}
            onChange={(e) => set({ offer: e.target.value })}
            placeholder="e.g. Free 30-min demo session for local companies"
          />
        </Field>
        <Field label="Who is it for?" htmlFor="fq-aud">
          <Input id="fq-aud" value={draft.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="e.g. HR managers, 20–200 staff" />
        </Field>
        <Field label="Anything else? Links to pages you like, wording, deadlines…" htmlFor="fq-notes">
          <Textarea id="fq-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>

      {/* 04 — billing */}
      {!scopeLocked && (
        <div className="billing-summary">
          <span className="kicker kicker--brand">04 · BILLING</span>
          <div className="billing-summary__line">
            <span>{pkg ? `${pkg.label}: ${type.label}` : "Current price"}</span>
            <span className="u-mono u-strong">{totalText}</span>
          </div>
          <div className="billing-summary__total">
            <span className="text-strong">One-time total</span>
            <span className="billing-summary__amount">{totalText}</span>
          </div>
          <span className="text-small">
            {editing
              ? scopeChanged
                ? editing.invoiceId
                  ? `Your open invoice (${formatCents(editing.priceCents)}) will be replaced with a new one for ${totalText}.`
                  : `You will get an invoice for ${totalText}.`
                : editing.status === "quote" && !editing.priceCents
                  ? "Your team will send a quote, or choose a package above to get an invoice now."
                  : "The price has not changed. Your open invoice stays the same."
              : `A one-time payment for the build, added to Billing as its own invoice. No monthly fees: the only recurring cost is ${formatCents(catalog.monitoringPriceCents)}/year monitoring, billed separately.`}
          </span>
          {!editing && (
            <div className="cluster cluster--6" role="radiogroup" aria-label="How to pay">
              {(
                [
                  ["now", "Pay now", "Go to secure checkout and start the build right away"],
                  ["invoice", "Send me an invoice", "Pay within 7 days from Billing. The build starts once it is paid."],
                ] as const
              ).map(([key, label, desc]) => (
                <button key={key} type="button" role="radio" aria-checked={draft.pay === key} className="option-card pay-option" onClick={() => set({ pay: key })}>
                  <span className="text-strong">{label}</span>
                  <span className="text-small">{desc}</span>
                </button>
              ))}
            </div>
          )}
          {needsAgree && (
            <Checkbox
              brand
              label={
                editing
                  ? `I understand the one-time charge for this funnel changes to ${totalText}.`
                  : `I understand this is a one-time charge of ${totalText}.`
              }
              checked={draft.agree}
              onChange={() => set({ agree: !draft.agree })}
            />
          )}
        </div>
      )}

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      {!error && <FormError error={checkout.error} />}
    </Modal>
  );
}
