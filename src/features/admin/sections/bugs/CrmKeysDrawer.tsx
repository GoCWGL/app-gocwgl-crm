"use client";

import { useState, type FormEvent } from "react";
import { IntakeKeyTable, IntakeSetup, NewIntakeKey } from "@/components/intake/IntakeKeys";
import { Button, Field, FormError, Icon, IconTile, Input, LoadState, Modal, Select } from "@/components/ui";
import type { IntakeKeyCreated } from "@/utils/api/models";
import { fieldErrors } from "@/utils/errors";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useCreateIntakeKey, useIntakeKeys, useRevokeIntakeKey } from "@/utils/hooks/useSupport";
import { businessName } from "../../lib/contacts";

/** Keys that let a client's own CRM send bug reports straight into this list. */
export function CrmKeysDrawer({ canManage, onClose }: { canManage: boolean; onClose: () => void }) {
  const query = useIntakeKeys();
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const create = useCreateIntakeKey();
  const revoke = useRevokeIntakeKey();

  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<IntakeKeyCreated | null>(null);

  const clientName = (id: string) => {
    const c = contacts.find((x) => x.id === id) ?? archived.find((x) => x.id === id);
    return c ? businessName(c) : "Client";
  };
  const clientOptions = contacts.map((c) => ({ value: c.id, label: businessName(c) })).sort((a, b) => a.label.localeCompare(b.label));
  const errors = fieldErrors(create.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!contactId || !name.trim()) return;
    create.mutate(
      { contactId, name: name.trim() },
      {
        onSuccess: (key) => {
          setCreated(key);
          setName("");
        },
      },
    );
  };

  return (
    <Modal
      open
      variant="drawer"
      width={720}
      onClose={onClose}
      titleId="crm-keys-title"
      kicker="CLIENT CRM BUG BUTTONS"
      title="Connect a client's CRM"
      subtitle="A key lets a client's own CRM send bug reports straight into this list, from any domain or server."
      media={
        <IconTile tone="cyan" size="lg">
          <Icon name="bug" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-small">Reports arrive as bug tickets on that client, and the team gets the usual bug alert.</span>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {canManage ? (
        <form className="stack stack--8" onSubmit={submit}>
          <span className="kicker kicker--sm kicker--muted">NEW KEY</span>
          <Field label="Client" htmlFor="ck-client" error={errors.contactId}>
            <Select
              id="ck-client"
              value={contactId}
              placeholder="Choose a client"
              options={clientOptions}
              onChange={(e) => setContactId(e.target.value)}
            />
          </Field>
          <Field label="Where it’s used" htmlFor="ck-name" hint="Shown as the ticket’s source in Report Bugs, e.g. “Acme CRM (production)”." error={errors.name}>
            <Input id="ck-name" maxLength={80} value={name} placeholder="Acme CRM (production)" onChange={(e) => setName(e.target.value)} />
          </Field>
          <FormError error={create.error} />
          <div className="cluster cluster--8 cluster--end">
            <Button type="submit" variant="primary" disabled={!contactId || !name.trim() || create.isPending}>
              <Icon name="lock" size={13} />
              {create.isPending ? "Creating…" : "Create key"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="notice notice--info text-small" role="status">
          Only admins can create or revoke keys.
        </div>
      )}

      {created && (
        <NewIntakeKey
          created={created}
          title={`Key for ${clientName(created.contactId)} · ${created.name}`}
          onDone={() => setCreated(null)}
        />
      )}

      <IntakeSetup />

      <div className="stack stack--6">
        <span className="kicker kicker--sm kicker--muted">KEYS</span>
        <LoadState query={query} loadingText="Loading keys…">
          <IntakeKeyTable
            keys={query.data ?? []}
            describe={(k) => ({ title: clientName(k.contactId), detail: k.name })}
            canManage={canManage}
            onRevoke={(id, done) => revoke.mutate(id, { onSuccess: done })}
            revoking={revoke.isPending}
            error={revoke.error}
            empty="No client CRMs connected yet."
          />
        </LoadState>
      </div>
    </Modal>
  );
}
