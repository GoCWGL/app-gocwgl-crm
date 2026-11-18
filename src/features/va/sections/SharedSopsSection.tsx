"use client";

import { useState } from "react";
import { Icon, LoadState, SearchBox } from "@/components/ui";
import { ClientSopGrid, matchesSop } from "@/features/portal/components/ClientSopList";
import { openSharedSopFile } from "@/utils/api/sops";
import { useSharedClientSops } from "@/utils/hooks/useSops";
import { useVaAccess } from "../lib/access";
import { clientLabel } from "../lib/time";
import { useVa } from "../state/VaContext";

/** VA portal › (client) › SOPs: the SOPs this client shared with you. */
export function ClientSopsTabSection() {
  const { client } = useVa();
  return (
    <div className="page-stack">
      <SharedSops clientId={client} />
    </div>
  );
}

/**
 * SOPs your clients shared with you: one client's (`clientId`), or every client's (the SOP library, where it's hidden
 * until a client shares one). Written ones open here; uploaded ones open or download; links open in a new tab.
 */
export function SharedSops({ clientId = "", hideWhenEmpty = false }: { clientId?: string; hideWhenEmpty?: boolean }) {
  const { ready } = useVaAccess();
  const query = useSharedClientSops(clientId, ready);
  const [search, setSearch] = useState("");
  const sops = query.data?.sops ?? [];
  const shown = sops.filter((s) => matchesSop(s, search));
  const oneClient = query.data?.clients.find((c) => c.id === clientId);
  if (hideWhenEmpty && !sops.length) return null;

  return (
    <div className="card card--flat board">
      <div className="course-toolbar">
        <div className="stack stack--2">
          <h3 className="course-toolbar__title">{!clientId ? "From your clients" : oneClient ? `SOPs from ${clientLabel(oneClient)}` : "SOPs from this client"}</h3>
          <span className="text-small">
            {sops.length} SOP{sops.length === 1 ? "" : "s"} shared with you{clientId ? "" : " by the clients you work for"}
          </span>
        </div>
        {sops.length > 3 && (
          <div className="course-toolbar__tools">
            <SearchBox label="Search client SOPs" placeholder="Search SOPs" value={search} onChange={setSearch} />
          </div>
        )}
      </div>
      <LoadState query={query} loadingText="Loading SOPs…">
        {!sops.length ? (
          <div className="board__empty">
            <span className="board__empty-icon tone-purple" aria-hidden="true">
              <Icon name="clipboard" size={18} />
            </span>
            <span className="text-strong">No SOPs from this client yet</span>
            <span className="text-small">When they share an SOP with you, it shows up here.</span>
          </div>
        ) : !shown.length ? (
          <p className="ast-empty-line">No SOPs match your search.</p>
        ) : (
          <ClientSopGrid
            sops={shown}
            openFile={openSharedSopFile}
            kicker={(s) => clientLabel(s.client).toUpperCase()}
            aside={clientId ? undefined : (s) => <span className="ast-chip">{clientLabel(s.client)}</span>}
          />
        )}
      </LoadState>
    </div>
  );
}
