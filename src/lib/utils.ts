/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Percentage of a / b as a rounded "42%" string (0% when b is 0). */
export function percent(a: number, b: number): string {
  return (b ? Math.round((a / b) * 100) : 0) + "%";
}

/** Up to two initials from a name: "Aisha Rahman" → "AR". */
export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Swap two items in a copy of an array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Turn rows into a downloadable CSV data URL. */
export function toCsvDataUrl(rows: Array<Array<string | number>>): string {
  const csv = rows
    .map((row) => row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","))
    .join("\n");
  return "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
}

export function toTextDataUrl(text: string): string {
  return "data:text/plain;charset=utf-8," + encodeURIComponent(text);
}

/** "file.name.PDF" → "PDF". */
export function fileExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toUpperCase() : "FILE";
}

/** 2400000 → "2.4 MB", 24576 → "24 KB". */
export function formatFileSize(bytes: number): string {
  return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isUrl(value: string): boolean {
  return /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value.trim());
}

/** Adds https:// to bare links ("instagram.com/me" → "https://instagram.com/me"). */
export function normalizeUrl(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t) || t.startsWith("@")) return t;
  return "https://" + t.replace(/^\/+/, "");
}

export function copyToClipboard(text: string): void {
  try {
    navigator.clipboard.writeText(text).catch(() => {
      // Permission denied; ignore.
    });
  } catch {
    // Clipboard is not available (insecure context); ignore.
  }
}

/** A random 14-character password with upper and lower case, digits and a symbol (no look-alike characters). */
export function generatePassword(length = 14): string {
  const sets = ["ABCDEFGHJKMNPQRSTUVWXYZ", "abcdefghjkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const out = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(all))];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}
