"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, Field, FormError, Input, LoadState, Select } from "@/components/ui";
import { DOCUMENT_CATEGORIES, fileSize } from "@/data/shareholders";
import type { DataRoomDocumentOut, DocumentPatch, StakeholderOut } from "@/utils/api/models";
import { formatLong } from "@/utils/format/dates";
import { useDocuments, useOpenDocument, useShareholders, useUpdateDocument, useUploadDocument } from "@/utils/hooks/useShareholders";
import { useAdmin } from "../../state/AdminContext";
import { FormModal, RowActions, SectionCard, SimpleTable } from "./shared";

/** Shareholders › Data Room & Governance: documents by kind, each with who can open it. */
export function DataRoomSection() {
  const query = useDocuments();
  const people = useShareholders();
  const open = useOpenDocument();
  const { notify } = useAdmin();
  const [editing, setEditing] = useState<DataRoomDocumentOut | "new" | null>(null);
  const docs = query.data ?? [];
  const stakeholders = people.data?.stakeholders ?? [];
  const nameOf = (id: string) => stakeholders.find((s) => s.id === id)?.name ?? "";
  const groups = DOCUMENT_CATEGORIES.map((c) => ({ ...c, docs: docs.filter((d) => d.category === c.value) })).filter((g) => g.docs.length);
  return (
    <div className="stack stack--16">
      <div className="cluster cluster--between">
        <span className="text-small">New documents are private until you share them. Every time one is opened, it’s recorded in the audit log.</span>
        <Button variant="primary" aria-haspopup="dialog" disabled={!people.data} onClick={() => setEditing("new")}>
          + Add document
        </Button>
      </div>
      <FormError error={open.error} />
      <LoadState query={query} isEmpty={!docs.length} empty="No documents yet. Add articles of incorporation, agreements, certificates, board minutes and tax statements.">
        {groups.map((g) => (
          <SectionCard key={g.value} kicker={`${g.label.toUpperCase()} · ${g.docs.length}`}>
            <SimpleTable head={["Document", "Date", "Who can open it", "Actions"]}>
              {g.docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="stack stack--2">
                      <span className="u-strong u-ink">{d.title}</span>
                      <span className="text-small">
                        {d.fileName} · {fileSize(d.fileSize)}
                      </span>
                    </div>
                  </td>
                  <td>{d.documentDate ? formatLong(d.documentDate) : "—"}</td>
                  <td>
                    <Badge tone={d.visibility === "private" ? "neutral" : d.visibility === "all" ? "green" : "purple"}>
                      {d.visibility === "private" ? "Super admins only" : d.visibility === "all" ? "All shareholders" : d.stakeholderIds.map(nameOf).filter(Boolean).join(", ") || "Nobody"}
                    </Badge>
                  </td>
                  <td className="data-table__actions">
                    <button type="button" className="row-action row-action--brand" disabled={open.isPending} aria-label={`Open ${d.title}`} onClick={() => open.mutate(d)}>
                      Open
                    </button>
                    <RowActions kind="documents" id={d.id} name={d.title} onEdit={people.data ? () => setEditing(d) : undefined} />
                  </td>
                </tr>
              ))}
            </SimpleTable>
          </SectionCard>
        ))}
      </LoadState>
      {editing && (
        <DocumentModal
          doc={editing === "new" ? undefined : editing}
          stakeholders={stakeholders}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            notify(m);
          }}
        />
      )}
    </div>
  );
}

function DocumentModal({
  doc,
  stakeholders,
  onClose,
  onSaved,
}: {
  doc?: DataRoomDocumentOut;
  stakeholders: StakeholderOut[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const upload = useUploadDocument();
  const update = useUpdateDocument();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [category, setCategory] = useState<DocumentPatch["category"]>((doc?.category as DocumentPatch["category"]) ?? "agreement");
  const [documentDate, setDay] = useState(doc?.documentDate ?? "");
  const [visibility, setVisibility] = useState<DocumentPatch["visibility"]>((doc?.visibility as DocumentPatch["visibility"]) ?? "private");
  const [ids, setIds] = useState<string[]>(doc?.stakeholderIds ?? []);
  const [error, setError] = useState("");
  const submit = () => {
    if (!doc && !file) return setError("Choose a file.");
    if (doc && !title.trim()) return setError("Enter a title.");
    if (visibility === "selected" && !ids.length) return setError("Pick who can open it.");
    const meta: DocumentPatch = { title: title.trim(), category, documentDate: documentDate || null, visibility, stakeholderIds: visibility === "selected" ? ids : [] };
    if (doc) update.mutate({ id: doc.id, meta }, { onSuccess: () => onSaved("Document saved.") });
    else if (file) upload.mutate({ file, meta }, { onSuccess: () => onSaved("Document added.") });
  };
  return (
    <FormModal
      id="doc-title"
      kicker="DATA ROOM"
      title={doc ? "Edit document" : "Add a document"}
      submitLabel={doc ? "Save" : "Upload"}
      mutation={doc ? update : upload}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      {!doc && (
        <Field label="File" htmlFor="doc-file" required hint="PDF, Word, PowerPoint, Excel, image or video.">
          <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      )}
      <Field label="Title" htmlFor="doc-name" required={!!doc} hint={doc ? undefined : "Defaults to the file’s name."}>
        <Input id="doc-name" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Kind" htmlFor="doc-cat">
          <Select id="doc-cat" value={category} options={DOCUMENT_CATEGORIES} onChange={(e) => setCategory(e.target.value as DocumentPatch["category"])} />
        </Field>
        <Field label="Document date" htmlFor="doc-day">
          <Input id="doc-day" type="date" value={documentDate} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
      <Field label="Who can open it" htmlFor="doc-vis" hint="Super admins always can. Shareholders need a linked login.">
        <Select
          id="doc-vis"
          value={visibility}
          options={[
            { value: "private", label: "Super admins only" },
            { value: "all", label: "All shareholders" },
            { value: "selected", label: "Only the ones I pick" },
          ]}
          onChange={(e) => setVisibility(e.target.value as DocumentPatch["visibility"])}
        />
      </Field>
      {visibility === "selected" && (
        <div className="stack stack--8">
          {stakeholders.length === 0 && <span className="text-small">Add shareholders first.</span>}
          {stakeholders.map((s) => (
            <Checkbox
              key={s.id}
              label={`${s.name}${s.userId ? "" : " (no login yet)"}`}
              checked={ids.includes(s.id)}
              onChange={(e) => setIds((x) => (e.target.checked ? [...x, s.id] : x.filter((i) => i !== s.id)))}
            />
          ))}
        </div>
      )}
    </FormModal>
  );
}
