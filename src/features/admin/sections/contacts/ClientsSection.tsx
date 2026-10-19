"use client";

import { useState } from "react";
import { Badge, Button, Field, Icon, Input, LoadState, Select } from "@/components/ui";
import { SOURCE_LABELS, type CoreStage, type LeadSource } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { ContactOut } from "@/utils/api/models";
import { formatShort, getTimeZone, isoDateIn, addDaysIso, todayIso } from "@/utils/format/dates";
import { useSubscriptions } from "@/utils/hooks/useBilling";
import { useAllContacts, usePipelines, useTags } from "@/utils/hooks/useContacts";
import {
  CONTACT_STATUS,
  callText,
  contactName,
  contactStatus,
  getSalesStages,
  isActiveClient,
  isInactiveClient,
  stageOf,
  subscriptionOf,
  subscriptionText,
} from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";

type StageFilter = "all" | Exclude<CoreStage, "lost">;
type DateFilter = "any" | "7" | "30" | "month";
type SubFilter = "any" | "active" | "none";
type CallFilter = "any" | "scheduled" | "needs" | "none";

const DATE_LABELS: Record<Exclude<DateFilter, "any">, string> = { "7": "Last 7 days", "30": "Last 30 days", month: "This month" };
const CALL_LABELS: Record<Exclude<CallFilter, "any">, string> = { scheduled: "Call scheduled", needs: "Needs a time", none: "No call" };

