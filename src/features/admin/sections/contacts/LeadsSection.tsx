"use client";

import { useState } from "react";
import { Badge, Button, ConfirmDialog, Icon, LoadState, SearchBox } from "@/components/ui";
import { SOURCE_LABELS, type LeadSource } from "@/data/admin";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { LeadOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShortDateTime } from "@/utils/format/dates";
import { useConvertContact, useLeads } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName, SALES_STAGES, stageOf } from "../../lib/contacts";
import { AddLeadModal } from "../../modals/AddLeadModal";
import { AddVaModal } from "../../modals/AddVaModal";
import { useAdmin } from "../../state/AdminContext";

/**
 * People › Leads: everyone who booked a call on any calendar and isn't a client, a VA or a teammate yet.
 * Each lead can be turned into a client (they join Clients › Onboarding) or a VA (Add a VA, filled in with their details).
 * Leads who sign up as a client or a VA themselves leave this list on their own. The team can also add a lead by hand.
 */
export function LeadsSection() {
  const { notify, openClient } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const leads = useLeads();
  const convert = useConvertContact();
  const [query, setQuery] = useState("");
  const [toClient, setToClient] = useState<LeadOut | null>(null);
  // "To VA" asks first, then opens Add a VA filled in with the lead's details.
  const [askVa, setAskVa] = useState<LeadOut | null>(null);
  const [toVa, setToVa] = useState<LeadOut | null>(null);
  const [adding, setAdding] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = (leads.data ?? []).filter(({ contact: c }) =>
    !q || [contactName(c), c.email, c.phone, c.company].some((v) => v.toLowerCase().includes(q)),
  );

  const makeClient = () => {
    if (!toClient) return;
    const name = contactName(toClient.contact);
    convert.mutate(
      { id: toClient.contact.id, to: "client" },
      {
        onSuccess: () => {
          setToClient(null);
          notify(`${name} is now a client. You'll find them in Clients › Onboarding.`);
        },
      },
    );
  };

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="board__bar">
          <span className="text-strong">
            {leads.isPending ? "Leads" : `${rows.length} ${rows.length === 1 ? "lead" : "leads"}`}
          </span>
          <div className="board__actions">
            <SearchBox label="Search leads" value={query} onChange={setQuery} />
            {canWrite && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Icon name="userPlus" size={14} /> Add a lead
              </Button>
            )}
          </div>
        </div>

        <LoadState query={leads} loadingText="Loading leads…">
          <div className="table-scroll">
            <table className="data-table data-table--roomy data-table--plain">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Calendar</th>
                  <th>Latest call</th>
                  <th>Calls booked</th>
                  <th>Source</th>
                  <th>Stage</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => {
                  const c = lead.contact;
                  const name = contactName(c);
                  const stage = stageOf(SALES_STAGES, c.stage);
                  return (
                    <tr key={c.id}>
                      <td>
                        <button type="button" className="cell-button" onClick={() => openClient(c.id)}>
                          <strong className="data-table__strong">{name}</strong>
                          <span className="text-small">{c.email}</span>
                        </button>
                      </td>
                      <td>{c.phone || "—"}</td>
                      <td>{lead.calendarName || (lead.bookings ? "—" : "Added by hand")}</td>
                      <td>{lead.lastBookedAt ? formatShortDateTime(lead.lastBookedAt) : "No call yet"}</td>
                      <td>{lead.bookings}</td>
                      <td>{SOURCE_LABELS[c.source as LeadSource] ?? c.source}</td>
                      <td>
                        <Badge tone={stage.tone} size="lg">
                          {stage.label}
                        </Badge>
                      </td>
                      <td className="data-table__actions">
                        {canWrite && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setToClient(lead)} aria-label={`Convert ${name} to a client`}>
                              <Icon name="user" size={13} /> To client
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setAskVa(lead)} aria-label={`Convert ${name} to a VA`}>
                              <Icon name="briefcase" size={13} /> To VA
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="board__empty">
                <span className={cn("board__empty-icon", toneClass("cyan"))} aria-hidden="true">
                  <Icon name="userPlus" size={18} />
                </span>
                <span className="text-strong">{q ? "No leads match" : "No leads yet"}</span>
                <span className="text-small">
                  {q ? "Try another search." : "Everyone who books a call and isn't a client or a VA yet shows up here, and anyone you add."}
                </span>
              </div>
            )}
          </div>
        </LoadState>
      </div>

      {toClient && (
        <ConfirmDialog
          title={`Make ${contactName(toClient.contact)} a client?`}
          confirmLabel={convert.isPending ? "Converting…" : "Convert to client"}
          icon="user"
          pending={convert.isPending}
          error={convert.error}
          onConfirm={makeClient}
          onClose={() => {
            setToClient(null);
            convert.reset();
          }}
        >
          They leave Leads and join Clients › Onboarding, where you can invite them to their portal and bill them.
        </ConfirmDialog>
      )}

      {adding && <AddLeadModal onClose={() => setAdding(false)} />}

      {askVa && (
        <ConfirmDialog
          title={`Make ${contactName(askVa.contact)} a VA?`}
          confirmLabel="Continue"
          icon="briefcase"
          onConfirm={() => {
            setToVa(askVa);
            setAskVa(null);
          }}
          onClose={() => setAskVa(null)}
        >
          Next you&apos;ll add their VA account, filled in with their details. Once it&apos;s saved they leave Leads and join People › VAs.
        </ConfirmDialog>
      )}

      {toVa && (
        <AddVaModal
          initial={{ first: toVa.contact.firstName, last: toVa.contact.lastName, email: toVa.contact.email, phone: toVa.contact.phone }}
          // Adding the VA converts the lead on the server; this marks it too, in case their email was changed in the form.
          onAdded={() => convert.mutate({ id: toVa.contact.id, to: "va" })}
          onClose={() => setToVa(null)}
        />
      )}
    </div>
  );
}
