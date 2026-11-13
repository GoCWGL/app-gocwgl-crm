"use client";

import { useState } from "react";
import { Avatar, Button, FormError, Icon, IconTile, LoadState, SearchBox, Select, Stars, type IconName } from "@/components/ui";
import { avatarTone, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { isStaffAdmin } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useDeleteFeedback, useFeedback, useFeedbackSummary } from "@/utils/hooks/useFeedback";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;

/** Engagement › Feedback: what clients say about their VAs, with star ratings. */
export function FeedbackSection() {
  const { notify } = useAdmin();
  const canDelete = isStaffAdmin(useMe().data);
  const query = useFeedback();
  const summary = useFeedbackSummary().data;
  const rows = query.data ?? [];
  const remove = useDeleteFeedback();
  const [stars, setStars] = useState<StarFilter>(0);
  const [vaId, setVaId] = useState("");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState("");
  const q = search.trim().toLowerCase();

  const byVa = rows.filter((r) => !vaId || r.va.id === vaId);
  const shown = byVa.filter(
    (r) =>
      (!stars || r.rating === stars) &&
      (!q || `${r.comment} ${r.va.name} ${r.client.name} ${r.client.company} ${r.authorName}`.toLowerCase().includes(q)),
  );
  const fiveShare = summary?.count ? Math.round(((summary.distribution["5"] ?? 0) / summary.count) * 100) : 0;
  const tiles: Array<{ icon: IconName; tone: Tone; label: string; value: string; sub: React.ReactNode }> = [
    {
      icon: "star",
      tone: "amber",
      label: "Average rating",
      value: summary?.average != null ? summary.average.toFixed(1) : "—",
      sub: summary?.average != null ? <Stars value={summary.average} size={14} /> : "No ratings yet",
    },
    { icon: "message", tone: "sky", label: "Reviews", value: String(summary?.count ?? "–"), sub: "From your clients" },
    { icon: "trendUp", tone: "green", label: "5-star reviews", value: summary ? `${fiveShare}%` : "–", sub: "Of all reviews" },
    { icon: "users", tone: "purple", label: "VAs rated", value: String(summary?.vas.length ?? "–"), sub: "With at least one review" },
  ];

  return (
    <div className="page-stack">
      <div className="card training-stats">
        {tiles.map((t) => (
          <div key={t.label} className="training-stats__tile">
            <IconTile tone={t.tone} size="md">
              <Icon name={t.icon} size={17} />
            </IconTile>
            <span className="stack stack--2">
              <span className="training-stats__label">{t.label}</span>
              <span className="training-stats__value">{t.value}</span>
              <span className="text-small">{t.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="feedback-layout">
        <div className="card card--flat board">
          <div className="course-toolbar">
            <div className="stack stack--2">
              <h3 className="course-toolbar__title">Client feedback</h3>
              <span className="text-small">
                {shown.length} of {rows.length} review{rows.length === 1 ? "" : "s"} · clients rate their VAs from the client portal
              </span>
            </div>
            <div className="course-toolbar__tools">
              <SearchBox label="Search feedback" placeholder="Search comments, VAs, clients" value={search} onChange={setSearch} />
            </div>
          </div>
          <div className="course-filters">
            <div className="filter-track" role="group" aria-label="Filter by stars">
              {([0, 5, 4, 3, 2, 1] as StarFilter[]).map((n) => (
                <button key={n} type="button" className="filter-pill tone-amber" aria-pressed={stars === n} onClick={() => setStars(n)}>
                  {n ? (
                    <>
                      {n} <Icon name="star" size={12} className="feedback-pill-star" />
                    </>
                  ) : (
                    "All"
                  )}
                  <span className="filter-pill__count">{n ? byVa.filter((r) => r.rating === n).length : byVa.length}</span>
                </button>
              ))}
            </div>
            <Select
              aria-label="Filter by VA"
              size="sm"
              className="feedback-va-filter"
              value={vaId}
              placeholder="All VAs"
              options={(summary?.vas ?? []).map((v) => ({ value: v.vaId, label: `${v.name} (${v.count})` }))}
              onChange={(e) => setVaId(e.target.value)}
            />
          </div>

          <FormError error={remove.error} />
          <LoadState query={query} loadingText="Loading feedback…">
            {shown.length === 0 ? (
              <div className="board__empty">
                <span className="board__empty-icon tone-amber" aria-hidden="true">
                  <Icon name="star" size={18} />
                </span>
                <span className="text-strong">{rows.length ? "No feedback matches these filters" : "No feedback yet"}</span>
                <span className="text-small">
                  {rows.length ? "Try another filter." : "Clients rate the VAs who work with them from VA ratings in their portal."}
                </span>
              </div>
            ) : (
              <div className="feedback-list">
                {shown.map((r) => (
                  <article key={r.id} className={cn("feedback-card", r.rating != null && r.rating <= 2 && "is-low")}>
                    <header className="feedback-card__head">
                      {r.rating != null ? <Stars value={r.rating} size={17} /> : <span className="kicker kicker--sm kicker--muted">WRITTEN FEEDBACK</span>}
                      <span className="text-small">{formatShort(r.createdAt)}</span>
                    </header>
                    {r.comment ? <p className="feedback-card__comment">“{r.comment}”</p> : <p className="vp-empty">No comment.</p>}
                    <footer className="feedback-card__foot">
                      <span className="feedback-card__who">
                        <Avatar name={r.client.company || r.client.name} tone={avatarTone(r.client.id)} size="sm" />
                        <span className="stack stack--2">
                          <span className="text-strong">{r.authorName || r.client.name}</span>
                          <span className="text-small">{r.client.company || r.client.name}</span>
                        </span>
                      </span>
                      <span className="feedback-card__arrow" aria-hidden="true">
                        <Icon name="arrowRight" size={14} />
                      </span>
                      <span className="feedback-card__who">
                        <Avatar name={r.va.name} tone={avatarTone(r.va.id)} size="sm" />
                        <span className="stack stack--2">
                          <span className="text-strong">{r.va.name}</span>
                          <span className="text-small">VA</span>
                        </span>
                      </span>
                      {canDelete && (
                        <span className="u-push-right">
                          {confirm === r.id ? (
                            <Button
                              size="sm"
                              variant="danger-solid"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate(r.id, { onSuccess: () => notify("Feedback removed.") })}
                            >
                              Yes, remove
                            </Button>
                          ) : (
                            <Button size="sm" variant="link" onClick={() => setConfirm(r.id)}>
                              Remove
                            </Button>
                          )}
                        </span>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </LoadState>
        </div>

        <aside className="feedback-side">
          <section className="card vp-card">
            <header className="vp-card__head">
              <span className="vp-card__icon" aria-hidden="true">
                <Icon name="chart" size={14} />
              </span>
              <h3 className="vp-card__title">Rating breakdown</h3>
            </header>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = summary?.distribution[String(n)] ?? 0;
                return (
                  <button key={n} type="button" className="rating-bars__row" onClick={() => setStars(stars === n ? 0 : (n as StarFilter))}>
                    <span className="rating-bars__label">
                      {n} <Icon name="star" size={11} />
                    </span>
                    <span className="rating-bars__track">
                      <span style={{ width: `${summary?.count ? (c / summary.count) * 100 : 0}%` }} />
                    </span>
                    <span className="rating-bars__count">{c}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="card vp-card">
            <header className="vp-card__head">
              <span className="vp-card__icon" aria-hidden="true">
                <Icon name="star" size={14} />
              </span>
              <h3 className="vp-card__title">Top rated VAs</h3>
            </header>
            {summary?.vas.length ? (
              <ol className="va-leaderboard">
                {summary.vas.slice(0, 8).map((v, i) => (
                  <li key={v.vaId}>
                    <button type="button" aria-pressed={vaId === v.vaId} onClick={() => setVaId(vaId === v.vaId ? "" : v.vaId)}>
                      <span className="va-leaderboard__rank">{i + 1}</span>
                      <Avatar name={v.name} tone={avatarTone(v.vaId)} size="sm" />
                      <span className="stack stack--2 u-grow">
                        <span className="text-strong">{v.name}</span>
                        <span className="text-small">
                          {v.count} review{v.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="va-leaderboard__score">
                        <Icon name="star" size={12} /> {v.average.toFixed(1)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <span className="vp-empty">No VA has been rated yet.</span>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
