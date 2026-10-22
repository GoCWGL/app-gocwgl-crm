"use client";

import { useRef } from "react";
import { Button, Field, FormError, Input, Textarea } from "@/components/ui";
import { usePreviewConfirmation } from "@/utils/hooks/useCalendar";

/** Merge tags the API fills in (see the calendar confirmation template in the API). */
const TAGS = ["first_name", "name", "calendar", "date", "time", "timezone", "duration", "company"] as const;

/**
 * The guest's confirmation email for one calendar: subject and message with merge tags, inside the branded
 * layout (date tile, join button, add-to-calendar buttons, next steps, attached invite). The preview uses the unsaved text and a sample guest.
 */
export function ConfirmationEmailFields({
  calendarId,
  subject,
  message,
  onChange,
}: {
  calendarId: string;
  subject: string;
  message: string;
  onChange: (patch: { subject?: string; message?: string }) => void;
}) {
  const preview = usePreviewConfirmation();
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Puts the tag where the cursor is in the message (or at the end).
  const insert = (tag: string) => {
    const el = messageRef.current;
    const at = el?.selectionStart ?? message.length;
    const token = `{${tag}}`;
    onChange({ message: message.slice(0, at) + token + message.slice(el?.selectionEnd ?? at) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const showPreview = () => preview.mutate({ id: calendarId, body: { subject, message } });

  return (
    <div className="stack stack--10">
      <span className="kicker">CONFIRMATION EMAIL</span>
      <span className="text-small">
        Sent to the guest as soon as they book, with the date and time, a join button, Add to Google, Outlook or Apple Calendar buttons and what happens next.
      </span>
      <Field label="Subject" htmlFor="ecal-csubject">
        <Input id="ecal-csubject" value={subject} maxLength={200} onChange={(e) => onChange({ subject: e.target.value })} />
      </Field>
      <Field label="Message" htmlFor="ecal-cmessage" hint="Shown after “Hi {first_name},”. Leave a blank line between paragraphs.">
        <Textarea
          ref={messageRef}
          id="ecal-cmessage"
          rows={6}
          maxLength={5000}
          value={message}
          onChange={(e) => onChange({ message: e.target.value })}
        />
      </Field>
      <div className="stack stack--6">
        <span className="text-small">Insert into the message:</span>
        <div className="cluster cluster--6">
          {TAGS.map((tag) => (
            <button key={tag} type="button" className="chip chip--sm chip--square confirmation-tag" onClick={() => insert(tag)}>
              {`{${tag}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="cluster cluster--8">
        <Button size="sm" variant="outline" disabled={preview.isPending || !subject.trim() || !message.trim()} onClick={showPreview}>
          {preview.isPending ? "Loading preview…" : preview.data ? "Refresh preview" : "Preview email"}
        </Button>
        {preview.data && (
          <Button size="sm" variant="link" onClick={() => preview.reset()}>
            Hide preview
          </Button>
        )}
      </div>
      <FormError error={preview.error} />
      {preview.data && (
        <div className="confirmation-preview">
          <div className="confirmation-preview__subject">
            <span className="kicker kicker--sm kicker--muted">SUBJECT</span>
            <span className="text-strong">{preview.data.subject}</span>
          </div>
          {/* No scripts: the email is static HTML. */}
          <iframe className="confirmation-preview__frame" title="Confirmation email preview" sandbox="" srcDoc={preview.data.html} />
        </div>
      )}
    </div>
  );
}
