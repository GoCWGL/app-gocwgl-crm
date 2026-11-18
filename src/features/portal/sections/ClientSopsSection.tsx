"use client";

import { useState } from "react";
import { Button, ConfirmDialog, Icon, IconButton, IconTile, LoadState, SearchBox, SegmentedControl } from "@/components/ui";
import { SopLibrary } from "@/features/va/sections/SopLibrarySection";
import type { ClientSopOut } from "@/utils/api/models";
import { openClientSopFile } from "@/utils/api/sops";
import { useClientSops } from "@/utils/hooks/useClientWork";
import { useDeleteClientSop, useMyClientSops } from "@/utils/hooks/useSops";
import { ClientSopGrid, matchesSop } from "../components/ClientSopList";
import { ClientSopModal } from "../components/ClientSopModal";
import { usePortal } from "../state/PortalContext";
import { SharedWith } from "./VaAssetsSection";

type View = "mine" | "gocwgl";

/**
 * Client portal › SOPs: your own SOPs for your VAs (written here, uploaded, or linked), each shared with the VAs you
 * pick, and the guides the GoCWGL team publishes for clients (read only).
 */
export function ClientSopsSection() {
  const mine = useMyClientSops();
  const gocwgl = useClientSops();
  const [view, setView] = useState<View>("mine");
  return (
    <div className="page-stack">
      <SegmentedControl<View>
        kind="tabs"
        label="SOPs"
        value={view}
        onChange={setView}
        options={[
          { value: "mine", label: "Your SOPs", count: mine.data?.sops.length },
          { value: "gocwgl", label: "From GoCWGL", count: gocwgl.data?.length },
        ]}
      />
      {view === "mine" ? <YourSops /> : <SopLibrary query={gocwgl} />}
    </div>
  );
}

function YourSops() {
  const { readOnly, notify } = usePortal();
  const query = useMyClientSops();
  const sops = query.data?.sops ?? [];
  const vas = query.data?.vas ?? [];
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientSopOut | "new" | null>(null);
  const [deleting, setDeleting] = useState<ClientSopOut | null>(null);
  const remove = useDeleteClientSop();
  const vaById = new Map(vas.map((v) => [v.id, v]));
  const categories = [...new Set(sops.map((s) => s.category).filter(Boolean))].sort();
  const shown = sops.filter((s) => matchesSop(s, search));

  return (
    <div className="card card--flat board">
      <div className="course-toolbar">
        <div className="stack stack--2">
          <h3 className="course-toolbar__title">Your SOPs</h3>
          <span className="text-small">How you like things done, for the VAs you pick. Only they can see each one.</span>
        </div>
        <div className="course-toolbar__tools">
          {sops.length > 0 && <SearchBox label="Search your SOPs" placeholder="Search your SOPs" value={search} onChange={setSearch} />}
          {!readOnly && (
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Icon name="plus" size={15} /> Add SOP
            </Button>
          )}
        </div>
      </div>
      <LoadState query={query} loadingText="Loading your SOPs…">
        {!sops.length ? (
          <div className="board__empty">
            <IconTile tone="purple" size="lg">
              <Icon name="clipboard" size={22} />
            </IconTile>
            <span className="text-strong">Show your VAs how you like things done</span>
            <span className="text-small">
              Write an SOP step by step, upload a PDF or Word document, or link to one in Google Docs, Notion or Loom.
            </span>
            {!readOnly && (
              <Button variant="primary" onClick={() => setEditing("new")}>
                <Icon name="plus" size={15} /> Add your first SOP
              </Button>
            )}
          </div>
        ) : !shown.length ? (
          <p className="ast-empty-line">No SOPs match your search.</p>
        ) : (
          <ClientSopGrid
            sops={shown}
            openFile={openClientSopFile}
            kicker={() => "YOUR SOP"}
            aside={(s) => <SharedWith ids={s.vaIds} vaById={vaById} />}
            actions={
              readOnly
                ? undefined
                : (s) => (
                    <>
                      <IconButton size="sm" ghost label={`Edit ${s.title}`} onClick={() => setEditing(s)}>
                        <Icon name="edit" size={14} />
                      </IconButton>
                      <IconButton size="sm" ghost danger label={`Delete ${s.title}`} onClick={() => setDeleting(s)}>
                        <Icon name="trash" size={14} />
                      </IconButton>
                    </>
                  )
            }
          />
        )}
      </LoadState>

      {editing && (
        <ClientSopModal
          sop={editing === "new" ? null : editing}
          vas={vas}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(title, isNew) => (notify(isNew ? `${title} added.` : `${title} saved.`), setEditing(null))}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          confirmLabel="Delete SOP"
          icon="trash"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => (notify(`${deleting.title} deleted.`), setDeleting(null)) })}
        >
          Your VAs won’t see it any more{deleting.kind === "file" ? ", and the uploaded file is removed" : ""}. This can’t be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
