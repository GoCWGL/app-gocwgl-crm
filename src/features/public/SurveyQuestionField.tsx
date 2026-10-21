"use client";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import type { SurveyQuestion } from "@/data/admin";
import { cn } from "@/lib/utils";

export type SurveyAnswer = string | string[];

/** Required check: both name boxes, and text next to a picked "Other". */
export function isUnanswered(q: SurveyQuestion, a: SurveyAnswer | undefined, otherText = ""): boolean {
  if (q.type === "name" && !q.fullNameOnly) return !Array.isArray(a) || !a[0]?.trim() || !a[1]?.trim();
  const pickedOther = q.other && (a === "Other" || (Array.isArray(a) && a.includes("Other")));
  if (pickedOther && !otherText.trim()) return true;
  return Array.isArray(a) ? a.length === 0 : !a?.trim();
}

type SurveyQuestionFieldProps = {
  number: number;
  question: SurveyQuestion;
  answer: SurveyAnswer | undefined;
  /** Text typed next to the "Other" choice. */
  otherText?: string;
  /** Shown under the question (a server message, or the default "please answer"). */
  error?: string;
  missing: boolean;
  onAnswer: (a: SurveyAnswer) => void;
  onOtherText?: (text: string) => void;
};

/** One survey question as visitors see it (the builder's preview and the hosted /survey/{id} page). */
export function SurveyQuestionField({ number, question: q, answer, otherText, error, missing, onAnswer, onOtherText }: SurveyQuestionFieldProps) {
  const id = `sp-${q.id}`;
  const value = typeof answer === "string" ? answer : "";
  const picked = Array.isArray(answer) ? answer : [];
  const choices = q.options.filter((o) => o.trim());
  const withOther = q.other ? [...choices, "Other"] : choices;
  const label = (
    <>
      {number}. {q.title || "Untitled question"}
    </>
  );

  let control;
  switch (q.type) {
    case "long":
      control = <Textarea id={id} rows={3} value={value} onChange={(e) => onAnswer(e.target.value)} />;
      break;
    case "dropdown":
      control = <Select id={id} placeholder="Choose…" options={choices} value={value} onChange={(e) => onAnswer(e.target.value)} />;
      break;
    case "single":
      control = (
        <div className="survey-choices" role="radiogroup" aria-labelledby={`${id}-l`}>
          {withOther.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className="survey-choice" onClick={() => onAnswer(o)}>
              <span className="survey-choice__dot" aria-hidden="true" />
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "multi":
      control = (
        <div className="survey-choices">
          {withOther.map((o) => (
            <Checkbox
              key={o}
              label={o}
              checked={picked.includes(o)}
              onChange={() => onAnswer(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])}
            />
          ))}
        </div>
      );
      break;
    case "rating":
      control = (
        <div className="survey-stars" role="radiogroup" aria-labelledby={`${id}-l`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === String(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={cn("survey-stars__star", Number(value) >= n && "survey-stars__star--on")}
              onClick={() => onAnswer(String(n))}
            >
              ★
            </button>
          ))}
        </div>
      );
      break;
    case "scale":
      control = (
        <div className="stack stack--4">
          <div className="survey-scale" role="radiogroup" aria-labelledby={`${id}-l`}>
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === String(n)}
                className="survey-scale__item"
                onClick={() => onAnswer(String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="survey-scale__labels text-tiny">
            <span>{q.lowLabel}</span>
            <span>{q.highLabel}</span>
          </div>
        </div>
      );
      break;
    case "yesno":
      control = (
        <div className="survey-choices survey-choices--row" role="radiogroup" aria-labelledby={`${id}-l`}>
          {["Yes", "No"].map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className="survey-choice" onClick={() => onAnswer(o)}>
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "name":
      control = q.fullNameOnly ? (
        <Input id={id} autoComplete="name" placeholder="Full name" value={value} aria-invalid={missing} onChange={(e) => onAnswer(e.target.value)} />
      ) : (
        <div className="form-grid form-grid--narrow">
          {(["First name", "Last name"] as const).map((ph, k) => (
            <Input
              key={ph}
              id={k ? `${id}-last` : id}
              aria-label={ph}
              autoComplete={k ? "family-name" : "given-name"}
              placeholder={ph}
              value={picked[k] ?? ""}
              aria-invalid={missing && !picked[k]?.trim()}
              onChange={(e) => onAnswer(k ? [picked[0] ?? "", e.target.value] : [e.target.value, picked[1] ?? ""])}
            />
          ))}
        </div>
      );
      break;
    default:
      control = (
        <Input id={id} type={q.type === "short" ? "text" : q.type} value={value} aria-invalid={missing} onChange={(e) => onAnswer(e.target.value)} />
      );
  }

  const otherBox = q.other && (value === "Other" || picked.includes("Other")) && (
    <Input size="sm" aria-label="Other answer" placeholder="Tell us more" value={otherText ?? ""} onChange={(e) => onOtherText?.(e.target.value)} />
  );

  return (
    <div className={cn("survey-question", missing && "survey-question--missing")}>
      <Field
        label={<span id={`${id}-l`}>{label}</span>}
        htmlFor={["single", "multi", "rating", "scale", "yesno"].includes(q.type) ? undefined : id}
        required={q.req}
        strongLabel
        error={error || (missing && (q.type === "name" && !q.fullNameOnly ? "Please add your first and last name" : "Please answer this question"))}
      >
        {q.help && <span className="text-tiny">{q.help}</span>}
        {control}
        {otherBox}
      </Field>
    </div>
  );
}
