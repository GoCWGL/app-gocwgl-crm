import type { ReactNode } from "react";
import { cn, fileExtension } from "@/lib/utils";
import { toneClass, type Tone } from "@/lib/tones";

/** Thumbnail color for each file type. */
const EXTENSION_TONES: Record<string, Tone> = {
  SVG: "green",
  PNG: "purple",
  JPG: "orange",
  JPEG: "orange",
  MP4: "pink",
  MOV: "pink",
  PDF: "red",
  DOC: "sky",
  DOCX: "sky",
  ZIP: "slate",
};

type FileCardProps = {
  name: string;
  meta: string;
  /** Extra content under the meta line (folder picker, "FROM CLIENT" badge…). */
  children?: ReactNode;
  /** Downloads need the access token, so the caller fetches the file (see utils/api/client download()). */
  onDownload?: () => void;
  /** Omit when this person can't delete the file. */
  onDelete?: () => void;
  busy?: boolean;
};

export function FileCard({ name, meta, children, onDownload, onDelete, busy }: FileCardProps) {
  const ext = fileExtension(name);
  const tone = EXTENSION_TONES[ext] ?? "neutral";

  return (
    <article className="file-card">
      <div className={cn("file-card__thumb", toneClass(tone))}>
        <span className="file-card__ext">{ext}</span>
      </div>
      <div className="file-card__body">
        <span className="file-card__name" title={name}>
          {name}
        </span>
        <span className="text-tiny">{meta}</span>
        {children}
        <div className="file-card__actions">
          {onDownload && (
            <button type="button" className="mini-action" onClick={onDownload} disabled={busy}>
              Download
            </button>
          )}
          {onDelete && (
            <button type="button" className="mini-action mini-action--danger" onClick={onDelete} disabled={busy} aria-label={`Delete ${name}`}>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
