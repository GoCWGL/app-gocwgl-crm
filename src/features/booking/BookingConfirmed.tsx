"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import type { PublicBookingOut } from "@/utils/api/models";

const part = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(new Date(iso));

const clock = (iso: string, timeZone: string) => part(iso, timeZone, { hour: "numeric", minute: "2-digit" });

/** "Zoom" / "Google Meet" from the join link, else the calendar's location. */
function meetingKind(booking: PublicBookingOut) {
  const host = booking.meetingUrl ? new URL(booking.meetingUrl).hostname : "";
  if (host === "zoom.us" || host.endsWith(".zoom.us")) return "Zoom";
  if (host === "meet.google.com") return "Google Meet";
  return booking.location;
}

const CALENDARS = [
  { key: "google", label: "Google Calendar", mark: "G", tone: "google" },
  { key: "outlook", label: "Outlook", mark: "O", tone: "outlook" },
  { key: "apple", label: "Apple Calendar", mark: null, tone: "apple" },
] as const;

/** After booking: the call, its join link, "Add to calendar" buttons and what happens next (matches the email). */
export function BookingConfirmed({ booking, email, timeZone }: { booking: PublicBookingOut; email: string; timeZone: string }) {
  const [copied, setCopied] = useState(false);
  const where = meetingKind(booking);
  const date = part(booking.startsAt, timeZone, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hours = `${clock(booking.startsAt, timeZone)} – ${clock(booking.endsAt, timeZone)}`;

  const copy = async () => {
    const url = booking.meetingUrl;
    if (!url) return;
    // A hidden textarea first: it works in embedded pages where the Clipboard API is blocked, and it has to run
    // straight away (a refused Clipboard API call ends the click's permission to copy).
    const area = Object.assign(document.createElement("textarea"), { value: url, readOnly: true });
    area.style.cssText = "position:fixed;opacity:0;";
    document.body.append(area);
    area.select();
    let ok = document.execCommand("copy");
    area.remove();
    if (!ok) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        return; // the link is still there to select by hand
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    ["Save the date", "Add the call to your calendar so you get a reminder before we meet."],
    [
      "Join on time",
      booking.meetingUrl
        ? `At ${clock(booking.startsAt, timeZone)}, open your ${where} link. It works from your phone or computer.`
        : `We'll meet at ${clock(booking.startsAt, timeZone)} (${where}).`,
    ],
    ["Come with questions", `Think about your goals and anything you'd like to cover, so we make the most of our ${booking.durationMin} minutes.`],
  ];

  return (
    <div className="booked" role="status">
      <header className="booked__hero">
        <span className="booked__check" aria-hidden="true">
          <Icon name="check" size={28} strokeWidth={2.8} />
        </span>
        <span className="booked__badge">CONFIRMED</span>
        <h1 className="booked__title">You’re booked!</h1>
        <p className="booked__lead">
          A confirmation email with everything below is on its way to <strong>{email}</strong>.
        </p>
      </header>

      <div className="booked__body">
        <div className="booked__summary">
          <div className="booked__tile" aria-hidden="true">
            <span className="booked__tile-month">{part(booking.startsAt, timeZone, { month: "short" }).toUpperCase()}</span>
            <span className="booked__tile-day">{part(booking.startsAt, timeZone, { day: "numeric" })}</span>
            <span className="booked__tile-dow">{part(booking.startsAt, timeZone, { weekday: "short" }).toUpperCase()}</span>
          </div>
          <div className="booked__when">
            <span className="booked__name">{booking.name}</span>
            <span className="booked__date">{date}</span>
            <span className="booked__meta">
              <Icon name="clock" size={15} />
              {hours} · {timeZone}
            </span>
            <span className="booked__meta">
              <Icon name="video" size={15} />
              {booking.durationMin}-minute {where} call
            </span>
          </div>
        </div>

        {booking.meetingUrl && (
          <div className="booked__join">
            <div className="booked__join-text">
              <span className="booked__label">YOUR {where.toUpperCase()} LINK</span>
              <a className="booked__link" href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
                {booking.meetingUrl}
              </a>
            </div>
            <button type="button" className="booked__copy" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} size={15} />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}

        <section className="booked__section" aria-labelledby="booked-add">
          <h2 className="booked__label" id="booked-add">
            ADD TO YOUR CALENDAR
          </h2>
          <div className="booked__calendars">
            {CALENDARS.map((c) => (
              <a
                key={c.key}
                className="booked__calendar"
                href={booking.calendarLinks[c.key]}
                {...(c.key === "apple" ? { download: "invite.ics" } : { target: "_blank", rel: "noopener noreferrer" })}
              >
                <span className={`booked__mark booked__mark--${c.tone}`} aria-hidden="true">
                  {c.mark ?? <Icon name="download" size={14} />}
                </span>
                {c.label}
              </a>
            ))}
          </div>
          <span className="booked__hint">Apple Calendar also works for Outlook on desktop and most other calendar apps.</span>
        </section>

        <section className="booked__section booked__next" aria-labelledby="booked-next">
          <h2 className="booked__label" id="booked-next">
            WHAT HAPPENS NEXT
          </h2>
          <ol className="booked__steps">
            {steps.map(([title, text], i) => (
              <li key={title} className="booked__step">
                <span className="booked__step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="booked__step-text">
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <p className="booked__footer">
          Need a different time? Just reply to your confirmation email and we’ll find one that works.
        </p>
      </div>
    </div>
  );
}
