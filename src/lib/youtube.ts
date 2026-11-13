/** Same rule as the API: the 11-character ID of a YouTube watch, share, embed or Shorts link. */
const YOUTUBE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/;

export function youtubeId(url: string): string | null {
  return YOUTUBE.exec(url.trim())?.[1] ?? null;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
