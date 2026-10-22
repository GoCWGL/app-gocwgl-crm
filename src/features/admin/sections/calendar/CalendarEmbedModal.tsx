"use client";

import { useState } from "react";
import { Button, Field, Icon, IconTile, Input, Modal, SegmentedControl } from "@/components/ui";
import { copyToClipboard } from "@/lib/utils";
import type { CalendarOut } from "@/utils/api/models";
import { bookingEmbed, type BookingEmbedMode } from "../../lib/calendars";

const MODES: Array<{ value: BookingEmbedMode; label: string; hint: string }> = [
  { value: "inline", label: "On the page", hint: "The booking calendar shows inside your page, wherever you paste the code." },
  { value: "popup", label: "Popup button", hint: "A button that opens the booking calendar in a popup." },
  { value: "link", label: "Direct link", hint: "Share it in emails, texts or social posts." },
];

/** Embed code for a calendar's booking page, for another website or project. */
export function CalendarEmbedModal({ calendar, onClose }: { calendar: CalendarOut; onClose: () => void }) {
  const [mode, setMode] = useState<BookingEmbedMode>("inline");
  const [height, setHeight] = useState(720);
  const [button, setButton] = useState("Book a call");
  const [copied, setCopied] = useState(false);
  const code = bookingEmbed(calendar, mode, { height, button });

  const change =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      fn(v);
      setCopied(false);
    };

  return (
    <Modal
      open
      width={620}
      onClose={onClose}
      titleId="calendar-embed-title"
      kicker="EMBED CODE"
      title={calendar.name}
      subtitle="Paste this into any website, landing page or funnel builder."
      media={
        <IconTile tone="cyan" size="lg">
          <Icon name="code" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-small">Changes you save to the calendar show up everywhere it is embedded.</span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      {!calendar.isActive && (
        <div className="notice notice--info text-small" role="status">
          This calendar is turned off. Turn it on so people can book once it is embedded.
        </div>
      )}
      <SegmentedControl label="How to show it" kind="radio" variant="soft" value={mode} onChange={change(setMode)} options={MODES} />
      <span className="text-small">{MODES.find((m) => m.value === mode)!.hint}</span>
      {mode === "inline" && (
        <Field label="Starting height (pixels)" htmlFor="ce-height" hint="It grows to fit the calendar once the page loads.">
          <Input
            id="ce-height"
            type="number"
            min={400}
            max={2000}
            step={20}
            value={height}
            onChange={(e) => change(setHeight)(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
      )}
      {mode === "popup" && (
        <Field label="Button text" htmlFor="ce-button">
          <Input id="ce-button" value={button} onChange={(e) => change(setButton)(e.target.value)} />
        </Field>
      )}
      <div className="stack stack--6">
        <span className="kicker kicker--sm kicker--muted">{mode === "link" ? "YOUR LINK" : "YOUR CODE"}</span>
        <pre className="code-block survey-code">{code}</pre>
        <div className="cluster cluster--8">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              copyToClipboard(code);
              setCopied(true);
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? "Copied" : mode === "link" ? "Copy link" : "Copy embed code"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
