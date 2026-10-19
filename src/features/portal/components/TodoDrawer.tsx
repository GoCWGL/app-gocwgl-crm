"use client";

import { useState } from "react";
import { Button, Field, FormError, IconTile, Modal, Textarea } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { cn, fileExtension, formatFileSize } from "@/lib/utils";
import { downloadAsset } from "@/utils/api/delivery";
import type { TodoOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useAssets } from "@/utils/hooks/useDelivery";
import { useCommentOnTodo, useCompleteTodo, usePortalTodos, useRequestTodoChanges } from "@/utils/hooks/usePortal";
import { usePortal } from "../state/PortalContext";

const DOC_TONES: Record<string, Tone> = { DOC: "sky", DOCX: "sky", PNG: "purple", PDF: "red", SVG: "green" };

/** Right-side drawer with the details of one "waiting on you" item. */
export function TodoDrawer() {
  const { state, update } = usePortal();
  const todo = usePortalTodos().data?.find((t) => t.id === state.openTodoId);
  const close = () => update({ openTodoId: "" });

  if (!todo) return null;
  // Keyed by id so the drawer's local state resets for each item.
  return <TodoDrawerContent key={todo.id} todo={todo} onClose={close} />;
}

function TodoDrawerContent({ todo, onClose }: { todo: TodoOut; onClose: () => void }) {
  const { update, readOnly } = usePortal();
  const files = useAssets().data ?? [];
  const complete = useCompleteTodo();
  const requestChanges = useRequestTodoChanges();
  const comment = useCommentOnTodo();
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const isApproval = todo.kind === "approval";
  const docs = todo.fileIds.map((id) => files.find((f) => f.id === id) ?? { id, name: "Attached file", size: 0, createdAt: "" });

  const approve = () =>
    complete.mutate(todo.id, {
      onSuccess: () =>
        update({
          openTodoId: "",
          toast: isApproval ? "Approved! We will move on to the next step." : "Thanks! Your GoCWGL team has been notified.",
        }),
    });

  const sendChanges = () => {
    if (!requesting) return setRequesting(true);
    const text = note.trim();
    if (!text) return setError(true);
    requestChanges.mutate(
      { id: todo.id, text },
      { onSuccess: () => update({ openTodoId: "", toast: "Change request sent. Your GoCWGL team will send an updated version." }) },
    );
  };

  const kicker = todo.done ? "COMPLETED" : isApproval ? "WAITING FOR YOUR APPROVAL" : "WAITING ON YOU";
  const pending = complete.isPending || requestChanges.isPending;

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
      subtitle={[todo.phase && `Part of ${todo.phase}`, todo.createdBy && `from ${todo.createdBy}`, formatShort(todo.createdAt)]
        .filter(Boolean)
        .join(" · ")}
      footer={
        todo.done ? (
          <span className="drawer-done">✓ {isApproval ? "You approved this" : "Done"} — thank you!</span>
        ) : readOnly ? (
          <span className="text-small">View only</span>
        ) : (
          <>
            <FormError error={complete.error ?? requestChanges.error} />
            <span className="u-spacer" />
            {isApproval && (
              <Button variant="secondary" onClick={sendChanges} disabled={pending}>
                {requesting ? "Send change request" : "Request changes"}
              </Button>
            )}
            <Button variant="primary" onClick={approve} disabled={pending}>
              {complete.isPending ? "Saving…" : todo.actionLabel}
            </Button>
          </>
        )
      }
    >
      {todo.changesRequested && !todo.done && (
        <div className="notice notice--info" role="status">
          You asked for changes. Your GoCWGL team will send an updated version.
        </div>
      )}
      <p className="text-body u-pre-line">{todo.details || todo.description}</p>

      {todo.steps.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker">STEPS</span>
          {todo.steps.map((step, i) => (
            <div className="inset step-item" key={`${i}-${step}`}>
              <span className="step-item__number">{i + 1}</span>
              <span className="text-body">{step}</span>
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker">DOCUMENTS · {docs.length}</span>
          <FormError error={downloadError} />
          {docs.map((doc) => {
            const ext = fileExtension(doc.name);
            return (
              <div className="doc-row" key={doc.id}>
                <IconTile tone={DOC_TONES[ext] ?? "sky"} size="lg" text>
                  {ext}
                </IconTile>
                <div className="stack stack--2 u-grow">
                  <span className="text-strong u-truncate">{doc.name}</span>
                  <span className="text-small">
                    {[doc.size ? formatFileSize(doc.size) : "", doc.createdAt ? formatShort(doc.createdAt) : ""].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {/* Downloads need the access token, so they go through an authenticated fetch. */}
                <Button variant="outline" size="sm" onClick={() => downloadAsset(doc).catch(setDownloadError)}>
                  Download
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {todo.comments.length > 0 && (
        <div className="stack stack--8">
          <span className="kicker">CONVERSATION</span>
          {todo.comments.map((c) => (
            <div key={c.id} className={cn("message", c.authorKind === "client" && "message--violet")}>
              <span className="message__meta">
                {c.authorName} · {formatShort(c.createdAt)}
              </span>
              {c.text}
            </div>
          ))}
        </div>
      )}

      {requesting && !todo.done && (
        <Field label="What should we change?" htmlFor="tdm-note" error={error && "Tell us what to change so we can update it."}>
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

      {!readOnly && !requesting && (
        <div className="stack stack--8">
          <Field label="Message your team about this" htmlFor="tdm-reply">
            <Textarea id="tdm-reply" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ask a question or add a note…" />
          </Field>
          <FormError error={comment.error} />
          <Button
            size="sm"
            className="u-self-end"
            disabled={!reply.trim() || comment.isPending}
            onClick={() => comment.mutate({ id: todo.id, text: reply.trim() }, { onSuccess: () => setReply("") })}
          >
            {comment.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
