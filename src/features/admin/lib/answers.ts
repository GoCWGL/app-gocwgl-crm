/** A stored form answer as text: checkboxes are Yes/No, empty is a dash. */
export function formatAnswer(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/** Custom field keys ("main_goal") as labels ("Main goal"). */
export const keyLabel = (key: string) => {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
