"use client";

import { Icon, type IconName } from "./Icon";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";

/**
 * A course's picture: its uploaded thumbnail (its own or the default; fetched signed in), else the first lesson's
 * YouTube poster, else an icon. Fills its box (the box sets the size and shape).
 */
export function TrainingCover({
  path,
  poster,
  icon = "graduation",
  iconSize = 28,
}: {
  /** API path of the uploaded thumbnail (with its version), or null when there isn't one. */
  path: string | null;
  /** Remote poster image to fall back on (e.g. YouTube). */
  poster?: string | null;
  icon?: IconName;
  iconSize?: number;
}) {
  const uploaded = useBlobUrl(path);
  const src = uploaded ?? (path ? null : poster);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- a signed-in blob: URL or a remote YouTube poster
    return <img src={src} alt="" loading="lazy" />;
  }
  return <Icon name={icon} size={iconSize} />;
}