export function ClientsSection() {
  const { state, update } = useAdmin();
  const { contactView } = state;

  const [stage, setStage] = useState<StageFilter>("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [source, setSource] = useState<LeadSource | "">("");
  const [date, setDate] = useState<DateFilter>("any");
  const [sub, setSub] = useState<SubFilter>("any");
  const [call, setCall] = useState<CallFilter>("any");

  // Search, tag and source filter on the server; the rest are views over what came back.
  const q = query.trim();
  const active = useAllContacts({ q: q || undefined, tag_id: tag || undefined, source: source || undefined });
  // The Inactive view also lists archived contacts.
  const archived = useAllContacts({ q: q || undefined, tag_id: tag || undefined, source: source || undefined, archived: true });
  const subsQuery = useSubscriptions();
  const subscriptions = subsQuery.data;
  const tags = useTags().data ?? [];
  const stages = getSalesStages(usePipelines().data);
  const contacts: ContactOut[] = [...(active.data ?? []), ...(contactView === "inactive" ? (archived.data ?? []) : [])];

  const count = (s: CoreStage) => contacts.filter((c) => c.stage === s && inView(c)).length;

  function inView(c: ContactOut) {
    if (c.archivedAt) return contactView === "inactive";
    return contactView === "active" ? isActiveClient(c, subscriptions) : contactView === "inactive" ? isInactiveClient(c, subscriptions) : true;
  }

  const today = todayIso();
  const signedInRange = (c: ContactOut) => {
    if (date === "any") return true;
    const day = isoDateIn(new Date(c.createdAt), getTimeZone());
    const start = date === "7" ? addDaysIso(today, -6) : date === "30" ? addDaysIso(today, -29) : today.slice(0, 8) + "01";
    return day >= start && day <= today;
  };

  const viewRows = contacts.filter(inView);
  const rows = viewRows.filter((c) => {
    if (stage !== "all" && c.stage !== stage) return false;
    if (!signedInRange(c)) return false;
    const hasSub = !!subscriptionOf(subscriptions, c.id);
    if (sub === "active" && !hasSub) return false;
    if (sub === "none" && hasSub) return false;
    if (call === "scheduled" && !(c.stage === "booked" && c.callAt)) return false;
    if (call === "needs" && !(c.stage === "booked" && !c.callAt)) return false;
    if (call === "none" && c.stage === "booked") return false;
    return true;
  });

  const chips: Array<{ label: string; clear: () => void }> = [];
  const tagName = tags.find((t) => t.id === tag)?.name;
  if (tag && tagName) chips.push({ label: `Tag: ${tagName}`, clear: () => setTag("") });
  if (source) chips.push({ label: `Source: ${SOURCE_LABELS[source]}`, clear: () => setSource("") });
  if (date !== "any") chips.push({ label: `Signed up: ${DATE_LABELS[date]}`, clear: () => setDate("any") });
  if (sub !== "any") chips.push({ label: sub === "active" ? "Active subscription" : "No subscription", clear: () => setSub("any") });
  if (call !== "any") chips.push({ label: CALL_LABELS[call], clear: () => setCall("any") });

  const clearAll = () => {
    setTag("");
    setSource("");
    setDate("any");
    setSub("any");
    setCall("any");
  };

  const pills: Array<{ value: StageFilter; label: string }> = [
    { value: "all", label: `All (${viewRows.length})` },
    { value: "lead", label: `New leads (${count("lead")})` },
    { value: "booked", label: `Booked a call (${count("booked")})` },
    { value: "paid", label: `Paid (${count("paid")})` },
  ];

  return (
    <div className="stack stack--16">
      <div className="section-head section-head--end">
        <div className="cluster cluster--8" role="group" aria-label="Filter by stage">
          {pills.map((p) => (
            <button
              key={p.value}
              type="button"
              className="chip chip--dark chip--lg"
              aria-pressed={stage === p.value}
              onClick={() => setStage(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Field label="Search clients" htmlFor="client-search" className="clients-search">
          <Input id="client-search" type="search" placeholder="Name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
      </div>

      <div className="cluster cluster--8">
        <button
          type="button"
          className={cn("btn btn--secondary", filtersOpen && "btn--dark")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Icon name="funnel" size={15} />
          Filters
          {chips.length > 0 && <span className="filter-count">{chips.length}</span>}
        </button>
        {chips.map((chip) => (
          <span className="filter-chip filter-chip--cyan" key={chip.label}>
            {chip.label}
            <button type="button" onClick={chip.clear} aria-label={`Remove filter ${chip.label}`}>
              ×
            </button>
          </span>
        ))}
        {chips.length > 0 && (
          <button type="button" className="btn btn--link u-muted" onClick={clearAll}>
            Clear all
          </button>
        )}
        <span className="text-muted u-push-right">
          Showing {rows.length} of {viewRows.length} clients
        </span>
      </div>

      {filtersOpen && (
        <div className="card card--tight filter-panel">
          <Field label="Tag" htmlFor="cf-tag">
            <Select id="cf-tag" value={tag} placeholder="Any tag" options={tags.map((t) => ({ value: t.id, label: t.name }))} onChange={(e) => setTag(e.target.value)} />
          </Field>
          <Field label="Source" htmlFor="cf-src">
            <Select
              id="cf-src"
              value={source}
              placeholder="Any source"
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label: label! }))}
              onChange={(e) => setSource(e.target.value as LeadSource | "")}
            />
          </Field>
          <Field label="Signed up" htmlFor="cf-date">
            <Select id="cf-date" value={date} onChange={(e) => setDate(e.target.value as DateFilter)}>
              <option value="any">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="month">This month</option>
            </Select>
          </Field>
          <Field label="Subscription" htmlFor="cf-sub">
            <Select id="cf-sub" value={sub} onChange={(e) => setSub(e.target.value as SubFilter)}>
              <option value="any">Any</option>
              <option value="active">Active subscription</option>
              <option value="none">No subscription</option>
            </Select>
          </Field>
          <Field label="Call" htmlFor="cf-call">
            <Select id="cf-call" value={call} onChange={(e) => setCall(e.target.value as CallFilter)}>
              <option value="any">Any</option>
              <option value="scheduled">Call scheduled</option>
              <option value="needs">Needs a time</option>
              <option value="none">No call</option>
            </Select>
          </Field>
        </div>
      )}

      <LoadState query={active} loadingText="Loading contacts…">
      <div className="card card--table card--flat">
        <table className="data-table data-table--roomy data-table--plain">
          <thead>
            <tr>
              <th>Client</th>
              <th>Phone</th>
              <th>Source</th>
              <th>Signed up</th>
              <th>Call</th>
              <th>Subscription</th>
              <th>Status</th>
              <th>Stage</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const subscription = subscriptionOf(subscriptions, c.id);
              const status = CONTACT_STATUS[contactStatus(c.stage, subscription?.status === "Paused", !!c.archivedAt)];
              const stageInfo = stageOf(stages, c.stage);
              const name = contactName(c);
              const edit = () => update({ editContactId: c.id });
              return (
                <tr key={c.id}>
                  <td>
                    <button type="button" className="cell-button" onClick={edit}>
                      <strong className="data-table__strong">{name}</strong>
                      <span className="text-small">{c.email}</span>
                    </button>
                  </td>
                  <td>{c.phone}</td>
                  <td>{SOURCE_LABELS[c.source as LeadSource] ?? c.source}</td>
                  <td>{formatShort(c.createdAt)}</td>
                  <td>{callText(c)}</td>
                  <td>{subscriptionText(subscription)}</td>
                  <td>
                    <Badge tone={status.tone} dot>
                      {c.archivedAt ? "Archived" : status.label}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={stageInfo.tone} size="lg">
                      {stageInfo.label}
                    </Badge>
                  </td>
                  <td className="data-table__actions">
                    <Button variant="outline" size="sm" onClick={edit} aria-label={`Edit ${name}`}>
                      <Icon name="edit" size={13} />
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="table-empty">{contacts.length ? "No clients match this filter." : "No contacts yet."}</p>}
      </div>
      </LoadState>
    </div>
  );
}
