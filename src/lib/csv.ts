/** Save rows as a CSV the browser downloads. Text that a spreadsheet would run as a formula is kept as text. */
export function downloadCsv(name: string, header: string[], rows: Array<Array<string | number>>) {
  const cell = (v: string | number) => {
    const s = typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv" })), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}
