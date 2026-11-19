"use client";

import { useState } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Icon, LoadState, Modal, TabBar } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { Tone } from "@/lib/tones";
import type { TeamVa, VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useSession } from "@/utils/auth/session";
import { formatCentsExact } from "@/utils/format/money";
import { useAcceptQuote, useCancelVaRequest, useCommentOnMyRequest, useMyRequestComments, useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
import { ClientVaAgreementCard } from "../components/ClientVaAgreement";
import { RequestComments } from "../components/RequestComments";
import { agreementOf } from "../lib/vaAgreement";
import { requestHours, requestLoad, VaRequestDetails } from "../components/VaRequestDetails";
import { ApplicantsReview } from "../components/ApplicantsReview";
import { VaProfileModal } from "../components/VaProfileModal";
import { usePastVas, VaRequestForm, VaRequestModal } from "../components/VaRequestModal";
import { StateChip, VaPresence } from "../components/VaPresence";
import { hm } from "../lib/vaTeam";
import { useShowPackages } from "../lib/vaAccess";
import { usePortal } from "../state/PortalContext";

const since = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

export const REQUEST_STATUS: Record<VaRequestOut["status"], { label: string; tone: Tone }> = {
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
  // New requests only once the team turns on the VA packages for this client; requests already sent still show.
  const canRequest = useShowPackages("va") && !readOnly;
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
              ? `${working ? `${working} working for you right now. ` : ""}${canRequest ? "Need more hands or a different skill set? Request another VA." : ""}`
              : canRequest
                ? "Tell us what you need help with and GoCWGL will match you with a trained VA."
                : "Your requests for a VA and their progress show here."}
          </span>
        </div>
        {canRequest && (
          <Button variant="primary" onClick={() => setAsking(true)}>
            <Icon name="userPlus" size={15} /> Request a VA
          </Button>
        )}
      </section>

      {/* The VA agreement: shown once they've accepted it on a request, or have a VA. */}
      {(vas.length > 0 || all.some((r) => !!agreementOf(r).agreementAcceptedAt)) && <ClientVaAgreementCard />}

      <TabBar
        label="VAs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "requests", label: "Pending requests", hint: "Waiting for your VA", icon: "userPlus", tone: "brand", count: requests.isPending ? "–" : pending.length },
          { value: "matched", label: "Matched", hint: "VAs found for you", icon: "circleCheck", tone: "green", count: requests.isPending ? "–" : matched.length },
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
      ) : (
        <LoadState query={requests} loadingText="Loading your requests…">
          {pending.length > 0 ? (
            <RequestList requests={pending} onOpen={setOpenId} />
          ) : (
            <div className="empty-state stack stack--10">
              <span>{canRequest ? "No pending requests. Need another VA? Tell us about the role and we’ll find the right person." : "No pending requests."}</span>
              {canRequest && (
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

/** "40 hours a week · Mon–Fri, 9:00 AM – 5:00 PM · US Eastern", or "Open project · due Dec 15, 2026". */
const requestSummary = (r: VaRequestOut) => (r.engagement === "project" ? requestHours(r) : `${requestLoad(r)} · ${requestHours(r)}`);

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
                    {requestSummary(r)}
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
export function RequestPopup({ r, onClose }: { r: VaRequestOut; onClose: () => void }) {
  const { readOnly, notify } = usePortal();
  const { viewAsClientId } = useSession();
  const comments = useMyRequestComments(r.id);
  const comment = useCommentOnMyRequest();
  const cancel = useCancelVaRequest();
  const pastVas = usePastVas();
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

  if (editing) return <VaRequestForm edit={r} notify={notify} pastVas={pastVas} onClose={() => setEditing(false)} />;

  return (
    <Modal
      open
      onClose={onClose}
      titleId={`rq-${r.id}`}
      kicker="VA REQUEST"
      title={r.role}
      subtitle={`${requestSummary(r)} · requested ${formatShort(r.createdAt)}`}
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
            {r.engagement === "project" && r.status === "inactive"
              ? "This project has ended."
              : r.engagement === "project" && r.quoteAcceptedAt && !r.matchedVa && !ended
                ? "You agreed to the price. GoCWGL sends your invoice; your VA is assigned once it’s paid."
                : r.engagement === "project" && r.quoteCents != null && !r.quoteAcceptedAt && !ended
                  ? "GoCWGL sent your quote. Agree to the price to go ahead."
                  : STATUS_TEXT[r.status]}
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

        {r.engagement === "project" && !ended && <QuoteCard r={r} />}

        <VaRequestDetails r={r} />

        <RequestComments
          side="client"
          comments={comments}
          send={(body, done) => comment.mutate({ id: r.id, body }, { onSuccess: done })}
          sending={comment.isPending}
          sendError={comment.error}
          closed={r.status === "cancelled"}
          readOnly={readOnly}
          staffViewing={!!viewAsClientId}
        />
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

/** An open project's price: waiting for GoCWGL's quote, the quote to agree to, or agreed (then GoCWGL assigns the VA). */
function QuoteCard({ r }: { r: VaRequestOut }) {
  const { readOnly, notify } = usePortal();
  const accept = useAcceptQuote();
  const [confirming, setConfirming] = useState(false);
  const amount = formatCentsExact(r.quoteCents);
  const state = r.quoteAcceptedAt ? "agreed" : r.quoteCents != null ? "quoted" : "waiting";
  return (
    <div className={`rq-quote is-${state}`}>
      <span className="rq-quote__icon" aria-hidden="true">
        <Icon name={state === "agreed" ? "circleCheck" : "invoice"} size={17} />
      </span>
      <span className="rq-quote__text">
        {state === "waiting" ? (
          <>
            <strong>Waiting for your quote</strong>
            <span>GoCWGL reviews your project and posts the price in the comments below. Ask anything there meanwhile.</span>
          </>
        ) : state === "quoted" ? (
          <>
            <strong>
              GoCWGL quoted <span className="rq-quote__amount">{amount}</span>
            </strong>
            <span>Agree to the price and GoCWGL sends you the invoice. Once it’s paid, we assign your VA. Questions? Ask in the comments first.</span>
          </>
        ) : (
          <>
            <strong>
              You agreed to <span className="rq-quote__amount">{amount}</span>
            </strong>
            <span>
              Agreed {formatShort(r.quoteAcceptedAt!)}.{" "}
              {r.matchedVa
                ? `${r.matchedVa.name} is on it.`
                : "GoCWGL will send you the invoice (you’ll find it in Invoices). Once it’s paid, we assign your VA to the project."}
            </span>
          </>
        )}
      </span>
      {state === "quoted" && !readOnly && (
        <Button variant="primary" onClick={() => setConfirming(true)}>
          <Icon name="check" size={14} /> Agree to {amount}
        </Button>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Agree to ${amount} for “${r.role}”?`}
          confirmLabel={`Agree to ${amount}`}
          icon="check"
          pending={accept.isPending}
          error={accept.error}
          onConfirm={() =>
            accept.mutate(r.id, {
              onSuccess: () => {
                notify(`You agreed to ${amount}. GoCWGL will send you the invoice, and assign your VA once it’s paid.`);
                setConfirming(false);
              },
            })
          }
          onClose={() => setConfirming(false)}
        >
          GoCWGL then sends you the invoice for {amount}, which you’ll find in Invoices. Once it’s paid, we assign a VA to your
          project. Pay each invoice within 3 business days of its date.
        </ConfirmDialog>
      )}
    </div>
  );
}

/** One VA on the client's team: who they are, their hours and the client's rating, their skills, and their full profile. */
export function TeamCard({ va }: { va: TeamVa }) {
  const state = va.workingNow ? "working" : "offline";
  const extra = va.skills.length - 6;
  const [profile, setProfile] = useState(false);
  // The profile pop-up renders beside the card, not inside it: the card lifts on hover (a transform), which would
  // make the pop-up's fixed position follow the card and flicker.
  return (
    <>
      <article className="tc-card">
        <div className="tc-card__cover" aria-hidden="true" />
        <header className="tc-card__head">
          <VaPresence id={va.vaId} name={va.name} state={state} size="xl" />
          <StateChip state={state} />
        </header>

        <div className="tc-card__id">
          <h3 className="tc-card__name">{va.name}</h3>
          <span className="tc-card__role">
            {va.headline || "Virtual assistant"}
          </span>
          <div className="tc-card__meta">
            {va.location && (
              <span>
                <Icon name="globe" size={12} /> {va.location}
              </span>
            )}
            <span>
              <Icon name="calendar" size={12} /> With you since{" "}
              {since(va.since)}
            </span>
          </div>
        </div>

        <dl className="tc-card__stats">
          <div>
            <dt>
              <Icon name="clock" size={12} /> This month
            </dt>
            <dd>{hm(va.monthSeconds)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="trendUp" size={12} /> All time
            </dt>
            <dd>{hm(va.totalSeconds)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="star" size={12} /> Your rating
            </dt>
            <dd>
              {va.myRating != null ? (
                <>
                  {va.myRating.toFixed(1)}
                  <small>/ 5</small>
                </>
              ) : (
                <span className="tc-card__muted">—</span>
              )}
            </dd>
          </div>
        </dl>

        {va.skills.length > 0 && (
          <div className="tc-card__skills-wrap">
            <span className="tc-card__label">Skills</span>
            <ul className="tc-card__skills">
              {va.skills.slice(0, 6).map((s) => (
                <li key={s}>{s}</li>
              ))}
              {extra > 0 && <li className="is-more">+{extra} more</li>}
            </ul>
          </div>
        )}

        <footer className="tc-card__foot">
          <Button
            variant="outline"
            className="tc-card__profile"
            onClick={() => setProfile(true)}
          >
            <Icon name="user" size={14} /> View full profile
            <Icon name="arrowRight" size={14} className="tc-card__go" />
          </Button>
        </footer>
      </article>
      {profile && (
        <VaProfileModal
          vaId={va.vaId}
          name={va.name}
          resumeSlug={va.resumeSlug}
          onClose={() => setProfile(false)}
        />
      )}
    </>
  );
}
