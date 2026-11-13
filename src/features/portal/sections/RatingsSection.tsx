"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Button, FormError, Icon, LoadState, Modal, StarInput, Stars, Textarea } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import type { MyVaOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useGiveFeedback, useMyFeedback, useMyVas } from "@/utils/hooks/useFeedback";
import { usePortal } from "../state/PortalContext";

/** Client portal › VA ratings: star each VA on your team; the history of your ratings. */
export function RatingsSection() {
  const { readOnly } = usePortal();
  const vas = useMyVas();
  const feedback = useMyFeedback();
  // Every rating and comment they've sent (older written-only feedback included).
  const rated = feedback.data ?? [];
  const [rating, setRating] = useState<MyVaOut | null>(null);

  return (
    <div className="page-stack">
      <LoadState
        query={vas}
        loadingText="Loading your VAs…"
        isEmpty={!vas.data?.length}
        empty="No VA is working with you yet. Once GoCWGL places a VA with your business, you'll see them here and can share feedback."
      >
        <div className="your-vas">
          {vas.data?.map((va) => (
            <section key={va.id} className="card your-va">
              <Avatar name={va.name} tone={avatarTone(va.id)} size="xl" ring />
              <div className="stack stack--4 u-grow">
                <span className="kicker kicker--sm kicker--muted">YOUR VA</span>
                <h3 className="your-va__name">{va.name}</h3>
                                {va.myLastRating ? (
                  <span className="your-va__last">
                    <Stars value={va.myLastRating} size={14} /> Your last rating · {va.myFeedbackCount} review{va.myFeedbackCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-small">You haven’t rated {va.name.split(" ")[0]} yet.</span>
                )}
              </div>
              {!readOnly && (
                <Button variant="primary" onClick={() => setRating(va)}>
                  <Icon name="star" size={14} /> {va.myLastRating ? "Leave new feedback" : "Rate your VA"}
                </Button>
              )}
            </section>
          ))}
        </div>
      </LoadState>

      {rated.length > 0 && (
        <section className="card stack stack--10">
          <span className="kicker">YOUR RATINGS & FEEDBACK · {rated.length}</span>
          {rated.map((f) => (
            <div key={f.id} className="list-row list-row--nowrap">
              {f.rating != null ? <Stars value={f.rating} size={14} /> : <span className="text-tiny">Written</span>}
              <span className="stack stack--2 u-grow">
                <span className="text-strong">{f.comment || "No comment"}</span>
                <span className="text-small">
                  For {f.va.name} · {formatShort(f.createdAt)}
                </span>
              </span>
            </div>
          ))}
        </section>
      )}

      {rating && <RateModal va={rating} onClose={() => setRating(null)} />}
    </div>
  );
}

export function RateModal({ va, onClose }: { va: MyVaOut; onClose: () => void }) {
  const { notify } = usePortal();
  const give = useGiveFeedback();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const first = va.name.split(" ")[0];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!stars) return;
    give.mutate(
      { vaId: va.id, rating: stars, comment: comment.trim() },
      {
        onSuccess: () => {
          notify(`Thanks! Your feedback for ${first} was sent to GoCWGL.`);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="rate-va"
      kicker="FEEDBACK"
      title={`How is ${first} doing?`}
      subtitle="Your feedback goes to the GoCWGL team and helps us support your VA."
      width={520}
      media={<Avatar name={va.name} tone={avatarTone(va.id)} size="lg" ring />}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!stars || give.isPending}>
            {give.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </>
      }
    >
      <div className="stack stack--14">
        <FormError error={give.error} />
        <div className="rate-va__stars">
          <StarInput value={stars} onChange={setStars} size={34} />
        </div>
        <Textarea
          rows={4}
          aria-label="Comment"
          placeholder={`What's going well, and what could ${first} do better?`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
    </Modal>
  );
}
