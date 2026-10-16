"use client";

import { useState } from "react";
import { Button, Field, IconTile, Modal, Textarea, buttonClass } from "@/components/ui";
import { LANDING_COPY, type Todo, type TodoDoc } from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import type { Tone } from "@/lib/tones";
import { cn, toTextDataUrl } from "@/lib/utils";
import { usePortal } from "../state/PortalContext";
import { CopyPreview, MockupPreview } from "./LandingPreview";

const DOC_TONES: Record<string, Tone> = { DOC: "sky", PNG: "purple", PDF: "red", SVG: "green" };

/** Right-side drawer with the details of one "waiting on you" item. */
export function TodoDrawer() {
  const { state, update } = usePortal();
  const todo = state.todos.find((t) => t.id === state.openTodoId);
  const close = () => update({ openTodoId: 0 });

  if (!todo) return null;
  // Keyed by id so the drawer's local state resets for each item.
  return <TodoDrawerContent key={todo.id} todo={todo} onClose={close} />;
}

function TodoDrawerContent({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const { update } = usePortal();
  const [preview, setPreview] = useState<TodoDoc["preview"] | "">(todo.docs.find((d) => d.preview)?.preview ?? "");
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const isApproval = todo.kind === "approval";

  const approve = () =>
    update((s) => ({
      todos: s.todos.map((x) => (x.id === todo.id ? { ...x, done: true, changesRequested: false } : x)),
      openTodoId: 0,
      toast: isApproval ? "Approved! We will move on to the next step." : "Thanks! Your GoCWGL team has been notified.",
    }));

  const requestChanges = () => {
    if (!requesting) return setRequesting(true);
    const text = note.trim();
    if (!text) return setError(true);
    update((s) => ({
      todos: s.todos.map((x) =>
        x.id === todo.id
          ? { ...x, changesRequested: true, comments: [...x.comments, { from: "You", when: TODAY_SHORT, text }] }
          : x,
      ),
      updates: [{ who: "You", date: TODAY_SHORT, text: `Requested changes on “${todo.title}”: ${text}` }, ...s.updates],
      openTodoId: 0,
      toast: "Change request sent. Your GoCWGL team will send an updated version.",
    }));
  };

  const kicker = todo.done ? "COMPLETED" : isApproval ? "WAITING FOR YOUR APPROVAL" : "WAITING ON YOU";

  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      titleId="tdm-title"
      title={todo.title}
      kicker={
        <span className={cn("drawer-kicker", todo.done ? "tone-green" : "tone-amber")}>
          <span className="drawer-kicker__dot" aria-hidden="true" />
          {kicker}
        </span>
      }
      subtitle={`Part of ${todo.phase} · from ${todo.from} · ${todo.sent}`}
      footer={
        todo.done ? (
          <span className="drawer-done">✓ {isApproval ? "You approved this" : "Done"} — thank you!</span>
        ) : (
          <>
            <span className="u-spacer" />
            {isApproval && (
              <Button variant="secondary" onClick={requestChanges}>
                {requesting ? "Send change request" : "Request changes"}
              </Button>
            )}
            <Button variant="primary" onClick={approve}>
              {todo.action}
            </Button>
          </>
        )
      }
    >
      <p className="text-body u-pre-line">{todo.details}</p>

      {!!todo.steps?.length && (
        <div className="stack stack--8">
          <span className="kicker">STEPS</span>
          {todo.steps.map((step, i) => (
            <div className="inset step-item" key={step}>
              <span className="step-item__number">{i + 1}</span>
              <span className="text-body">{step}</span>
            </div>
          ))}
        </div>
      )}

      <div className="stack stack--8">
        <span className="kicker">DOCUMENTS · {todo.docs.length}</span>
        {todo.docs.map((doc) => {
          const on = !!doc.preview && preview === doc.preview;
          const content =
            doc.preview === "copy"
              ? LANDING_COPY.map((x) => `${x.label}\n${x.text}`).join("\n\n")
              : `${doc.name}\n(Sample file in this prototype.)`;
          return (
            <div className={cn("doc-row", on && "doc-row--active")} key={doc.name}>
              <IconTile tone={DOC_TONES[doc.ext] ?? "sky"} size="lg" text>
                {doc.ext}
              </IconTile>
              <div className="stack stack--2 u-grow">
                <span className="text-strong u-truncate">{doc.name}</span>
                <span className="text-small">{doc.meta}</span>
              </div>
              {doc.preview && (
                <Button variant="outline" size="sm" aria-pressed={on} onClick={() => setPreview(on ? "" : doc.preview!)}>
                  {on ? "Hide preview" : "Preview"}
                </Button>
              )}
              <a
                className={buttonClass({ variant: "outline", size: "sm" })}
                href={toTextDataUrl(content)}
                download={doc.name.replace(/\.[a-z]+$/i, "") + ".txt"}
              >
                Download
              </a>
            </div>
          );
        })}
      </div>

      {preview === "copy" && <CopyPreview />}
      {preview === "mock" && <MockupPreview />}

      {todo.comments.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker">CONVERSATION</span>
          {todo.comments.map((c, i) => (
            <div key={i} className={cn("message", c.from === "You" && "message--violet")}>
              <span className="message__meta">
                {c.from} · {c.when}
              </span>
              {c.text}
            </div>
          ))}
        </div>
      )}

      {requesting && !todo.done && (
        <Field
          label="What should we change?"
          htmlFor="tdm-note"
          error={error && "Tell us what to change so we can update it."}
        >
          <Textarea
            id="tdm-note"
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(false);
            }}
            placeholder="e.g. Make the headline mention our new location, and use 'members' instead of 'clients'."
          />
        </Field>
      )}
    </Modal>
  );
}
