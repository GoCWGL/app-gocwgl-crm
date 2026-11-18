"use client";

import { useState, type ReactNode } from "react";
import { Icon, IconTile, type IconName } from "@/components/ui";
import { SopReader } from "@/features/va/sections/SopLibrarySection";
import type { Tone } from "@/lib/tones";
import { formatFileSize } from "@/lib/utils";
import type { ClientSopKind, ClientSopOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";

/** The parts of a client SOP both portals show (the client's has `vaIds`, the VA's has `client`). */
export type ClientSopBase = Omit<ClientSopOut, "vaIds">;

export const CLIENT_SOP_KINDS: Record<ClientSopKind, { label: string; icon: IconName; tone: Tone }> = {
  written: { label: "Write it", icon: "clipboard", tone: "purple" },
  file: { label: "Upload a file", icon: "folder", tone: "sky" },
  link: { label: "Add a link", icon: "link", tone: "green" },
};

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

/** One line under the title: how many steps, the file, or where the link goes. */
export function sopMeta(s: ClientSopBase): string {
  const what =
    s.kind === "written"
      ? `${s.steps.length} step${s.steps.length === 1 ? "" : "s"}${s.url ? " · video" : ""}`
      : s.kind === "file"
        ? `${s.fileName}${s.fileSize ? ` · ${formatFileSize(s.fileSize)}` : ""}`
        : host(s.url);
  return `${what} · updated ${formatShort(s.updatedAt)}`;
}

export const matchesSop = (s: ClientSopBase, q: string) =>
  !q || `${s.title} ${s.category} ${s.summary} ${s.steps.join(" ")} ${s.fileName}`.toLowerCase().includes(q.trim().toLowerCase());

/**
 * A grid of a client's SOPs. Opening one reads a written SOP here, opens a link in a new tab, or opens the uploaded
 * file (`openFile`, since files need the sign-in). `aside` and `actions` add the "shared with" line and edit buttons.
 */
export function ClientSopGrid<T extends ClientSopBase>({
  sops,
  openFile,
  aside,
  actions,
  kicker,
}: {
  sops: T[];
  openFile: (sop: T) => Promise<void>;
  aside?: (sop: T) => ReactNode;
  actions?: (sop: T) => ReactNode;
  /** Above the title in the reader ("YOUR SOP", the client's name). */
  kicker: (sop: T) => string;
}) {
  const [reading, setReading] = useState<T | null>(null);
  const [opening, setOpening] = useState("");
  const [failed, setFailed] = useState("");

  const open = async (s: T) => {
    setFailed("");
    if (s.kind === "written") return setReading(s);
    if (s.kind === "link") return void window.open(s.url, "_blank", "noopener,noreferrer");
    setOpening(s.id);
    try {
      await openFile(s);
    } catch {
      setFailed(s.id);
    } finally {
      setOpening("");
    }
  };

  return (
    <>
      <div className="va-sops">
        {sops.map((s) => {
          const k = CLIENT_SOP_KINDS[s.kind];
          return (
            <div key={s.id} className="va-sop csop">
              <button type="button" className="csop__open" onClick={() => open(s)} disabled={opening === s.id}>
                <IconTile tone={k.tone} size="md">
                  <Icon name={k.icon} size={16} />
                </IconTile>
                <span className="stack stack--4 u-grow u-minw0">
                  {s.category && <span className="kicker kicker--sm kicker--muted">{s.category.toUpperCase()}</span>}
                  <span className="text-strong">{s.title}</span>
                  {s.summary && <span className="text-small">{s.summary}</span>}
                  <span className="va-sop__meta u-truncate">{opening === s.id ? "Opening…" : sopMeta(s)}</span>
                  {failed === s.id && (
                    <span className="form-error" role="alert">
                      Couldn’t open the file. Please try again.
                    </span>
                  )}
                </span>
                <Icon name={s.kind === "written" ? "chevronRight" : s.kind === "link" ? "share" : "download"} size={15} />
              </button>
              {(aside || actions) && (
                <div className="csop__foot">
                  {aside?.(s)}
                  <span className="u-spacer" />
                  {actions?.(s)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reading && (
        <SopReader sop={{ ...reading, videoUrl: reading.url }} kicker={kicker(reading)} onClose={() => setReading(null)} />
      )}
    </>
  );
}
