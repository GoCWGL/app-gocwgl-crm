"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, ErrorState, Field, FormError, Icon, IconTile, Input, Loading, Modal, Select, Textarea } from "@/components/ui";
import {
  FUNNEL_ADDON_COPY,
  FUNNEL_TYPE_COPY,
  type FunnelAddonKey,
  type FunnelRequestDetails,
  type FunnelTypeKey,
} from "@/data/portal";
import { cn } from "@/lib/utils";
import type { FunnelCatalogOut, FunnelOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { formatCents } from "@/utils/format/money";
import { useCheckoutInvoice } from "@/utils/hooks/useBilling";
import { useFunnelCatalog, usePortalFunnels, useRequestFunnel, useUpdateFunnelRequest } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

type CatalogType = { label: string; price: number; steps: string[] };
type CatalogAddon = { label: string; price: number };

type Draft = {
  type: FunnelTypeKey;
  name: string;
  offer: string;
  audience: string;
  notes: string;
  addons: Record<string, boolean>;
  speed: "standard" | "rush";
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
  return { typeKey: r.typeKey, offer: r.offer ?? "", audience: r.audience ?? "", notes: r.notes ?? "", addons: r.addons ?? [], speed: r.speed ?? "standard" };
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
  const addons = catalog.addons as Record<FunnelAddonKey, CatalogAddon>;
  const typeKeys = Object.keys(types) as FunnelTypeKey[];
  const addonKeys = Object.keys(addons) as FunnelAddonKey[];
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
      addons: Object.fromEntries((r?.addons ?? []).map((k) => [k, true])),
      speed: r?.speed ?? "standard",
      pay: "now",
      agree: false,
    };
  });

  // Once paid (or in build), the scope is fixed: changes to type or extras go through a change request.
  const scopeLocked = !!editing && editing.status !== "quote" && editing.status !== "pay";
  const original = editing ? requestOf(editing) : null;

  const set = (patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
    setError("");
  };

  const type = types[draft.type] ?? types.custom;
  const isQuote = draft.type === "custom";
  const chosenAddons = addonKeys.filter((k) => draft.addons[k]);
  // A preview from the catalog's prices; the API computes the real total and the invoice when you submit.
  const lines: Array<[string, number]> = [
    [`${type.label} build`, type.price],
    ...chosenAddons.map((k): [string, number] => [addons[k].label, addons[k].price]),
    ...(draft.speed === "rush" ? [["Rush delivery", catalog.rushPriceCents] as [string, number]] : []),
  ];
  const estimate = lines.reduce((n, [, amount]) => n + amount, 0);
  const totalText = isQuote ? "Quote" : formatCents(estimate);
  const scopeChanged =
    !!editing &&
    !scopeLocked &&
    (original?.typeKey !== draft.type ||
      [...(original?.addons ?? [])].sort().join() !== [...chosenAddons].sort().join() ||
      original?.speed !== draft.speed);
  const needsAgree = !isQuote && (!editing || scopeChanged);
  const pending = create.isPending || save.isPending || checkout.isPending;
  const apiFields = fieldErrors(create.error ?? save.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.offer.trim()) return setError("Please add a funnel name and its offer or main goal.");
    if (needsAgree && !draft.agree) return setError("Please confirm the additional charge to continue.");

    const scope = scopeLocked && original ? { typeKey: original.typeKey, addons: original.addons, speed: original.speed } : null;
    const body = {
      typeKey: scope?.typeKey ?? draft.type,
      name: draft.name.trim(),
      offer: draft.offer.trim(),
      audience: draft.audience.trim(),
      notes: draft.notes.trim(),
      addons: scope?.addons ?? chosenAddons,
      speed: scope?.speed ?? draft.speed,
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
          toast: f.invoiceId
            ? `Request sent. An invoice for ${formatCents(f.priceCents)} is in Billing.`
            : "Request sent. Your GoCWGL team will send a quote soon.",
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
                : isQuote
                  ? "Request a quote"
                  : draft.pay === "now"
                    ? `Submit & pay ${totalText}`
                    : "Submit & send invoice"}
          </Button>
        </>
      }
    >
      {scopeLocked && (
        <div className="inset text-small">
          <span>
            This funnel is already paid, so its type and extras are locked. You can still update the details below. To add extras or change the
            scope, use <strong>Request a change</strong> on the funnel.
          </span>
        </div>
      )}

      {/* 01 — type */}
      {!scopeLocked && (
        <div className="stack stack--8">
          <span className="kicker">01 · WHAT KIND OF FUNNEL?</span>
          <div className="option-grid">
            {typeKeys.map((key) => {
              const t = types[key];
              return (
                <button key={key} type="button" className="option-card" aria-pressed={draft.type === key} onClick={() => set({ type: key })}>
                  <span className="option-card__head">
                    <span>{t.label}</span>
                    <span className="option-card__price">{t.price ? `from ${formatCents(t.price)}` : "Quote"}</span>
                  </span>
                  <span className="option-card__desc">{FUNNEL_TYPE_COPY[key] ?? ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 02 — details */}
      <div className="stack stack--10">
        <span className="kicker">02 · TELL US ABOUT IT</span>
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

      {/* 03 — extras */}
      {!scopeLocked && (
        <div className="stack stack--8">
          <span className="kicker">03 · EXTRAS</span>
          {addonKeys.map((key) => {
            const a = addons[key];
            const on = !!draft.addons[key];
            return (
              <label key={key} className={cn("option-card option-card--row", on && "option-card--on")}>
                <input type="checkbox" className="option-card__check" checked={on} onChange={() => set({ addons: { ...draft.addons, [key]: !on } })} />
                <span className="stack stack--2 u-grow">
                  <span className="text-strong">{a.label}</span>
                  <span className="text-small">{FUNNEL_ADDON_COPY[key] ?? ""}</span>
                </span>
                <span className="option-card__price">+{formatCents(a.price)}</span>
              </label>
            );
          })}
          <Field label="Delivery" htmlFor="fq-speed">
            <Select id="fq-speed" value={draft.speed} onChange={(e) => set({ speed: e.target.value as Draft["speed"] })}>
              <option value="standard">Standard · about 2 weeks</option>
              <option value="rush">Rush · about 1 week (+{formatCents(catalog.rushPriceCents)})</option>
            </Select>
          </Field>
        </div>
      )}

      {/* 04 — billing */}
      {!scopeLocked && (
        <div className="billing-summary">
          <span className="kicker kicker--brand">04 · ADDITIONAL BILLING</span>
          {(isQuote ? [["Custom funnel", "Quote"]] : lines.map(([l, n]) => [l, formatCents(n)])).map(([label, amount]) => (
            <div className="billing-summary__line" key={label}>
              <span>{label}</span>
              <span className="u-mono u-strong">{amount}</span>
            </div>
          ))}
          <div className="billing-summary__total">
            <span className="text-strong">One-time total</span>
            <span className="billing-summary__amount">{totalText}</span>
          </div>
          <span className="text-small">
            {isQuote
              ? "Your team will review your request and send a fixed quote within 1 business day. Nothing is charged until you accept it."
              : editing
                ? scopeChanged
                  ? `Your open invoice will be replaced with a new one for the updated total (currently ${formatCents(editing.priceCents)}).`
                  : "The price has not changed. Your open invoice stays the same."
                : "This is a one-time fee for the build, added to your Billing as a separate invoice. Your monthly plan stays the same."}
          </span>
          {!isQuote && !editing && (
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
                  ? `I understand the one-time charge for this funnel changes to about ${totalText}.`
                  : `I understand this is an additional one-time charge of ${totalText}, separate from my monthly plan.`
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
