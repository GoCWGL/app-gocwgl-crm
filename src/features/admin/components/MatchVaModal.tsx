"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, Field, FormError, Icon, LoadState, Modal, SearchBox, Select } from "@/components/ui";
import { TRAINING_FEE_SHORT, VA_MAINTENANCE_FEE_DOLLARS } from "@/features/portal/lib/vaAgreement";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { useAssignClientVa, useClientVas } from "@/utils/hooks/useClientWork";
import { useContactsPage } from "@/utils/hooks/useContacts";
import { useVas } from "@/utils/hooks/useVas";
import { businessName, contactName } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

type HoursChoice = "" | "10" | "20" | "40" | "project";
const HOURS: Array<{ value: Exclude<HoursChoice, "">; label: string }> = [
  { value: "10", label: "10 hours a week" },
  { value: "20", label: "20 hours a week" },
  { value: "40", label: "40 hours a week (full time)" },
  { value: "project", label: "Open project (no maintenance fee)" },
];
/** "$45 a month". */
const feeLabel = (dollars: number | null) => (dollars == null ? "" : `${"$"}${dollars} a month`);

/**
 * Match a VA to a client directly, even if the client never requested one: the VA joins their team right away
 * (client portal › Team; VA portal › Clients). Opened from the VA requests board (pick the client too) or from a
 * client's profile (the client is set).
 */
export function MatchVaModal({ client, onClose }: { client?: { id: string; name: string }; onClose: () => void }) {
  const { notify } = useAdmin();
  const assign = useAssignClientVa();
  const [clientQ, setClientQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(client ?? null);
  const contacts = useContactsPage({ q: clientQ.trim(), limit: 8 });
  const [vaQ, setVaQ] = useState("");
  const [vaId, setVaId] = useState("");
  const vas = useVas(vaQ.trim());
  // VAs already on this client's team can't be matched again.
  const onTeam = new Set((useClientVas(picked?.id ?? "").data ?? []).filter((v) => v.active).map((v) => v.vaId));
  const list = (vas.data?.vas ?? []).filter((v) => v.isActive);
  const vaName = list.find((v) => v.id === vaId)?.fullName ?? "The VA";
  // Hours a week for this client: the monthly maintenance fee follows from it ("project" = quoted by GoCWGL).
  const [hours, setHours] = useState<HoursChoice>("");
  const hoursPerWeek = hours === "" || hours === "project" ? null : (Number(hours) as 10 | 20 | 40);
  const fee = hoursPerWeek ? VA_MAINTENANCE_FEE_DOLLARS[hoursPerWeek] : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!picked || !vaId || !hours) return;
    const terms = hoursPerWeek ? ` for ${hoursPerWeek} hours a week (${feeLabel(fee)} maintenance fee)` : " on an open project";
    assign.mutate({ contactId: picked.id, vaId, hoursPerWeek }, { onSuccess: () => (notify(`${vaName} now works with ${picked.name}${terms}.`), onClose()) });
  };

  return (
    <Modal
      open
      width={620}
      onClose={onClose}
      onSubmit={submit}
      titleId="match-va"
      kicker="MATCH A VA"
      title={client ? `Match a VA to ${client.name}` : "Match a VA to a client"}
      subtitle="No VA request needed: the VA joins the client’s team right away. The client sees them under Team, and the VA sees the client under Clients."
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!picked || !vaId || !hours || onTeam.has(vaId) || assign.isPending}>
            {assign.isPending ? "Matching…" : "Match VA"}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        <FormError error={assign.error} />

        {!client && (
          <Field label="Client">
            {picked ? (
              <div className="mv-picked">
                <Avatar name={picked.name} tone={avatarTone(picked.id)} size="sm" />
                <strong className="u-grow">{picked.name}</strong>
                <Button size="sm" variant="soft" onClick={() => (setPicked(null), setVaId(""))}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="stack stack--8">
                <SearchBox label="Search clients" placeholder="Search by name, company or email" value={clientQ} onChange={setClientQ} />
                <LoadState query={contacts} loadingText="Loading clients…" isEmpty={!contacts.data?.items.length} empty="No clients match.">
                  <ul className="mv-list" role="listbox" aria-label="Clients">
                    {(contacts.data?.items ?? []).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          className="mv-list__item"
                          onClick={() => setPicked({ id: c.id, name: businessName(c) })}
                        >
                          <Avatar name={businessName(c)} tone={avatarTone(c.id)} size="sm" />
                          <span className="stack stack--0 u-grow">
                            <strong>{businessName(c)}</strong>
                            <span className="text-tiny">{[c.company ? contactName(c) : "", c.email].filter(Boolean).join(" · ")}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </LoadState>
              </div>
            )}
          </Field>
        )}

        {picked && (
          <Field label="VA">
            <div className="stack stack--8">
              <SearchBox label="Search VAs" placeholder="Search by name or skill" value={vaQ} onChange={setVaQ} />
              <LoadState query={vas} loadingText="Loading VAs…" isEmpty={!list.length} empty="No VAs match.">
                <ul className="mv-list" role="listbox" aria-label="VAs">
                  {list.map((v) => {
                    const already = onTeam.has(v.id);
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={vaId === v.id}
                          disabled={already}
                          className={cn("mv-list__item", vaId === v.id && "is-on")}
                          onClick={() => setVaId(v.id)}
                        >
                          <Avatar name={v.fullName} tone={avatarTone(v.id)} size="sm" />
                          <span className="stack stack--0 u-grow">
                            <strong>{v.fullName}</strong>
                            <span className="text-tiny">{[v.headline, v.skills.slice(0, 3).join(", ")].filter(Boolean).join(" · ") || "Virtual assistant"}</span>
                          </span>
                          <span className="mv-list__meta">
                            {already ? "Already on their team" : `${v.clientCount} client${v.clientCount === 1 ? "" : "s"}`}
                          </span>
                          {vaId === v.id && <Icon name="check" size={15} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </LoadState>
            </div>
          </Field>
        )}

        {picked && (
          <div className="mv-terms">
            <Field label="Hours a week" htmlFor="mv-hours" required>
              <Select id="mv-hours" value={hours} onChange={(e) => setHours(e.target.value as HoursChoice)} placeholder="Choose hours…" options={HOURS} />
            </Field>
            <div className="mv-fee" aria-live="polite">
              <span className="mv-fee__label">Monthly maintenance fee</span>
              <strong className="mv-fee__value">{fee != null ? feeLabel(fee) : hours === "project" ? "No maintenance fee" : "Pick the hours"}</strong>
              <span className="text-tiny">
                {fee != null ? `${TRAINING_FEE_SHORT}, taken off the VA’s invoice. ` : ""}Paid to GoCWGL. The VA’s pay is separate.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
