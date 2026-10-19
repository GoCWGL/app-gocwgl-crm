"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, FormError, Icon } from "@/components/ui";
import { copyToClipboard } from "@/lib/utils";
import type { IntakeKeyCreated, IntakeKeyOut } from "@/utils/api/models";
import { formatRelative, formatShort } from "@/utils/format/dates";

/** What the CRM's developer needs: called from the CRM's server, never from the browser. */
export function intakeSnippet(origin: string): string {
  return `curl -X POST ${origin}/api/intake/bugs \\
  -H "Authorization: Bearer $GOCWGL_INTAKE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Save button does nothing",
    "description": "Steps to reproduce…",
    "priority": "High",
    "device": "Chrome / macOS",
    "reporterName": "Dana",
    "reporterEmail": "dana@client.com",
    "pageUrl": "https://crm.client.com/deals/42"
  }'`;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="primary"
      onClick={() => {
        copyToClipboard(text);
        setCopied(true);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Copied" : label}
    </Button>
  );
}

/** The new key, shown once right after it is created. */
export function NewIntakeKey({ created, title, onDone }: { created: IntakeKeyCreated; title: ReactNode; onDone: () => void }) {
  return (
    <div className="notice notice--warning stack stack--8" role="status">
      <span className="u-strong">{title}</span>
      <span className="text-small">
        Copy it now. It won’t be shown again. Store it on the CRM’s server (for example as GOCWGL_INTAKE_KEY). It must never go in browser
        code.
      </span>
      <pre className="code-block">{created.key}</pre>
      <div className="cluster cluster--8">
        <CopyButton text={created.key} label="Copy key" />
        <Button size="sm" onClick={onDone}>
          I’ve saved it
        </Button>
      </div>
    </div>
  );
}

/** How the CRM's "Report a bug" button sends reports here. */
export function IntakeSetup() {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const snippet = intakeSnippet(origin);
  return (
    <div className="stack stack--6">
      <span className="kicker kicker--sm kicker--muted">SETUP FOR THE CRM’S DEVELOPER</span>
      <span className="text-small">
        The CRM’s “Report a bug” button posts to its own backend, and the backend forwards it here. Only <code>title</code> is required.
        Priority is Low, Medium, High or Critical.
      </span>
      <pre className="code-block">{snippet}</pre>
      <div className="cluster cluster--8">
        <CopyButton text={snippet} label="Copy instructions" />
      </div>
    </div>
  );
}

type IntakeKeyTableProps = {
  keys: IntakeKeyOut[];
  /** First column: what the key is for (and, for the team, whose it is). */
  describe: (key: IntakeKeyOut) => { title: string; detail: string };
  canManage: boolean;
  onRevoke: (id: string, done: () => void) => void;
  revoking: boolean;
  error: unknown;
  empty: string;
};

/** Every key with its status; active ones first. Revoking asks for a second click. */
export function IntakeKeyTable({ keys, describe, canManage, onRevoke, revoking, error, empty }: IntakeKeyTableProps) {
  const [confirmId, setConfirmId] = useState("");
  const rows = [...keys].sort((a, b) => Number(!!a.revokedAt) - Number(!!b.revokedAt) || b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <FormError error={error} />
      <table className="data-table">
        <thead>
          <tr>
            <th>CRM</th>
            <th>Key</th>
            <th>Last used</th>
            <th>Status</th>
            {canManage && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const { title, detail } = describe(k);
            return (
              <tr key={k.id}>
                <td>
                  <span className="stack stack--2">
                    <strong className="data-table__strong">{title}</strong>
                    <span className="text-small">
                      {detail} · created {formatShort(k.createdAt)}
                    </span>
                  </span>
                </td>
                <td className="data-table__code">{k.hint}</td>
                <td className="u-nowrap">{k.lastUsedAt ? formatRelative(k.lastUsedAt) : "Never"}</td>
                <td>
                  <Badge tone={k.revokedAt ? "slate" : "green"} dot>
                    {k.revokedAt ? "Revoked" : "Active"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="u-nowrap">
                    {!k.revokedAt &&
                      (confirmId === k.id ? (
                        <span className="cluster cluster--8 cluster--nowrap">
                          <Button size="sm" variant="danger-solid" disabled={revoking} onClick={() => onRevoke(k.id, () => setConfirmId(""))}>
                            {revoking ? "Revoking…" : "Revoke now"}
                          </Button>
                          <Button size="sm" onClick={() => setConfirmId("")}>
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setConfirmId(k.id)}>
                          Revoke
                        </Button>
                      ))}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="table-empty">{empty}</p>}
    </>
  );
}
