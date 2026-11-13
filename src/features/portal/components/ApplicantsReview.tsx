"use client";

import { useState } from "react";
import { Badge, Button, ConfirmDialog, Field, FormError, Icon, LoadState, Modal, Textarea } from "@/components/ui";
import type { RequestApplicant, VaRequestOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { useHireApplicant, useRequestApplicants } from "@/utils/hooks/useClientWork";
import { firstName } from "../lib/vaTeam";
import { usePortal } from "../state/PortalContext";
import { VaPresence } from "./VaPresence";
import { VaProfileModal } from "./VaProfileModal";

/** Client portal › VAs › a request's applicants: review each VA's profile and resume, then hire the one you want. */
export function ApplicantsReview({ r, onClose }: { r: VaRequestOut; onClose: () => void }) {
  const { readOnly, notify, update } = usePortal();
  const query = useRequestApplicants(r.id);
  const hire = useHireApplicant();
  const [viewing, setViewing] = useState<RequestApplicant | null>(null);
  const list = query.data ?? [];
  const open = r.status === "posted" || r.status === "interviewing";

  const [hiring, setHiring] = useState<RequestApplicant | null>(null);
  const [note, setNote] = useState("");
  const pick = (a: RequestApplicant) => {
    setNote("");
    setHiring(a);
  };
  const confirmHire = () =>
    hiring &&
    hire.mutate(
      { id: r.id, vaId: hiring.vaId, note: note.trim() },
      {
        onSuccess: () => {
          notify(`You picked ${hiring.name}. GoCWGL will be in touch to get ${firstName(hiring.name)} started.`);
          update({ teamView: "matched" });
          onClose();
        },
      },
    );

  return (
    <Modal
      open
      width={760}
      onClose={onClose}
      titleId="request-applicants"
      kicker={`APPLICANTS · ${list.length}`}
      title={r.role}
      subtitle={open ? "Review each VA’s profile and resume, then hire the one you want." : "The VAs who applied for this role."}
      footer={
        <>
          <span className="vrf-foot">
            <Icon name="lock" size={13} /> Contact details stay private until you work together.
          </span>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={hire.error} />
        <LoadState query={query} loadingText="Loading applicants…" isEmpty={!list.length} empty="No one has applied yet. We’ll let you know here as VAs apply.">
          <ul className="ca-list">
            {list.map((a) => (
              <li key={a.vaId} className={`ca-card is-${a.status}`}>
                <div className="ca-card__head">
                  <VaPresence id={a.vaId} name={a.name} state="offline" size="md" />
                  <div className="stack stack--2 u-grow">
                    <strong className="ca-card__name">{a.name}</strong>
                    <span className="ca-card__meta">
                      {[a.headline || "Virtual assistant", a.location, a.yearsExperience && `${a.yearsExperience.replace(/\s*years?$/i, "")} yrs experience`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {a.status === "hired" ? (
                    <Badge tone="green" dot>
                      Hired
                    </Badge>
                  ) : a.status === "not_selected" ? (
                    <Badge tone="slate">Not selected</Badge>
                  ) : (
                    <span className="text-tiny">Applied {formatRelative(a.appliedAt)}</span>
                  )}
                </div>
                {a.skills.length > 0 && (
                  <ul className="tc-card__skills">
                    {a.skills.slice(0, 6).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {a.note && <p className="ca-card__note">“{a.note}”</p>}
                <div className="ca-card__actions">
                  <Button size="sm" variant="outline" onClick={() => setViewing(a)}>
                    View profile & resume
                  </Button>
                  {open && !readOnly && a.status === "applied" && (
                    <Button size="sm" variant="primary" disabled={hire.isPending} onClick={() => pick(a)}>
                      <Icon name="check" size={13} /> Hire {firstName(a.name)}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </LoadState>
      </div>
      {hiring && (
        <ConfirmDialog
          title={`Hire ${hiring.name}?`}
          icon="userPlus"
          confirmLabel={`Hire ${firstName(hiring.name)}`}
          pending={hire.isPending}
          error={hire.error}
          onConfirm={confirmHire}
          onClose={() => setHiring(null)}
        >
          <div className="stack stack--10">
            <p>
              GoCWGL will set {firstName(hiring.name)} up as your VA for “{r.role}”. The other applicants won’t be selected.
            </p>
            <Field label={`Why ${firstName(hiring.name)}?`} htmlFor="hire-note" hint="A note for the GoCWGL team (the VA doesn’t see it): what stood out, and anything we should know to get them started.">
              <Textarea
                id="hire-note"
                rows={4}
                maxLength={2000}
                value={note}
                placeholder={`e.g. ${firstName(hiring.name)} has run a dental front desk before and is online during our hours.`}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}
      {viewing && <VaProfileModal vaId={viewing.vaId} name={viewing.name} resumeSlug={viewing.resumeSlug} onClose={() => setViewing(null)} />}
    </Modal>
  );
}
