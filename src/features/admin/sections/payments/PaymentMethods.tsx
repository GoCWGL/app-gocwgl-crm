"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Checkbox, Field, Icon, IconButton, Input, Select } from "@/components/ui";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/data/admin";
import { cn } from "@/lib/utils";
import { providerName } from "../../lib/billing";
import { useAdmin } from "../../state/AdminContext";

const mask = (value: string) => (value.length <= 4 ? "••••" : "••••" + value.slice(-4));

/** Payment provider cards (Stripe, PayPal…) and the connect form. */
export function PaymentMethods() {
  const { state, update } = useAdmin();
  const connections = state.paymentConnections;
  const [editingId, setEditingId] = useState("");

  const connected = PAYMENT_PROVIDERS.filter((p) => connections[p.id]?.connected);
  const defaultId = connected.some((p) => p.id === state.paymentDefault) ? state.paymentDefault : (connected[0]?.id ?? "");
  const editing = PAYMENT_PROVIDERS.find((p) => p.id === editingId);

  const disconnect = (id: string) => {
    update((s) => {
      const next = { ...s.paymentConnections };
      delete next[id];
      return { paymentConnections: next };
    });
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
            onChange={(e) => update({ paymentDefault: e.target.value })}
            options={
              connected.length
                ? connected.map((p) => ({ value: p.id, label: providerName(p, connections) }))
                : [{ value: "", label: "Connect a method first" }]
            }
          />
        </Field>
      </div>

      <div className="provider-grid provider-grid--compact">
        {PAYMENT_PROVIDERS.map((p) => {
          const conn = connections[p.id];
          const on = !!conn?.connected;
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
                {on && p.hasMode && <Badge tone="neutral">{conn.test ? "Test mode" : "Live"}</Badge>}
              </div>
              {on && <span className="payment-card__summary">{conn.summary}</span>}
              <div className="cluster cluster--8 cluster--nowrap payment-card__actions">
                <Button variant={on ? "secondary" : "primary"} className="u-grow" onClick={() => setEditingId(p.id)}>
                  {on ? "Manage" : "Connect"}
                </Button>
                {on && (
                  <Button variant="danger" onClick={() => disconnect(p.id)}>
                    Disconnect
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {editing && <ConnectForm key={editing.id} provider={editing} onClose={() => setEditingId("")} />}
    </section>
  );
}

function ConnectForm({ provider: p, onClose }: { provider: PaymentProvider; onClose: () => void }) {
  const { state, update } = useAdmin();
  const existing = state.paymentConnections[p.id];
  const wasConnected = !!existing?.connected;
  const [values, setValues] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState(wasConnected ? !!existing.test : true);
  const [error, setError] = useState("");

  const save = (e: FormEvent) => {
    e.preventDefault();
    const missing = p.fields.filter((f) => !(values[f.key] ?? "").trim() && !wasConnected && !f.optional);
    if (missing.length) return setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);

    const parts = p.fields
      .filter((f) => (values[f.key] ?? "").trim())
      .map((f) => {
        const v = values[f.key].trim();
        if (f.secret) return `${f.label} ${mask(v)}`;
        return f.key === "accNo" ? `Acct ${mask(v)}` : v;
      });

    update((s) => ({
      paymentConnections: {
        ...s.paymentConnections,
        [p.id]: {
          connected: true,
          test: p.hasMode ? testMode : false,
          summary: parts.length ? parts.join(" · ") : (existing?.summary ?? ""),
          label: p.id === "custom" ? (values.label ?? "").trim() || existing?.label || "" : undefined,
        },
      },
      // The first method you connect becomes the default.
      paymentDefault: Object.values(s.paymentConnections).some((c) => c.connected) ? s.paymentDefault : p.id,
    }));
    onClose();
  };

  return (
    <form className="connect-form" onSubmit={save} autoComplete="off">
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
      <div className="form-grid">
        {p.fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`pay-${p.id}-${f.key}`}>
            <Input
              id={`pay-${p.id}-${f.key}`}
              type={f.secret ? "password" : "text"}
              mono
              autoComplete="off"
              spellCheck={false}
              placeholder={wasConnected ? "Leave blank to keep current" : f.placeholder}
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
        <Button type="submit" variant="primary">
          {wasConnected ? "Update connection" : `Connect ${p.name}`}
        </Button>
      </div>
    </form>
  );
}
