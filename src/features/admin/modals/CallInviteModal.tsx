"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Modal, Select, Textarea } from "@/components/ui";
import { bookingUrl } from "@/features/public/links";
import * as calendarApi from "@/utils/api/calendar";
import { useCalendars } from "@/utils/hooks/useCalendar";
import { useApiMutation } from "@/utils/hooks/mutation";
import { qk } from "@/utils/hooks/keys";
import { useAdmin } from "../state/AdminContext";

type Kind = "discovery" | "interview";

const COPY: Record<Kind, { title: string; kicker: string; subtitle: string; guess: RegExp; button: string }> = {
  discovery: {
    title: "Invite to a discovery call",
    kicker: "ONBOARDING · CLIENT",
    subtitle: "We'll email them a link to book a time on the calendar you pick.",
    guess: /discover|intro|strategy|consult/i,
    button: "Send invite",
  },
  interview: {
    title: "Invite to an interview",
    kicker: "ONBOARDING · VA",
    subtitle: "We'll email them a link to book an interview time on the calendar you pick.",
    guess: /interview|va|screen/i,
    button: "Send invite",
  },
};

type Props = {
  kind: Kind;
  /** The client (contact id) or the VA (user id). */
  id: string;
  name: string;
  email: string;
  onClose: () => void;
};

/** Onboarding profiles: email a client (discovery call) or a VA (interview) a booking link. */
export function CallInviteModal({ kind, id, name, email, onClose }: Props) {
  const { notify } = useAdmin();
  const copy = COPY[kind];
  const calendars = (useCalendars().data ?? []).filter((c) => c.isActive);
  const guess = calendars.find((c) => copy.guess.test(c.name)) ?? calendars[0];
  const [calendarId, setCalendarId] = useState("");
  const [message, setMessage] = useState("");
  const chosen = calendars.find((c) => c.id === (calendarId || guess?.id));

  const send = useApiMutation(
    (body: { calendarId: string; message: string }) =>
      kind === "discovery" ? calendarApi.inviteClientToCall(id, body) : calendarApi.inviteVaToInterview(id, body),
    { invalidate: kind === "discovery" ? [qk.contactNotes(id)] : [qk.vas] },
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    send.mutate(
      { calendarId: chosen.id, message: message.trim() },
      {
        onSuccess: () => {
          notify(`${kind === "discovery" ? "Discovery call" : "Interview"} invite sent to ${email}.`);
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
      titleId={`call-invite-${kind}`}
      kicker={copy.kicker}
      title={copy.title}
      subtitle={copy.subtitle}
      width={520}
      media={
        <IconTile brand size="lg">
          <Icon name="calendarCheck" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!chosen || send.isPending}>
            {send.isPending ? "Sending…" : copy.button}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <div className="inset inset--soft stack stack--2">
          <span className="text-strong">{name}</span>
          <span className="text-small">{email}</span>
        </div>
        <FormError error={send.error} />
        {calendars.length === 0 ? (
          <div className="notice notice--warning" role="status">
            There’s no active calendar to book on yet. Add one in Profile &amp; settings › Calendar first.
          </div>
        ) : (
          <>
            <Field label="Calendar" htmlFor="ci-calendar" hint={chosen ? bookingUrl(chosen.slug) : undefined}>
              <Select
                id="ci-calendar"
                value={chosen?.id ?? ""}
                options={calendars.map((c) => ({ value: c.id, label: `${c.name} · ${c.durationMin} min` }))}
                onChange={(e) => setCalendarId(e.target.value)}
              />
            </Field>
            <Field label="Personal note" htmlFor="ci-message" hint="Optional. Added to the email above the booking link.">
              <Textarea
                id="ci-message"
                rows={4}
                placeholder={kind === "discovery" ? "Looking forward to learning about your business!" : "We loved your application!"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
