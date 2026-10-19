"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconTile, Input, LoadState, Select } from "@/components/ui";
import { DOMAIN_PURPOSES, type DomainPurpose } from "@/data/admin";
import { cn, copyToClipboard } from "@/lib/utils";
import type { DomainOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import {
  useAddDomain,
  useDeleteDomain,
  useDomains,
  useMakeDomainPrimary,
  useSetSubdomain,
  useSettings,
  useVerifyDomain,
} from "@/utils/hooks/useSettings";

const isSubdomain = (host: string) => host.split(".").length >= 3;

/** The TXT record that proves the domain is yours (from the API). */
function dnsRecords(d: DomainOut): Array<[string, string, string]> {
  const r = (d.verificationRecord ?? {}) as { type?: string; name?: string; value?: string };
  return r.name ? [[r.type ?? "TXT", r.name, r.value ?? ""]] : [];
}

/** Free subdomain + custom domains with the DNS records to add. */
export function DomainSettings() {
  const settings = useSettings();
  const domainsQuery = useDomains();
  const domains = domainsQuery.data ?? [];
  const saveSub = useSetSubdomain();
  const add = useAddDomain();
  const verify = useVerifyDomain();
  const makePrimary = useMakeDomainPrimary();
  const remove = useDeleteDomain();

  const subdomain = settings.data?.subdomain ?? "";
  const [subEdit, setSubEdit] = useState<string | null>(null);
  const subDraft = subEdit ?? subdomain;
  const [subMessage, setSubMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [newHost, setNewHost] = useState("");
  const [purpose, setPurpose] = useState<DomainPurpose>("all");
  const [error, setError] = useState("");

  const host = newHost.trim().toLowerCase();

  const saveSubdomain = (e: FormEvent) => {
    e.preventDefault();
    saveSub.mutate(subDraft, {
      onSuccess: (s) => {
        setSubEdit(null);
        setSubMessage({ ok: true, text: `Saved. Your pages now live at https://${s.subdomain}.[yourplatform].com` });
      },
      onError: (err) => setSubMessage({ ok: false, text: fieldErrors(err).subdomain || errorMessage(err) }),
    });
  };

  const addDomain = (e: FormEvent) => {
    e.preventDefault();
    if (!host) return setError("Enter a domain like book.yourbusiness.com.");
    add.mutate(
      { host, purpose },
      {
        onSuccess: (d) => {
          setNewHost("");
          setOpenId(d.id);
        },
        onError: (err) => setError(fieldErrors(err).host || errorMessage(err)),
      },
    );
  };

  const hint = "After adding it, create the TXT record we show you, then press “Check DNS now”.";

  return (
    <div className="page-stack">
      <div className="inset domain-free">
        <div className="cluster cluster--nowrap">
          <span className="kicker">FREE SUBDOMAIN</span>
          <Badge tone="green" size="xs">
            ALWAYS ON
          </Badge>
        </div>
        <span className="text-muted">
          Works right away, no DNS setup. Your forms, booking pages and client progress pages live here until you connect your own domain.
        </span>
        <form className="cluster cluster--8" onSubmit={saveSubdomain}>
          <label className="sr-only" htmlFor="dm-sub">
            Subdomain name
          </label>
          <div className="input-group domain-free__input">
            <span className="input-group__addon">https://</span>
            <input
              id="dm-sub"
              className="input input--mono u-strong"
              value={subDraft}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setSubEdit(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSubMessage(null);
              }}
            />
            <span className="input-group__addon">.[yourplatform].com</span>
          </div>
          <Button type="submit" variant="outline" className="u-strong" disabled={saveSub.isPending || !subDraft}>
            Save subdomain
          </Button>
        </form>
        <span className={cn("text-small", subMessage && (subMessage.ok ? "u-green" : "u-pink"))}>
          {subMessage?.text ?? (subdomain ? `Current: https://${subdomain}.[yourplatform].com` : "Choose your free subdomain.")}
        </span>
      </div>

      <div className="stack stack--10">
        <div className="stack stack--2">
          <span className="kicker">CUSTOM DOMAINS · {domains.length}</span>
          <span className="text-muted">
            Use your own domain or subdomain, like book.yourbusiness.com. A subdomain is easiest because your main website stays untouched.
          </span>
        </div>

        <FormError error={verify.error ?? makePrimary.error ?? remove.error} />
        <LoadState query={domainsQuery} isEmpty={domains.length === 0} empty="No custom domains yet.">
        {domains.map((d) => {
          const verified = d.status === "Verified";
          const open = openId === d.id;
          return (
            <article key={d.id} className={cn("domain-card", d.isPrimary && "domain-card--primary")}>
              <div className="domain-card__head">
                <IconTile tone={verified ? "green" : "cyan"} size="md">
                  <Icon name="globe" size={17} strokeWidth={1.9} />
                </IconTile>
                <div className="stack stack--2 domain-card__host">
                  <span className="domain-card__name">{d.host}</span>
                  <span className="text-small">
                    {isSubdomain(d.host) ? "Subdomain" : "Root domain"} · Used for{" "}
                    {DOMAIN_PURPOSES.find((p) => p.value === d.purpose)?.short}
                  </span>
                </div>
                <Badge tone={verified ? "green" : d.status === "Failed" ? "red" : "amber"} dot>
                  {d.status}
                </Badge>
                <Badge tone="neutral">SSL: {verified ? "Active" : "Waiting for DNS"}</Badge>
                {d.isPrimary && <Badge tone="brand">PRIMARY</Badge>}
              </div>
              <div className="cluster cluster--8 domain-card__actions">
                <Button size="sm" aria-expanded={open} onClick={() => setOpenId(open ? "" : d.id)}>
                  {open ? "Hide DNS records" : "Show DNS records"}
                </Button>
                {!verified && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={verify.isPending}
                    onClick={() => {
                      setOpenId(d.id);
                      verify.mutate(d.id);
                    }}
                  >
                    {verify.isPending && verify.variables === d.id ? "Checking…" : "Check DNS now"}
                  </Button>
                )}
                {verified && !d.isPrimary && d.purpose !== "email" && (
                  <Button size="sm" variant="accent" disabled={makePrimary.isPending} onClick={() => makePrimary.mutate(d.id)}>
                    Make primary
                  </Button>
                )}
                <span className="u-spacer" />
                <Button size="sm" variant="danger" aria-label={`Remove ${d.host}`} disabled={remove.isPending} onClick={() => remove.mutate(d.id)}>
                  Remove
                </Button>
              </div>
              {open && (
                <div className="domain-card__dns">
                  <span className="text-body">
                    Add this record where you bought your domain (GoDaddy, Namecheap, Cloudflare and so on) to prove it’s yours. Changes
                    can take up to 24 hours to show.
                  </span>
                  <div className="table-scroll dns-table-wrap">
                    <table className="data-table data-table--compact dns-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Name / host</th>
                          <th>Value</th>
                          <th>Status</th>
                          <th>
                            <span className="sr-only">Copy</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dnsRecords(d).map(([type, name, value], i) => {
                          const key = `${d.id}-${i}`;
                          return (
                            <tr key={key}>
                              <td className="data-table__mono">{type}</td>
                              <td className="u-mono">{name}</td>
                              <td className="u-mono u-cyan dns-table__value">{value}</td>
                              <td className={cn("text-tiny u-strong", verified ? "u-green" : "u-amber")}>
                                {verified ? "Found ✓" : "Not found yet"}
                              </td>
                              <td className="data-table__actions">
                                <button
                                  type="button"
                                  className="mini-action"
                                  onClick={() => {
                                    copyToClipboard(value);
                                    setCopiedKey(key);
                                  }}
                                >
                                  {copiedKey === key ? "Copied" : "Copy"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        </LoadState>
      </div>

      <form className="card card--glow card--tight domain-add" onSubmit={addDomain}>
        <span className="kicker">CONNECT A DOMAIN</span>
        <div className="form-grid">
          <Field label="Domain or subdomain" htmlFor="dm-host">
            <Input
              id="dm-host"
              mono
              spellCheck={false}
              autoComplete="off"
              placeholder="book.yourbusiness.com"
              value={newHost}
              onChange={(e) => {
                setNewHost(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Field label="Use it for" htmlFor="dm-purpose">
            <Select id="dm-purpose" value={purpose} options={DOMAIN_PURPOSES} onChange={(e) => setPurpose(e.target.value as DomainPurpose)} />
          </Field>
        </div>
        <span className="text-small">{hint}</span>
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="u-self-start" disabled={add.isPending}>
          Add domain
        </Button>
      </form>
    </div>
  );
}
