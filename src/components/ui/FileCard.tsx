/* eslint-disable @next/next/no-img-element -- previews are local blob: URLs */
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

const IMAGE_EXT = /^(PNG|JPG|JPEG|GIF|WEBP|SVG)$/;

type FileCardProps = {
  name: string;
  meta: string;
  /** blob: URL for files uploaded in this session (enables preview + download). */
  url?: string;
  /** Extra content under the meta line (folder picker, "FROM CLIENT" badge…). */
  children?: ReactNode;
  onDelete: () => void;
};

export function FileCard({ name, meta, url, children, onDelete }: FileCardProps) {
  const ext = fileExtension(name);
  const showImage = !!url && IMAGE_EXT.test(ext);
  const tone = showImage ? undefined : (EXTENSION_TONES[ext] ?? "neutral");

  return (
    <article className="file-card">
      <div className={cn("file-card__thumb", toneClass(tone))}>
        {showImage ? <img src={url} alt={name} /> : <span className="file-card__ext">{ext}</span>}
      </div>
      <div className="file-card__body">
        <span className="file-card__name" title={name}>
          {name}
        </span>
        <span className="text-tiny">{meta}</span>
        {children}
        <div className="file-card__actions">
          {url && (
            <a className="mini-action" href={url} download={name}>
              Download
            </a>
          )}
          <button type="button" className="mini-action mini-action--danger" onClick={onDelete} aria-label={`Delete ${name}`}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
