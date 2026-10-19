/**
 * Named color tones. The SCSS in styles/utilities/_tones.scss turns each one
 * into a `.tone-<name>` class, so components only ever pass a tone name.
 */
export type Tone =
  | "cyan"
  | "sky"
  | "teal"
  | "green"
  | "lime"
  | "amber"
  | "orange"
  | "brand"
  | "red"
  | "pink"
  | "purple"
  | "indigo"
  | "slate"
  | "neutral"
  | "ink";

export function toneClass(tone?: Tone): string {
  return tone ? `tone-${tone}` : "";
}

/** Rotating avatar colors, picked by id so a person keeps the same color. */
const AVATAR_TONES: Tone[] = ["cyan", "purple", "orange", "teal", "pink", "green"];

/** Works with UUID strings from the API (hashed) as well as numbers. */
export function avatarTone(id: number | string | null | undefined): Tone {
  let n = typeof id === "number" ? id : 0;
  if (typeof id === "string") for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(n) % AVATAR_TONES.length];
}
