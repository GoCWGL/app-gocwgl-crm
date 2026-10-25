"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar, Button, FormError, Icon, Textarea } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { ContactNoteOut, ContactOut } from "@/utils/api/models";
import { canWriteCrm, isStaffAdmin } from "@/utils/auth/session";
import { formatRelative } from "@/utils/format/dates";
import { useAddContactNote, useContactNotes, useDeleteContactNote, useEditContactNote } from "@/utils/hooks/useContacts";
import { useMe, useStaffTeam } from "@/utils/hooks/useUsers";
import { useAdmin } from "../state/AdminContext";

type Mate = { id: string; name: string };

/** Teammates who can be mentioned: active staff (not pending invitations). */
function useTeammates(): Mate[] {
  const team = useStaffTeam().data;
  return useMemo(
    () => (team?.members ?? []).filter((m) => m.status === "Active").map((m) => ({ id: m.id, name: m.fullName || m.email })),
    [team],
  );
}

/** The ids of mentions whose "@Name" is still in the text (deleting the text drops the mention). */
function mentionIds(text: string, picked: Mate[]): string[] {
  return [...new Set(picked.filter((m) => text.includes(`@${m.name}`)).map((m) => m.id))];
}

/**
 * Team notes on a contact: as many as you like, newest first, each saved on its own. Type @ to mention a teammate;
 * they're notified in their bell. Notes are for the team only and never show in the client portal.
 */
export function ContactNotesCard({ contact: c }: { contact: ContactOut }) {
  const me = useMe().data;
  const canWrite = canWriteCrm(me);
  const isAdmin = isStaffAdmin(me);
  const query = useContactNotes(c.id);
  const add = useAddContactNote();
  const notes = query.data ?? [];
  // Resets the composer after a save.
  const [composerKey, setComposerKey] = useState(0);
  const { state, update } = useAdmin();
  const card = useRef<HTMLDivElement>(null);

  // Opened from a "mentioned you" notification: bring the notes into view once they've loaded.
  const focus = state.editContactFocusNotes && !query.isPending;
  useEffect(() => {
    if (!focus) return;
    card.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    update({ editContactFocusNotes: false });
  }, [focus, update]);

  return (
    <div className="inset contact-notes" ref={card}>
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-purple" aria-hidden="true">
          <Icon name="edit" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">TEAM NOTES</span>
          <span className="text-tiny contact-notes__private">
            <Icon name="lock" size={11} strokeWidth={2.2} /> Only your team sees these. They never show in the client’s portal.
          </span>
        </span>
        <span className="text-tiny">{notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : ""}</span>
      </div>

      {canWrite && (
        <NoteComposer
          key={composerKey}
          id={`note-new-${c.id}`}
          placeholder="Add a note for the team… Type @ to mention someone."
          saveLabel="Save note"
          saving={add.isPending}
          error={add.error}
          onSave={(text, ids) =>
            add.mutate({ contactId: c.id, text, mentionIds: ids }, { onSuccess: () => setComposerKey((k) => k + 1) })
          }
        />
      )}

      {query.isPending ? (
        <span className="text-tiny">Loading notes…</span>
      ) : notes.length ? (
        <ul className="contact-notes__list">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} contactId={c.id} canChange={canWrite && (isAdmin || n.authorId === me?.id)} myId={me?.id} />
          ))}
        </ul>
      ) : (
        <span className="text-tiny">No notes yet.</span>
      )}
      <FormError error={query.error} />
    </div>
  );
}

