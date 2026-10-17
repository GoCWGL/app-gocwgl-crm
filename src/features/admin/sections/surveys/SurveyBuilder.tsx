"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, Field, Icon, IconButton, IconTile, Input, Select, Textarea, Toggle } from "@/components/ui";
import { CHOICE_TYPES, QUESTION_TYPES, type QuestionType, type Survey, type SurveyQuestion } from "@/data/admin";
import { cn, moveItem, newId } from "@/lib/utils";
import { changeQuestionType, newQuestion, surveyErrors } from "../../lib/surveys";
import { useAdmin } from "../../state/AdminContext";
import { SurveyEmbedModal } from "./SurveyEmbedModal";
import { SurveyPreview } from "./SurveyPreview";

type SurveyBuilderProps = {
  draft: Survey;
  onChange: (draft: Survey) => void;
  onClose: () => void;
};

/** Three columns: question types · questions & settings · live preview. */
export function SurveyBuilder({ draft, onChange, onClose }: SurveyBuilderProps) {
  const { state, update, notify } = useAdmin();
  const [error, setError] = useState("");
  const [embedOpen, setEmbedOpen] = useState(false);

  const set = (patch: Partial<Survey>) => {
    onChange({ ...draft, ...patch });
    setError("");
  };
  const setQuestions = (questions: SurveyQuestion[]) => set({ questions });
  const patchQuestion = (i: number, patch: Partial<SurveyQuestion>) =>
    setQuestions(draft.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));

  const addQuestion = (type: QuestionType) => {
    setQuestions([...draft.questions, newQuestion(type)]);
    // Bring the new question into view once it renders.
    requestAnimationFrame(() => document.querySelector(".question-editor:last-of-type input")?.scrollIntoView({ block: "center" }));
  };

  /** Saves and returns the saved survey (with its id), or null when invalid. */
  const persist = (): Survey | null => {
    const problem = surveyErrors(draft);
    if (problem) {
      setError(problem);
      return null;
    }
    const saved: Survey = {
      ...draft,
      id: draft.id || newId(),
      name: draft.name.trim(),
      questions: draft.questions.map((q) => ({ ...q, title: q.title.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) })),
    };
    update((s) => ({
      surveys: draft.id ? s.surveys.map((x) => (x.id === draft.id ? saved : x)) : [...s.surveys, saved],
    }));
    return saved;
  };

  const save = () => {
    if (!persist()) return;
    notify(`Saved “${draft.name.trim()}”.`);
    onClose();
  };

  const openEmbed = () => {
    const saved = persist();
    if (!saved) return;
    onChange(saved);
    setEmbedOpen(true);
  };

  return (
    <div className="page-stack">
      <div className="toolbar toolbar--card">
        <Button variant="soft" onClick={onClose}>
          <Icon name="arrowLeft" size={14} strokeWidth={2.4} />
          All surveys
        </Button>
        <label className="sr-only" htmlFor="sv-name">
          Survey name
        </label>
        <input
          id="sv-name"
          className="title-input"
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Name your survey"
        />
        <Toggle label="Published" showLabel checked={draft.on} onChange={(on) => set({ on })} />
        <Button variant="outline" onClick={openEmbed}>
          <Icon name="code" size={14} />
          Get embed code
        </Button>
        <Button variant="primary" onClick={save}>
          Save survey
        </Button>
      </div>
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}

      <div className="builder">
        {/* Question types */}
        <section className="card card--tight builder__palette">
          <span className="kicker">LEAD DETAILS</span>
          {LEAD_TYPES.map((type) => (
            <PaletteItem key={type} type={type} lead added={draft.questions.some((q) => q.type === type)} onAdd={() => addQuestion(type)} />
          ))}
          <span className="text-small">Saved to the contact, so everyone who answers shows up in Clients as a lead.</span>
          <hr className="divider" />
          <span className="kicker">ADD A QUESTION</span>
          {OTHER_TYPES.map((type) => (
            <PaletteItem key={type} type={type} onAdd={() => addQuestion(type)} />
          ))}
        </section>

        {/* Questions & settings */}
        <section className="stack stack--12 builder__fields">
          <div className="card card--tight">
            <span className="kicker">INTRO</span>
            <Field label="Text above the first question (optional)" htmlFor="sv-intro">
              <Textarea
                id="sv-intro"
                rows={2}
                value={draft.intro}
                onChange={(e) => set({ intro: e.target.value })}
                placeholder="e.g. Two quick minutes to help us serve you better."
              />
            </Field>
          </div>

          <div className="card card--tight">
            <span className="kicker">LAYOUT</span>
            <div className="layout-options" role="radiogroup" aria-label="Survey layout">
              {LAYOUTS.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  role="radio"
                  aria-checked={draft.oneAtATime === l.paged}
                  className="layout-option"
                  onClick={() => set({ oneAtATime: l.paged })}
                >
                  <span className={cn("layout-option__art", l.paged && "layout-option__art--paged")} aria-hidden="true">
                    {l.paged ? (
                      <>
                        <i className="layout-option__bar" />
                        <i />
                      </>
                    ) : (
                      <>
                        <i />
                        <i />
                        <i />
                      </>
                    )}
                  </span>
                  <span className="stack stack--2">
                    <span className="text-strong">{l.label}</span>
                    <span className="text-tiny">{l.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <span className="kicker">QUESTIONS · {draft.questions.length}</span>
          {draft.questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              index={i}
              count={draft.questions.length}
              question={q}
              onPatch={(patch) => patchQuestion(i, patch)}
              onType={(type) => setQuestions(draft.questions.map((x, k) => (k === i ? changeQuestionType(x, type) : x)))}
              onMove={(to) => setQuestions(moveItem(draft.questions, i, to))}
              onDuplicate={() => {
                const copy = { ...structuredClone(q), id: newId(), key: undefined };
                setQuestions([...draft.questions.slice(0, i + 1), copy, ...draft.questions.slice(i + 1)]);
              }}
              onDelete={() => setQuestions(draft.questions.filter((_, k) => k !== i))}
            />
          ))}
          {draft.questions.length === 0 && <div className="empty-state">Add your first question from the left.</div>}

          <div className="card card--tight">
            <span className="kicker">SETTINGS</span>
            <div className="form-grid form-grid--narrow">
              <Field label="Submit button text" htmlFor="sv-btn">
                <Input id="sv-btn" size="sm" value={draft.button} onChange={(e) => set({ button: e.target.value })} />
              </Field>
              <Field label="Tag people who finish" htmlFor="sv-tag">
                <Select
                  id="sv-tag"
                  size="sm"
                  value={draft.tag}
                  placeholder="No tag"
                  options={state.tags.map((t) => ({ value: t.id, label: t.name }))}
                  onChange={(e) => set({ tag: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Thank-you message" htmlFor="sv-thanks">
              <Input id="sv-thanks" size="sm" value={draft.thanks} onChange={(e) => set({ thanks: e.target.value })} />
            </Field>
          </div>
        </section>

        {/* Live preview */}
        <section className="stack stack--10 builder__preview" aria-label="Survey preview">
          <span className="kicker">LIVE PREVIEW</span>
          <SurveyPreview survey={draft} />
        </section>
      </div>

      {embedOpen && <SurveyEmbedModal survey={draft} onClose={() => setEmbedOpen(false)} />}
    </div>
  );
}

const LAYOUTS = [
  { paged: false, label: "One page", desc: "All questions on a single page. Quick for short surveys." },
  { paged: true, label: "One question per page", desc: "Step by step with a progress bar. Feels shorter for longer surveys." },
];

const ALL_TYPES = Object.keys(QUESTION_TYPES) as QuestionType[];
const LEAD_TYPES = ALL_TYPES.filter((t) => QUESTION_TYPES[t].contact);
const OTHER_TYPES = ALL_TYPES.filter((t) => !QUESTION_TYPES[t].contact);

function PaletteItem({ type, lead, added, onAdd }: { type: QuestionType; lead?: boolean; added?: boolean; onAdd: () => void }) {
  const t = QUESTION_TYPES[type];
  return (
    <button type="button" className={cn("palette-item", lead && "palette-item--lead")} onClick={onAdd}>
      <IconTile tone={lead ? "green" : "purple"} size="xs">
        <Icon name={t.icon} size={14} />
      </IconTile>
      <span className="stack stack--2 u-grow">
        {t.label}
        <span className="text-tiny">{added ? "Already in this survey" : t.desc}</span>
      </span>
      <span className="palette-item__plus" aria-hidden="true">
        {added ? "✓" : "+"}
      </span>
    </button>
  );
}

type QuestionEditorProps = {
  index: number;
  count: number;
  question: SurveyQuestion;
  onPatch: (patch: Partial<SurveyQuestion>) => void;
  onType: (type: QuestionType) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function QuestionEditor({ index: i, count, question: q, onPatch, onType, onMove, onDuplicate, onDelete }: QuestionEditorProps) {
  const type = QUESTION_TYPES[q.type];
  const hasChoices = CHOICE_TYPES.includes(q.type);
  const setOption = (k: number, value: string) => onPatch({ options: q.options.map((o, j) => (j === k ? value : o)) });

  return (
    <div className="card card--tight question-editor">
      <div className="cluster cluster--nowrap">
        <span className="question-editor__number">{i + 1}</span>
        <Select
          size="sm"
          className="question-editor__type"
          aria-label={`Question ${i + 1} type`}
          value={q.type}
          options={(Object.keys(QUESTION_TYPES) as QuestionType[]).map((k) => ({ value: k, label: QUESTION_TYPES[k].label }))}
          onChange={(e) => onType(e.target.value as QuestionType)}
        />
        <span className="u-grow" />
        <IconButton label="Move question up" disabled={i === 0} onClick={() => onMove(i - 1)}>
          <Icon name="chevronUp" size={12} strokeWidth={2.4} />
        </IconButton>
        <IconButton label="Move question down" disabled={i === count - 1} onClick={() => onMove(i + 1)}>
          <Icon name="chevronDown" size={12} strokeWidth={2.4} />
        </IconButton>
        <IconButton label="Duplicate question" onClick={onDuplicate}>
          <Icon name="copy" size={12} />
        </IconButton>
        <IconButton label="Delete question" danger onClick={onDelete}>
          <Icon name="trash" size={12} />
        </IconButton>
      </div>

      <Field label="Question" htmlFor={`q-${q.id}`} required>
        <Input id={`q-${q.id}`} value={q.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Type your question" />
      </Field>
      <Field label="Help text (optional)" htmlFor={`qh-${q.id}`}>
        <Input
          id={`qh-${q.id}`}
          size="sm"
          value={q.help}
          onChange={(e) => onPatch({ help: e.target.value })}
          placeholder="Shown under the question"
        />
      </Field>

      {hasChoices && (
        <div className="stack stack--6">
          <span className="field__label">Choices</span>
          {q.options.map((o, k) => (
            <div className="choice-row" key={k}>
              <span className="choice-row__mark" aria-hidden="true">
                {q.type === "multi" ? "☐" : q.type === "single" ? "◯" : `${k + 1}.`}
              </span>
              <Input
                size="sm"
                aria-label={`Choice ${k + 1}`}
                value={o}
                onChange={(e) => setOption(k, e.target.value)}
                placeholder={`Choice ${k + 1}`}
              />
              <IconButton
                label={`Remove choice ${k + 1}`}
                danger
                disabled={q.options.length <= 1}
                onClick={() => onPatch({ options: q.options.filter((_, j) => j !== k) })}
              >
                ×
              </IconButton>
            </div>
          ))}
          <div className="cluster cluster--10">
            <Button variant="dashed" size="sm" onClick={() => onPatch({ options: [...q.options, ""] })}>
              + Add choice
            </Button>
            {q.type !== "dropdown" && (
              <Checkbox label="Add an “Other” choice with a text box" checked={!!q.other} onChange={() => onPatch({ other: !q.other })} />
            )}
          </div>
        </div>
      )}

      {q.type === "scale" && (
        <div className="form-grid form-grid--narrow">
          <Field label="Label for 0" htmlFor={`ql-${q.id}`}>
            <Input id={`ql-${q.id}`} size="sm" value={q.lowLabel ?? ""} onChange={(e) => onPatch({ lowLabel: e.target.value })} />
          </Field>
          <Field label="Label for 10" htmlFor={`qhl-${q.id}`}>
            <Input id={`qhl-${q.id}`} size="sm" value={q.highLabel ?? ""} onChange={(e) => onPatch({ highLabel: e.target.value })} />
          </Field>
        </div>
      )}

      {q.type === "name" && (
        <Checkbox
          label="Ask for first and last name in separate boxes"
          checked={!q.fullNameOnly}
          onChange={() => onPatch({ fullNameOnly: !q.fullNameOnly })}
        />
      )}

      <div className="cluster cluster--10 question-editor__foot">
        <Checkbox label="Required" checked={q.req} onChange={() => onPatch({ req: !q.req })} />
        <span className="u-grow" />
        {type.contact ? (
          <Badge tone="green" mono size="xs">
            SAVED TO CONTACT · {type.contact.toUpperCase()}
          </Badge>
        ) : (
          <>
            <label className="question-editor__key" htmlFor={`qk-${q.id}`}>
              <span className="text-tiny">Save answer to contact as</span>
              <Input
                id={`qk-${q.id}`}
                size="sm"
                mono
                value={q.key ?? ""}
                placeholder="optional, e.g. budget"
                onChange={(e) => onPatch({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() || undefined })}
              />
            </label>
            {q.key && (
              <Badge tone="purple" mono size="xs">
                CONTACT FIELD
              </Badge>
            )}
          </>
        )}
      </div>
      <span className="sr-only">{type.label}</span>
    </div>
  );
}
