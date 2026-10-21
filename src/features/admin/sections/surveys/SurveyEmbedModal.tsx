"use client";

import { useState } from "react";
import { Button, Field, Icon, IconTile, Input, Modal, SegmentedControl } from "@/components/ui";
import type { Survey } from "@/data/admin";
import { copyToClipboard } from "@/lib/utils";
import { surveyEmbed, type SurveyEmbedMode } from "../../lib/surveys";

const MODES: Array<{ value: SurveyEmbedMode; label: string; hint: string }> = [
  { value: "inline", label: "On the page", hint: "The survey shows inside your page, wherever you paste the code." },
  { value: "popup", label: "Popup button", hint: "A button that opens the survey in a popup." },
  { value: "link", label: "Direct link", hint: "Share it in emails, texts or social posts." },
];

export function SurveyEmbedModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const [mode, setMode] = useState<SurveyEmbedMode>("inline");
  const [height, setHeight] = useState(Math.min(1200, 260 + survey.questions.length * 110));
  const [button, setButton] = useState("Take the survey");
  const [copied, setCopied] = useState(false);
  const code = surveyEmbed(survey, mode, { height, button });

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
      titleId="survey-embed-title"
      kicker="EMBED CODE"
      title={survey.name || "Untitled survey"}
      subtitle="Paste this into any website, landing page or funnel builder."
      media={
        <IconTile tone="purple" size="lg">
          <Icon name="code" size={20} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-grow text-small">Changes you save to the survey show up everywhere it is embedded.</span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      {!survey.on && (
        <div className="notice notice--info text-small" role="status">
          This survey is a draft. Publish it so people can see it once it is embedded.
        </div>
      )}
      <SegmentedControl label="How to show it" kind="radio" variant="soft" value={mode} onChange={change(setMode)} options={MODES} />
      <span className="text-small">{MODES.find((m) => m.value === mode)!.hint}</span>
      {mode === "inline" && (
        <Field label="Starting height (pixels)" htmlFor="se-height" hint="It grows to fit the survey once the page loads.">
          <Input
            id="se-height"
            type="number"
            min={200}
            max={2000}
            step={20}
            value={height}
            onChange={(e) => change(setHeight)(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
      )}
      {mode === "popup" && (
        <Field label="Button text" htmlFor="se-button">
          <Input id="se-button" value={button} onChange={(e) => change(setButton)(e.target.value)} />
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
