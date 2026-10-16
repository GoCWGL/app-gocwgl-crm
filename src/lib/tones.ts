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

export function avatarTone(id: number): Tone {
  return AVATAR_TONES[Math.abs(id) % AVATAR_TONES.length];
}