/** A note box with @mention suggestions. Calls `onSave(text, mentionIds)`. */
function NoteComposer({
  id,
  initialText = "",
  initialMentions = [],
  placeholder,
  saveLabel,
  saving,
  error,
  onSave,
  onCancel,
}: {
  id: string;
  initialText?: string;
  initialMentions?: Mate[];
  placeholder: string;
  saveLabel: string;
  saving: boolean;
  error: unknown;
  onSave: (text: string, mentionIds: string[]) => void;
  onCancel?: () => void;
}) {
  const mates = useTeammates();
  const [text, setText] = useState(initialText);
  const [picked, setPicked] = useState<Mate[]>(initialMentions);
  // The "@word" being typed right before the caret, and which suggestion is highlighted.
  const [query, setQuery] = useState<{ start: number; term: string } | null>(null);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);

  const suggestions = query ? mates.filter((m) => m.name.toLowerCase().includes(query.term.toLowerCase())).slice(0, 6) : [];
  const ids = mentionIds(text, picked);
  const unchanged = text.trim() === initialText.trim() && ids.join() === mentionIds(initialText, initialMentions).join();

  const readQuery = (value: string, caret: number) => {
    const match = /(^|\s)@([^\s@]{0,30})$/.exec(value.slice(0, caret));
    setQuery(match ? { start: caret - match[2].length - 1, term: match[2] } : null);
    setActive(0);
  };

  const choose = (m: Mate) => {
    if (!query) return;
    const caret = box.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, query.start)}@${m.name} ${text.slice(caret)}`;
    setText(next);
    setPicked((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]));
    setQuery(null);
    const at = query.start + m.name.length + 2;
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(at, at);
    });
  };

  const save = () => text.trim() && !saving && onSave(text.trim(), ids);

  return (
    <div className="stack stack--6 note-composer">
      <div className="note-composer__field">
        <Textarea
          ref={box}
          id={id}
          aria-label={saveLabel === "Save note" ? "New note" : "Edit note"}
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={`${id}-mentions`}
          rows={3}
          maxLength={5000}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            readQuery(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => readQuery(e.currentTarget.value, e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (suggestions.length) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                choose(suggestions[active]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation(); // close the list, not the drawer
                setQuery(null);
                return;
              }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
          }}
          onBlur={() => window.setTimeout(() => setQuery(null), 150)}
        />
        {suggestions.length > 0 && (
          <ul className="note-composer__menu" id={`${id}-mentions`} role="listbox" aria-label="Mention a teammate">
            {suggestions.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn("note-composer__option", i === active && "note-composer__option--active")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(m)}
                >
                  <Avatar name={m.name} tone={avatarTone(m.id)} size="sm" />
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ids.length > 0 && (
        <span className="text-tiny contact-notes__private">
          <Icon name="bell" size={11} strokeWidth={2.2} /> {picked.filter((m) => ids.includes(m.id)).map((m) => m.name).join(", ")} will be notified
          {initialMentions.length ? " (only people newly mentioned)" : ""}.
        </span>
      )}
      <div className="cluster cluster--8">
        <Button size="sm" variant="primary" disabled={!text.trim() || saving || unchanged} onClick={save}>
          {saving ? "Saving…" : saveLabel}
        </Button>
        {onCancel && (
          <Button size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <span className="text-tiny">@ to mention · Ctrl + Enter to save</span>
      </div>
      <FormError error={error} />
    </div>
  );
}

/** The note text with each "@Name" mention highlighted (yours stands out more). */
function NoteText({ note: n, myId }: { note: ContactNoteOut; myId?: string }) {
  const names = n.mentions.map((m) => ({ ...m, token: `@${m.name}` })).sort((a, b) => b.token.length - a.token.length);
  if (!names.length) return <p className="contact-notes__text">{n.text}</p>;
  const pattern = new RegExp(`(${names.map((m) => m.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts: ReactNode[] = n.text.split(pattern).map((part, i) => {
    const m = names.find((x) => x.token === part);
    return m ? (
      <mark key={i} className={cn("mention", m.id === myId && "mention--me")}>
        {part}
      </mark>
    ) : (
      part
    );
  });
  return <p className="contact-notes__text">{parts}</p>;
}

function NoteItem({ note: n, contactId, canChange, myId }: { note: ContactNoteOut; contactId: string; canChange: boolean; myId?: string }) {
  const edit = useEditContactNote();
  const remove = useDeleteContactNote();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const edited = new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 1000;

  return (
    <li className={cn("contact-notes__item", n.mentions.some((m) => m.id === myId) && "contact-notes__item--mine")}>
      <div className="cluster cluster--8 contact-notes__meta">
        <span className="text-strong">{n.authorName || "Team"}</span>
        <span className="text-tiny" title={new Date(n.createdAt).toLocaleString()}>
          {formatRelative(n.createdAt)}
          {edited && " · edited"}
        </span>
        <span className="u-spacer" />
        {canChange && !editing && (
          <>
            <button type="button" className="row-action" onClick={() => setEditing(true)}>
              Edit
            </button>
            {confirm ? (
              <>
                <button
                  type="button"
                  className="row-action row-action--danger"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ contactId, noteId: n.id })}
                >
                  Yes, delete
                </button>
                <button type="button" className="row-action" onClick={() => setConfirm(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="row-action row-action--danger" onClick={() => setConfirm(true)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
      {editing ? (
        <NoteComposer
          id={`note-edit-${n.id}`}
          initialText={n.text}
          initialMentions={n.mentions}
          placeholder="Edit the note… Type @ to mention someone."
          saveLabel="Save"
          saving={edit.isPending}
          error={edit.error}
          onSave={(text, ids) => edit.mutate({ contactId, noteId: n.id, text, mentionIds: ids }, { onSuccess: () => setEditing(false) })}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <NoteText note={n} myId={myId} />
      )}
      <FormError error={remove.error} />
    </li>
  );
}
