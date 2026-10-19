"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Checkbox, Field, FormError, Icon, IconButton, Input, LoadState, Select } from "@/components/ui";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { PaymentConnectionOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useDeletePaymentConnection, usePaymentConnections, useSavePaymentConnection } from "@/utils/hooks/useBilling";
import { useSettings, useUpdateSettings } from "@/utils/hooks/useSettings";
import { connectionOf, providerName } from "../../lib/billing";

/** Payment provider cards (Stripe, PayPal…) and the connect form. */
export function PaymentMethods() {
  const query = usePaymentConnections();
  const connections = query.data;
  const settings = useSettings().data;
  const saveSettings = useUpdateSettings();
  const remove = useDeletePaymentConnection();
  const [editingId, setEditingId] = useState("");

  const connected = PAYMENT_PROVIDERS.filter((p) => connectionOf(connections, p.id));
  const preferred = settings?.defaultPaymentProvider ?? "";
  const defaultId = connected.some((p) => p.id === preferred) ? preferred : (connected[0]?.id ?? "");
  const editing = PAYMENT_PROVIDERS.find((p) => p.id === editingId);

  const disconnect = (id: string) => {
    remove.mutate(id);
    if (editingId === id) setEditingId("");
  };

  return (
    <section className="card" aria-label="Payment methods">
      <div className="section-head section-head--end">
        <div className="stack stack--4">
          <span className="kicker">INTEGRATIONS</span>
          <h2 className="section-title">Payment methods</h2>
          <span className="text-muted">Connect the payment account you already use. Clients pay you directly.</span>
        </div>
        <Field label="Default for checkout" htmlFor="pay-default">
          <Select
            id="pay-default"
            className="u-strong"
            value={defaultId}
            disabled={saveSettings.isPending}
            onChange={(e) => saveSettings.mutate({ defaultPaymentProvider: e.target.value })}
            options={
              connected.length
                ? connected.map((p) => ({ value: p.id, label: providerName(p, connections) }))
                : [{ value: "", label: "Connect a method first" }]
            }
          />
        </Field>
      </div>

      <FormError error={remove.error ?? saveSettings.error} />
      <LoadState query={query}>
      <div className="provider-grid provider-grid--compact">
        {PAYMENT_PROVIDERS.map((p) => {
          const conn = connectionOf(connections, p.id);
          const on = !!conn;
          const isDefault = on && p.id === defaultId;
          return (
            <article key={p.id} className={cn("payment-card", on && "payment-card--on", isDefault && "payment-card--default")}>
              <div className="cluster cluster--nowrap">
                <Avatar text={p.initials} tone={p.tone} size="lg" square />
                <div className="stack stack--2 u-grow">
                  <span className="text-strong">{providerName(p, connections)}</span>
                  <span className="text-small">{p.desc}</span>
                </div>
              </div>
              <div className="cluster cluster--6">
                <Badge tone={on ? "green" : "neutral"} mono dot>
                  {on ? "CONNECTED" : "NOT CONNECTED"}
                </Badge>
                {isDefault && <Badge tone="brand">DEFAULT</Badge>}
                {conn && p.hasMode && <Badge tone="neutral">{conn.testMode ? "Test mode" : "Live"}</Badge>}
              </div>
              {conn && <span className="payment-card__summary">{conn.summary}</span>}
              <div className="cluster cluster--8 cluster--nowrap payment-card__actions">
                <Button variant={on ? "secondary" : "primary"} className="u-grow" onClick={() => setEditingId(p.id)}>
                  {on ? "Manage" : "Connect"}
                </Button>
                {on && (
                  <Button variant="danger" disabled={remove.isPending} onClick={() => disconnect(p.id)}>
                    Disconnect
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      </LoadState>

      {editing && (
        <ConnectForm
          key={editing.id}
          provider={editing}
          existing={connectionOf(connections, editing.id)}
          isFirst={!connected.length}
          onClose={() => setEditingId("")}
        />
      )}
    </section>
  );
}

function ConnectForm({
  provider: p,
  existing,
  isFirst,
  onClose,
}: {
  provider: PaymentProvider;
  existing?: PaymentConnectionOut;
  isFirst: boolean;
  onClose: () => void;
}) {
  const save = useSavePaymentConnection();
  const saveSettings = useUpdateSettings();
  const wasConnected = !!existing;
  const [values, setValues] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState(existing ? existing.testMode : true);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Saving replaces every key, so each required field is needed again (secrets are never shown back).
    const missing = p.fields.filter((f) => !(values[f.key] ?? "").trim() && !f.optional);
    if (missing.length) return setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
    const fields = Object.fromEntries(p.fields.filter((f) => (values[f.key] ?? "").trim()).map((f) => [f.key, values[f.key].trim()]));
    save.mutate(
      { provider: p.id, body: { fields, testMode: p.hasMode ? testMode : false, label: p.id === "custom" ? (values.label ?? "").trim() : "" } },
      {
        onSuccess: () => {
          // The first method you connect becomes the default.
          if (isFirst) saveSettings.mutate({ defaultPaymentProvider: p.id });
          setValues({});
          onClose();
        },
        onError: (err) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err)),
      },
    );
  };

  return (
    <form className="connect-form" onSubmit={submit} autoComplete="off">
      <div className="cluster cluster--nowrap">
        <Avatar text={p.initials} tone={p.tone} square />
        <div className="stack stack--2 u-grow">
          <span className="kicker">CONNECT</span>
          <span className="card-title u-strong">{p.name}</span>
        </div>
        <IconButton label="Close" size="lg" onClick={onClose}>
          ×
        </IconButton>
      </div>
      <p className="text-muted">{p.help}</p>
      {wasConnected && <p className="text-small">Currently saved: {existing.summary}. Enter every key again to update it.</p>}
      <div className="form-grid">
        {p.fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`pay-${p.id}-${f.key}`}>
            <Input
              id={`pay-${p.id}-${f.key}`}
              type={f.secret ? "password" : "text"}
              mono
              autoComplete="off"
              spellCheck={false}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => {
                setValues({ ...values, [f.key]: e.target.value });
                setError("");
              }}
            />
          </Field>
        ))}
      </div>
      {p.hasMode && (
        <Checkbox label="Test mode (use sandbox keys, no real charges)" checked={testMode} onChange={() => setTestMode(!testMode)} />
      )}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      <div className="cluster">
        <span className="text-small cluster cluster--6">
          <Icon name="lock" size={14} className="u-cyan" />
          Secret keys are hidden after saving
        </span>
        <span className="u-spacer" />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : wasConnected ? "Update connection" : `Connect ${p.name}`}
        </Button>
      </div>
    </form>
  );
}
