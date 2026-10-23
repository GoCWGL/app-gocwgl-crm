"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon, Loading, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getInbox } from "@/utils/api/reporting";
import type { ActivityOut } from "@/utils/api/models";
import { formatRelative } from "@/utils/format/dates";
import { useInbox, useMarkInboxSeen } from "@/utils/hooks/useReporting";
import { useAdmin, type AdminState } from "../state/AdminContext";

/** Where each kind of request is handled, and its icon. */
const KINDS: Record<string, { label: string; icon: IconName; open: Partial<AdminState> }> = {
  "funnel.requested": { label: "Funnel request", icon: "funnel", open: { tab: "progress", progressView: "funnels" } },
  "crm.requested": { label: "CRM request", icon: "users", open: { tab: "progress", progressView: "requests" } },
  "ticket.created": { label: "Support request", icon: "message", open: { tab: "bugs" } },
  "booking.created": { label: "Call booked", icon: "calendar", open: { tab: "calendar" } },
};
const kindOf = (kind: string) => KINDS[kind] ?? { label: "Request", icon: "bell" as IconName, open: {} };

/** Admin header bell: every client request (funnel, CRM, support, calls booked), with the ones since you last looked marked new. */
export function NotificationBell() {
  const { update } = useAdmin();
  const inbox = useInbox();
  const seen = useMarkInboxSeen();
  const [open, setOpen] = useState(false);
  // What was unread when the panel opened, so those stay highlighted while you read them.
  const [since, setSince] = useState<string | null>(null);
  const [older, setOlder] = useState<ActivityOut[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = inbox.data?.unread ?? 0;
  const items = [...(inbox.data?.items ?? []), ...older];

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setSince(inbox.data?.seenAt ?? "");
    setOpen(true);
    if (unread) seen.mutate();
  };

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const page = await getInbox({ before: last.createdAt, limit: 30 });
      setOlder((o) => [...o, ...page.items]);
      setNoMore(page.items.length < 30);
    } finally {
      setLoadingMore(false);
    }
  };

  const go = (patch: Partial<AdminState>) => {
    setOpen(false);
    update(patch);
  };

  return (
    <div className="bell" ref={ref}>
      <button
        type="button"
        className="icon-btn icon-btn--lg bell__button"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <section className="bell__panel" role="dialog" aria-label="Notifications">
          <header className="bell__head">
            <span className="text-strong">Requests</span>
            <span className="text-small">{unread ? `${unread} new` : "You’re all caught up"}</span>
          </header>
          {inbox.isPending ? (
            <Loading inline text="Loading…" />
          ) : items.length === 0 ? (
            <p className="text-muted bell__empty">No requests yet. Funnel, CRM and support requests and booked calls show up here.</p>
          ) : (
            <ul className="bell__list">
              {items.map((item) => {
                const k = kindOf(item.kind);
                const isNew = since !== null && (!since || item.createdAt > since);
                return (
                  <li key={item.id}>
                    <button type="button" className={cn("bell__item", isNew && "bell__item--new")} onClick={() => go(k.open)}>
                      <span className="bell__icon" aria-hidden="true">
                        <Icon name={k.icon} size={15} />
                      </span>
                      <span className="stack stack--2 u-grow">
                        <span className="kicker kicker--sm kicker--muted">
                          {k.label.toUpperCase()} · {formatRelative(item.createdAt)}
                        </span>
                        <span className="text-body u-ink">{item.summary}</span>
                      </span>
                      {isNew && <span className="bell__dot" aria-label="New" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {items.length >= 30 && !noMore && (
            <Button size="sm" className="bell__more" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : "Show older"}
            </Button>
          )}
          <footer className="bell__foot">
            <span className="kicker kicker--sm kicker--muted">SEE ALL</span>
            <Button variant="link" size="sm" onClick={() => go({ tab: "progress", progressView: "funnels" })}>
              Funnel requests
            </Button>
            <Button variant="link" size="sm" onClick={() => go({ tab: "progress", progressView: "requests" })}>
              CRM requests
            </Button>
            <Button variant="link" size="sm" onClick={() => go({ tab: "bugs" })}>
              Support
            </Button>
            <Button variant="link" size="sm" onClick={() => go({ tab: "calendar" })}>
              Calls booked
            </Button>
          </footer>
        </section>
      )}
    </div>
  );
}
