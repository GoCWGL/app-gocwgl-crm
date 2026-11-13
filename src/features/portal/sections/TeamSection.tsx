"use client";

import { useState } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Icon, LoadState, Modal, Tabs } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { Tone } from "@/lib/tones";
import type { TeamVa, VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useCancelVaRequest, useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
import { requestHours, requestLoad, VaRequestDetails } from "../components/VaRequestDetails";
import { ApplicantsReview } from "../components/ApplicantsReview";
import { RaiseRequests } from "../components/RaiseRequests";
import { VaProfileModal } from "../components/VaProfileModal";
import { VaRequestForm, VaRequestModal } from "../components/VaRequestModal";
import { StateChip, VaPresence } from "../components/VaPresence";
import { firstName, hm } from "../lib/vaTeam";
import { usePortal } from "../state/PortalContext";

const since = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

const REQUEST_STATUS: Record<VaRequestOut["status"], { label: string; tone: Tone }> = {
  new: { label: "Sent", tone: "slate" },
  reviewing: { label: "In review", tone: "sky" },
  approved: { label: "Approved", tone: "green" },
  declined: { label: "Declined", tone: "red" },
  posted: { label: "Finding your VA", tone: "brand" },
  interviewing: { label: "Interviewing VAs", tone: "purple" },
  matched: { label: "Matched", tone: "green" },
  inactive: { label: "Inactive", tone: "slate" },
  closed: { label: "Inactive", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

/** Requests still on their way to a VA (the "Pending requests" tab). */
const PENDING = new Set<VaRequestOut["status"]>(["new", "reviewing", "approved", "posted", "interviewing", "declined"]);

/** What each status means for the client, in plain words. */
const STATUS_TEXT: Record<VaRequestOut["status"], string> = {
  new: "Sent to GoCWGL. We’ll start reviewing it shortly.",
  reviewing: "GoCWGL is reviewing your request.",
  approved: "Approved. We’re preparing the job post for our VAs.",
  declined: "GoCWGL declined this request.",
  posted: "Shared with our VAs. We’re finding the right match.",
  interviewing: "We’re interviewing VAs for this role.",
  matched: "Matched! Review your VA’s profile below.",
  inactive: "This role is no longer active.",
  closed: "This role is no longer active.",
  cancelled: "You cancelled this request.",
};

/** Client portal › VAs: Active VAs, and Pending requests for more. */
export function TeamSection() {
  const { readOnly, state, update } = usePortal();
  const team = useVaTeam();
  const requests = useVaRequests();
  const [asking, setAsking] = useState(false);
  // The request open in its pop-up. Kept here so a refresh of the list doesn't close it.
  const [openId, setOpenId] = useState("");
  const vas = team.data ?? [];
  const working = vas.filter((v) => v.workingNow).length;
  const all = requests.data ?? [];
  const openRequest = all.find((r) => r.id === openId) ?? null;
  const pending = all.filter((r) => PENDING.has(r.status));
  // Requests with a matched or hired VA have their own tab.
  const matched = all.filter((r) => r.status === "matched");
  const past = all.filter((r) => !PENDING.has(r.status) && r.status !== "matched" && r.status !== "cancelled");
  const tab = state.teamView;
  const setTab = (teamView: typeof tab) => update({ teamView });

  return (
    <div className="page-stack">
      <section className="card cp-team-hero">
        <span className="cp-team-hero__icon" aria-hidden="true">
          <Icon name="users" size={22} />
        </span>
        <div className="stack stack--4 u-grow">
          <strong className="cp-team-hero__title">
            {vas.length ? `${vas.length} VA${vas.length === 1 ? "" : "s"} on your team` : "Build your VA team"}
          </strong>
          <span className="text-small">
            {vas.length
              ? `${working ? `${working} working for you right now. ` : ""}Need more hands or a different skill set? Request another VA.`
              : "Tell us what you need help with and GoCWGL will match you with a trained VA."}
          </span>
        </div>
        {!readOnly && (
          <Button variant="primary" onClick={() => setAsking(true)}>
            <Icon name="userPlus" size={15} /> Request a VA
          </Button>
        )}
      </section>

      <RaiseRequests readOnly={readOnly} />

      <Tabs
        label="VAs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: "Active VAs", icon: "users", tone: "green", count: team.isPending ? "–" : vas.length },
          { value: "requests", label: "Pending requests", icon: "userPlus", tone: "brand", count: requests.isPending ? "–" : pending.length },
          { value: "matched", label: "Matched", icon: "circleCheck", tone: "green", count: requests.isPending ? "–" : matched.length },
        ]}
      />

      {tab === "matched" ? (
        <LoadState query={requests} loadingText="Loading your matches…">
          {matched.length > 0 ? (
            <RequestList requests={matched} onOpen={setOpenId} />
          ) : (
            <div className="empty-state">No matches yet. When GoCWGL matches you with a VA, or you hire one of the applicants, it shows here.</div>
          )}
        </LoadState>
      ) : tab === "active" ? (
        <LoadState query={team} loadingText="Loading your team…">
          {vas.length > 0 ? (
            <div className="tc-grid">
              {vas.map((va) => (
                <TeamCard key={va.vaId} va={va} />
              ))}
            </div>
          ) : (
            <div className="empty-state">No VA is working with you yet. Once GoCWGL places a VA with your business, they show up here.</div>
          )}
        </LoadState>
      ) : (
        <LoadState query={requests} loadingText="Loading your requests…">
          {pending.length > 0 ? (
            <RequestList requests={pending} onOpen={setOpenId} />
          ) : (
            <div className="empty-state stack stack--10">
              <span>No pending requests. Need another VA? Tell us about the role and we’ll find the right person.</span>
              {!readOnly && (
                <span>
                  <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
                    <Icon name="userPlus" size={13} /> Request a VA
                  </Button>
                </span>
              )}
            </div>
          )}
          {past.length > 0 && (
            <section className="stack stack--10">
              <span className="kicker kicker--muted">PAST REQUESTS · {past.length}</span>
              <RequestList requests={past} onOpen={setOpenId} />
            </section>
          )}
        </LoadState>
      )}

      {openRequest && <RequestPopup r={openRequest} onClose={() => setOpenId("")} />}
      {asking && (
        <VaRequestModal
          onClose={() => setAsking(false)}
          onSent={() => setTab("requests")}
        />
      )}
    </div>
  );
}

/** The road from request to VA, as the client sees it. */
const STAGES: Array<{ label: string; reached: Array<VaRequestOut["status"]> }> = [
  { label: "Sent", reached: ["new", "reviewing", "approved", "posted", "interviewing", "matched"] },
  { label: "In review", reached: ["reviewing", "approved", "posted", "interviewing", "matched"] },
  { label: "Approved", reached: ["approved", "posted", "interviewing", "matched"] },
  { label: "Finding your VA", reached: ["posted", "interviewing", "matched"] },
  { label: "Matched", reached: ["matched"] },
];

/** VA requests as a list; a row opens the request's full details in a pop-up. */
function RequestList({ requests, onOpen }: { requests: VaRequestOut[]; onOpen: (id: string) => void }) {
  return (
    <>
      <ul className="rq-list">
        {requests.map((r) => {
          const st = REQUEST_STATUS[r.status];
          const ended = r.status === "declined" || r.status === "closed" || r.status === "inactive" || r.status === "cancelled";
          return (
            <li key={r.id}>
              <button type="button" className={`rq-row${ended ? " is-ended" : ""}`} onClick={() => onOpen(r.id)}>
                <span className={`rq-row__icon tone-${st.tone}`} aria-hidden="true">
                  <Icon name="briefcase" size={16} />
                </span>
                <span className="rq-row__main">
                  <strong className="rq-row__title">{r.role}</strong>
                  <span className="rq-row__meta">
                    {requestLoad(r)} · {requestHours(r)}
                  </span>
                </span>
                <span className="rq-row__extra">
                  {r.matchedVa ? (
                    <span className="rq-row__va">
                      <Avatar name={r.matchedVa.name} tone={avatarTone(r.matchedVa.id)} size="sm" /> {r.matchedVa.name}
                    </span>
                  ) : r.status === "posted" || r.status === "interviewing" ? (
                    <span className="ap-count">
                      <Icon name="users" size={12} /> {r.applicantCount ?? 0} applicant{r.applicantCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </span>
                <span className="rq-row__date">Requested {formatShort(r.createdAt)}</span>
                <Badge tone={st.tone} dot>
                  {st.label}
                </Badge>
                <Icon name="chevronRight" size={16} className="rq-row__chev" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** One request: progress, what's happening, the matched VA or applicants, every detail, and edit / cancel. */
function RequestPopup({ r, onClose }: { r: VaRequestOut; onClose: () => void }) {
  const { readOnly, notify } = usePortal();
  const cancel = useCancelVaRequest();
  const st = REQUEST_STATUS[r.status];
  const [profile, setProfile] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const ended = r.status === "declined" || r.status === "closed" || r.status === "inactive" || r.status === "cancelled";
  const who = r.reviewedByName && r.reviewedAt && r.status !== "new" ? ` · updated ${formatShort(r.reviewedAt)}` : "";
  // Matched: every step done. Otherwise the last step reached is the current one.
  const at = r.status === "matched" ? STAGES.length : STAGES.filter((x) => x.reached.includes(r.status)).length - 1;
  const canEdit = !readOnly && (r.status === "new" || r.status === "reviewing");
  const canCancel = !readOnly && ["new", "reviewing", "approved"].includes(r.status);

  if (editing) return <VaRequestForm edit={r} notify={notify} onClose={() => setEditing(false)} />;

  return (
    <Modal
      open
      onClose={onClose}
      titleId={`rq-${r.id}`}
      kicker="VA REQUEST"
      title={r.role}
      subtitle={`${requestLoad(r)} · ${requestHours(r)} · requested ${formatShort(r.createdAt)}`}
      width={720}
      className="rq-popup"
      footer={
        <>
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancel request
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
          {canEdit ? (
            <Button variant="primary" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Edit request
            </Button>
          ) : null}
        </>
      }
    >
      <div className="stack stack--16">
        <div className="rq-popup__status">
          <Badge tone={st.tone} dot>
            {st.label}
          </Badge>
          <p className={`rq-card__status is-${r.status}`}>
            <span className="rq-card__status-dot" aria-hidden="true" />
            {STATUS_TEXT[r.status]}
            {who && <span className="rq-card__when">{who}</span>}
          </p>
        </div>

        {!ended && (
          <ol className="rq-steps" aria-label="Progress">
            {STAGES.map((x, i) => (
              <li key={x.label} className={i < at ? "is-done" : i === at ? "is-now" : ""}>
                <span className="rq-steps__dot" aria-hidden="true">
                  {i < at && <Icon name="check" size={9} />}
                </span>
                <span className="rq-steps__label">{x.label}</span>
              </li>
            ))}
          </ol>
        )}

        {!canEdit && !ended && !readOnly && (
          <p className="text-small">GoCWGL has approved this request, so it can’t be edited. Ask us through Request support if something needs to change.</p>
        )}

        {r.matchedVa && !ended && (
          <div className="rq-match">
            <VaPresence id={r.matchedVa.id} name={r.matchedVa.name} state="offline" size="md" />
            <div className="stack stack--2 u-grow">
              <span className="rq-match__kicker">Your matched VA</span>
              <strong className="rq-match__name">{r.matchedVa.name}</strong>
              <span className="rq-match__meta">
                {[r.matchedVa.headline, r.matchedVa.location, r.matchedVa.yearsExperience && `${r.matchedVa.yearsExperience.replace(/\s*years?$/i, "")} yrs experience`]
                  .filter(Boolean)
                  .join(" · ") || "Virtual assistant"}
              </span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setProfile(true)}>
              View profile
            </Button>
          </div>
        )}

        {(r.status === "posted" || r.status === "interviewing") && (
          <button type="button" className="rq-applicants" onClick={() => setReviewing(true)}>
            <span className="rq-applicants__count">{r.applicantCount ?? 0}</span>
            <span className="stack stack--0 u-grow">
              <strong>{r.applicantCount ? `VA${r.applicantCount === 1 ? "" : "s"} applied` : "No applicants yet"}</strong>
              <span className="text-tiny">{r.applicantCount ? "Review their profiles and hire the one you want" : "VAs apply from their Open jobs. Check back soon."}</span>
            </span>
            {!!r.applicantCount && (
              <span className="rq-applicants__go">
                Review <Icon name="arrowRight" size={12} />
              </span>
            )}
          </button>
        )}

        {r.teamNote && (
          <p className="rq-card__note">
            <Icon name="message" size={13} />
            <span>
              <b>GoCWGL:</b> {r.teamNote}
            </span>
          </p>
        )}

        <VaRequestDetails r={r} />
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title={`Cancel your request for a ${r.role}?`}
          confirmLabel="Cancel request"
          icon="close"
          pending={cancel.isPending}
          error={cancel.error}
          onConfirm={() => cancel.mutate(r.id, { onSuccess: () => (notify("Request cancelled."), setConfirmCancel(false)) })}
          onClose={() => setConfirmCancel(false)}
        >
          GoCWGL stops working on it. You can send a new request any time.
        </ConfirmDialog>
      )}
      {profile && r.matchedVa && (
        <VaProfileModal vaId={r.matchedVa.id} name={r.matchedVa.name} resumeSlug={r.matchedVa.resumeSlug} onClose={() => setProfile(false)} />
      )}
      {reviewing && <ApplicantsReview r={r} onClose={() => setReviewing(false)} />}
    </Modal>
  );
}

function TeamCard({ va }: { va: TeamVa }) {
  const { goTo, readOnly } = usePortal();
  const state = va.workingNow ? "working" : "offline";
  const extra = va.skills.length - 5;
  const [profile, setProfile] = useState(false);
  return (
    <article className="tc-card">
      <header className="tc-card__head">
        <VaPresence id={va.vaId} name={va.name} state={state} size="lg" />
        <div className="stack stack--2 u-grow">
          <h3 className="tc-card__name">{va.name}</h3>
          <span className="tc-card__role">{va.headline || "Virtual assistant"}</span>
        </div>
        <StateChip state={state} />
      </header>

      <div className="tc-card__meta">
        {va.location && (
          <span>
            <Icon name="globe" size={12} /> {va.location}
          </span>
        )}
        <span>
          <Icon name="calendar" size={12} /> With you since {since(va.since)}
        </span>
      </div>

      <dl className="tc-card__stats">
        <div>
          <dt>This month</dt>
          <dd>{hm(va.monthSeconds)}</dd>
        </div>
        <div>
          <dt>All time</dt>
          <dd>{hm(va.totalSeconds)}</dd>
        </div>
        <div>
          <dt>Your rating</dt>
          <dd>
            {va.myRating != null ? (
              <>
                <Icon name="star" size={12} className="tc-card__star" /> {va.myRating.toFixed(1)}
              </>
            ) : (
              <span className="tc-card__muted">—</span>
            )}
          </dd>
        </div>
      </dl>

      {va.skills.length > 0 && (
        <ul className="tc-card__skills">
          {va.skills.slice(0, 5).map((s) => (
            <li key={s}>{s}</li>
          ))}
          {extra > 0 && <li className="is-more">+{extra}</li>}
        </ul>
      )}

      <footer className="tc-card__foot">
        <div className="tc-card__links">
          <button type="button" className="rq-link" onClick={() => goTo("journal")}>
            VA tracker
          </button>
          <button type="button" className="rq-link" onClick={() => setProfile(true)}>
            Profile
          </button>
          {!readOnly && (
            <button type="button" className="rq-link" onClick={() => goTo("ratings")}>
              Rate {firstName(va.name)}
            </button>
          )}
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => goTo("projects")}>
            <Icon name="plus" size={13} /> Task
          </Button>
        )}
      </footer>
      {profile && <VaProfileModal vaId={va.vaId} name={va.name} resumeSlug={va.resumeSlug} onClose={() => setProfile(false)} />}
    </article>
  );
}
