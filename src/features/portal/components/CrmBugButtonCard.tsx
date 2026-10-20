"use client";

import { useState, type FormEvent } from "react";
import { IntakeKeyTable, IntakeSetup, NewIntakeKey } from "@/components/intake/IntakeKeys";
import { Button, Field, FormError, Icon, Input, LoadState } from "@/components/ui";
import type { IntakeKeyCreated } from "@/utils/api/models";
import { isStaffAdmin, useSession } from "@/utils/auth/session";
import { fieldErrors } from "@/utils/errors";
import { useCreatePortalIntakeKey, usePortalIntakeKeys, useRevokePortalIntakeKey } from "@/utils/hooks/useSupport";
import { usePortal } from "../state/PortalContext";

/**
 * Lets the client's own CRM send bug reports to GoCWGL. The portal owner creates or revokes keys, and so can a
 * GoCWGL admin in "View as client" (the API allows that one write there).
 */
export function CrmBugButtonCard() {
  const { isOwner } = usePortal();
  const { user, viewAsClientId } = useSession();
  const adminViewing = !!viewAsClientId && isStaffAdmin(user);
  const canManage = isOwner || adminViewing;
  const query = usePortalIntakeKeys();
  const create = useCreatePortalIntakeKey();
  const revoke = useRevokePortalIntakeKey();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<IntakeKeyCreated | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (key) => {
          setCreated(key);
          setName("");
        },
      },
    );
  };

  return (
    <section className="card stack stack--12">
      <div className="stack stack--4">
        <span className="kicker">BUG BUTTON FOR YOUR CRM</span>
        <span className="text-small">
          Add a “Report a bug” button to your own CRM. Reports go straight to your GoCWGL team and show up in Your requests above.
        </span>
      </div>

      {adminViewing && (
        <div className="notice notice--info text-small" role="status">
          You’re viewing as this client. As an admin you can create and revoke their CRM keys here.
        </div>
      )}

      {canManage && (
        <form className="cluster cluster--8 cluster--end" onSubmit={submit}>
          <Field label="Where it’s used" htmlFor="crm-key-name" className="u-grow" error={fieldErrors(create.error).name}>
            <Input id="crm-key-name" maxLength={80} value={name} placeholder="Our CRM (production)" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={!name.trim() || create.isPending}>
            <Icon name="lock" size={13} />
            {create.isPending ? "Creating…" : "Create key"}
          </Button>
        </form>
      )}
      <FormError error={create.error} />

      {created && <NewIntakeKey created={created} title={`Key for ${created.name}`} onDone={() => setCreated(null)} />}

      <LoadState query={query} loadingText="Loading keys…">
        <IntakeKeyTable
          keys={query.data ?? []}
          describe={(k) => ({ title: k.name, detail: "Your CRM" })}
          canManage={canManage}
          onRevoke={(id, done) => revoke.mutate(id, { onSuccess: done })}
          revoking={revoke.isPending}
          error={revoke.error}
          empty={canManage ? "No CRM connected yet. Create a key to get started." : "No CRM connected yet."}
        />
      </LoadState>

      <IntakeSetup />
    </section>
  );
}
