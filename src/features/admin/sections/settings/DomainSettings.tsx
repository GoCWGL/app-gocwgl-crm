"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, Icon, IconTile, Input, Select } from "@/components/ui";
import { DOMAIN_PURPOSES, RESERVED_SUBDOMAINS, type Domain, type DomainPurpose } from "@/data/admin";
import { cn, copyToClipboard, newId } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

const isSubdomain = (host: string) => host.split(".").length >= 3;
const isValidHost = (host: string) => /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && !host.includes("..");

/** Deterministic verification token for a host (sample only). */
const verifyToken = (host: string) =>
  "gocwgl-verify=" + Array.from(host).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36) + "x9k2";

function dnsRecords(d: Domain): Array<[string, string, string]> {
  const label = isSubdomain(d.host) ? d.host.split(".")[0] : "@";
  const records: Array<[string, string, string]> =
    d.purpose === "email"
      ? [
          ["TXT", "@", "v=spf1 include:mail.[yourplatform].com ~all"],
          ["CNAME", "crm1._domainkey", "dkim.[yourplatform].com"],
          ["TXT", "_dmarc", "v=DMARC1; p=none;"],
        ]
      : isSubdomain(d.host)
        ? [["CNAME", label, "cname.[yourplatform].com"]]
        : [
            ["A", "@", "[PLATFORM IP ADDRESS]"],
            ["CNAME", "www", "cname.[yourplatform].com"],
          ];
  records.push(["TXT", label === "@" ? "_gocwgl" : `_gocwgl.${label}`, verifyToken(d.host)]);
  return records;
}

/** Free subdomain + custom domains with the DNS records to add. */
export function DomainSettings() {
  const { state, update } = useAdmin();
  const { domains } = state;

  const [subDraft, setSubDraft] = useState(state.subdomain);
  const [subMessage, setSubMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState(0);
  const [copiedKey, setCopiedKey] = useState("");
  const [newHost, setNewHost] = useState("");
  const [purpose, setPurpose] = useState<DomainPurpose>("all");
  const [error, setError] = useState("");

  const host = newHost.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const setDomains = (fn: (list: Domain[]) => Domain[]) => update((s) => ({ domains: fn(s.domains) }));

  const saveSubdomain = (e: FormEvent) => {
    e.preventDefault();
    if (subDraft.length < 3) return setSubMessage({ ok: false, text: "Use at least 3 letters or numbers." });
    if (RESERVED_SUBDOMAINS.includes(subDraft)) return setSubMessage({ ok: false, text: "That name is reserved. Try another." });
    update({ subdomain: subDraft });
    setSubMessage({ ok: true, text: `Saved. Your pages now live at https://${subDraft}.[yourplatform].com` });
  };

  const addDomain = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidHost(host)) return setError("Enter a domain like book.yourbusiness.com (no https:// or slashes).");
    if (domains.some((d) => d.host === host)) return setError("That domain is already connected.");
    const id = newId();
    setDomains((list) => [...list, { id, host, purpose, status: "Pending DNS", primary: false }]);
    setNewHost("");
    setOpenId(id);
  };

  const hint = !host
    ? "Tip: a subdomain like book.yourbusiness.com only needs one CNAME record."
    : isValidHost(host)
      ? isSubdomain(host)
        ? "Subdomain — you will add 1 CNAME record plus a TXT record to verify."
        : "Root domain — you will add an A record, a www CNAME and a TXT record to verify."
      : "That does not look like a domain yet.";

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
                setSubDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSubMessage(null);
              }}
            />
            <span className="input-group__addon">.[yourplatform].com</span>
          </div>
          <Button type="submit" variant="outline" className="u-strong">
            Save subdomain
          </Button>
        </form>
        <span className={cn("text-small", subMessage && (subMessage.ok ? "u-green" : "u-pink"))}>
          {subMessage?.text ?? `Current: https://${state.subdomain}.[yourplatform].com`}
        </span>
      </div>

      <div className="stack stack--10">
        <div className="stack stack--2">
          <span className="kicker">CUSTOM DOMAINS · {domains.length}</span>
          <span className="text-muted">
            Use your own domain or subdomain, like book.yourbusiness.com. A subdomain is easiest because your main website stays untouched.
          </span>
        </div>

        {domains.map((d) => {
          const verified = d.status === "Verified";
          const open = openId === d.id;
          return (
            <article key={d.id} className={cn("domain-card", d.primary && "domain-card--primary")}>
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
                {d.primary && <Badge tone="brand">PRIMARY</Badge>}
              </div>
              <div className="cluster cluster--8 domain-card__actions">
                <Button size="sm" aria-expanded={open} onClick={() => setOpenId(open ? 0 : d.id)}>
                  {open ? "Hide DNS records" : "Show DNS records"}
                </Button>
                {!verified && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setDomains((list) => list.map((x) => (x.id === d.id ? { ...x, status: "Verified" } : x)));
                      setOpenId(d.id);
                    }}
                  >
                    Check DNS now
                  </Button>
                )}
                {verified && !d.primary && d.purpose !== "email" && (
                  <Button size="sm" variant="accent" onClick={() => setDomains((list) => list.map((x) => ({ ...x, primary: x.id === d.id })))}>
                    Make primary
                  </Button>
                )}
                <span className="u-spacer" />
                <Button size="sm" variant="danger" aria-label={`Remove ${d.host}`} onClick={() => setDomains((list) => list.filter((x) => x.id !== d.id))}>
                  Remove
                </Button>
              </div>
              {open && (
                <div className="domain-card__dns">
                  <span className="text-body">
                    Add these records where you bought your domain (GoDaddy, Namecheap, Cloudflare and so on). Changes can take up to 24
                    hours to show.
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
        {domains.length === 0 && <div className="empty-state">No custom domains yet.</div>}
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
        <Button type="submit" variant="primary" className="u-self-start">
          Add domain
        </Button>
      </form>
    </div>
  );
}
