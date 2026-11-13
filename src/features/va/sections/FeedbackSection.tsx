"use client";

import { useVaAccess } from "../lib/access";
import { Icon, LoadState, Stars } from "@/components/ui";
import { formatShort } from "@/utils/format/dates";
import { useMyRatings } from "@/utils/hooks/useVaPortal";

/** VA portal › Feedback: the star ratings clients gave this VA (their written comments go to the team). */
export function FeedbackSection() {
  const va = useVaAccess().ready;
  const query = useMyRatings(va);
  const d = query.data;

  return (
    <div className="page-stack">
      <LoadState query={query} loadingText="Loading your feedback…">
        {d && (
          <>
            <section className="card va-rating-hero">
              <div className="va-rating-hero__score">
                <strong>{d.average != null ? d.average.toFixed(1) : "—"}</strong>
                <Stars value={d.average ?? 0} size={20} />
                <span className="text-small">
                  {d.count ? `From ${d.count} rating${d.count === 1 ? "" : "s"}` : "No ratings yet"}
                </span>
              </div>
              <div className="rating-bars u-grow">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = d.distribution[String(n)] ?? 0;
                  return (
                    <div key={n} className="rating-bars__row">
                      <span className="rating-bars__label">
                        {n} <Icon name="star" size={11} />
                      </span>
                      <span className="rating-bars__track">
                        <span style={{ width: `${d.count ? (c / d.count) * 100 : 0}%` }} />
                      </span>
                      <span className="rating-bars__count">{c}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="card va-note">
              <Icon name="message" size={16} />
              <span className="text-small">
                Clients rate you from their portal. Their written comments go to the GoCWGL team, who’ll share what helps you grow.
              </span>
            </div>

            <section className="card stack stack--10">
              <span className="kicker">RATINGS · {d.count}</span>
              {d.ratings.length ? (
                d.ratings.map((r) => (
                  <div key={r.id} className="list-row list-row--nowrap">
                    <Stars value={r.rating} size={15} />
                    <span className="text-strong u-grow">{r.client || "A client"}</span>
                    <span className="text-small">{formatShort(r.createdAt)}</span>
                  </div>
                ))
              ) : (
                <span className="vp-empty">When clients rate your work, it shows up here.</span>
              )}
            </section>
          </>
        )}
      </LoadState>
    </div>
  );
}
