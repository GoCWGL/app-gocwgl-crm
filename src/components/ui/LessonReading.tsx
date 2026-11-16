"use client";

import { useState } from "react";
import type { LessonFileOut } from "@/utils/api/models";
import { download } from "@/utils/api/client";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { cn, fileExtension } from "@/lib/utils";
import { Icon } from "./Icon";

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * A reading lesson: its document (a PDF or image shows right here; Word, PowerPoint and the like download) and the
 * written text. `filePath` is where the signed-in document is fetched from (see `lessonFilePath`).
 */
export function LessonReading({
  title,
  body,
  file,
  filePath,
  className,
}: {
  title: string;
  body: string;
  file: LessonFileOut | null | undefined;
  filePath: string | null;
  className?: string;
}) {
  const shown = file?.inline ? filePath : null;
  const src = useBlobUrl(shown);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const isImage = !!file?.contentType.startsWith("image/");

  const save = async () => {
    if (!file || !filePath) return;
    setBusy(true);
    setFailed(false);
    try {
      await download(filePath, file.name);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const open = () => src && window.open(src, "_blank", "noopener");

  return (
    <div className={cn("lesson-reading", className)}>
      {file && file.inline && (
        <div className={cn("lesson-reading__doc", isImage && "is-image")}>
          {!src ? (
            <span className="lesson-reading__loading">
              <Icon name="form" size={20} /> Loading {file.name}…
            </span>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- a signed-in blob: URL
            <img src={src} alt={title} />
          ) : (
            <iframe src={src} title={title} />
          )}
        </div>
      )}
      {file && (
        <div className="lesson-reading__file">
          <span className="lesson-reading__ext">{fileExtension(file.name) || "FILE"}</span>
          <span className="stack stack--2 u-grow">
            <span className="u-strong lesson-reading__name" title={file.name}>
              {file.name}
            </span>
            <span className="text-tiny">
              {formatSize(file.size)}
              {failed && <span className="text-error"> · Couldn’t download it. Try again.</span>}
            </span>
          </span>
          {file.inline && src && !isImage && (
            <button type="button" className="mini-action" onClick={open}>
              Open full screen
            </button>
          )}
          <button type="button" className="mini-action" onClick={save} disabled={busy || !filePath}>
            <Icon name="download" size={12} /> {busy ? "Downloading…" : "Download"}
          </button>
        </div>
      )}
      {body && (
        <div className="lesson-reading__body">
          {body.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}
