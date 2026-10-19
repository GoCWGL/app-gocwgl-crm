// Writes src/utils/api/models.ts: one friendly alias per schema in the generated types.ts.
// Run through `pnpm gen:api` after the backend's OpenAPI spec changes.
import { readFileSync, writeFileSync } from "node:fs";

const types = readFileSync(new URL("../src/utils/api/types.ts", import.meta.url), "utf8");
const block = types.slice(types.indexOf("schemas: {"), types.indexOf("responses: never"));
const names = [...block.matchAll(/^ {8}(\w+): /gm)]
  .map((m) => m[1])
  .filter((n) => !n.startsWith("Body_") && n !== "ErrorResponse")
  .sort();

const lines = [
  "// Friendly names for the generated OpenAPI schemas (src/utils/api/types.ts).",
  "// Regenerate types.ts with `pnpm gen:api`; this file only re-exports them.",
  'import type { components } from "./types";',
  "",
  'type S = components["schemas"];',
  "",
  ...names.map((n) => `export type ${n} = S["${n}"];`),
  "",
  "export type User = UserOut;",
  "export type Contact = ContactOut;",
  "",
];
writeFileSync(new URL("../src/utils/api/models.ts", import.meta.url), lines.join("\n"));
console.log(`models.ts: ${names.length} schemas`);
